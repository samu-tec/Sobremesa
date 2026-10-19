import { randomInt, randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import {
  DEFAULT_CIUDAD_FORTUNA_RULES,
  getGame,
  defaultGameSettings,
  validGameSetting,
  type GameType,
  type RoomRules,
  type Player,
  type RoomInfo,
  type RoomStatus,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
  type InterServerEvents,
} from 'sobremesa-logic';
import { CONFIG } from './config.js';
import { gameFactories } from './games/engines.js';
import type { GameMatch } from './games/match.js';
type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
interface RoomPlayer extends Player {
  socketId: string | null;
  disconnectTimeout?: NodeJS.Timeout;
}
interface ActiveRoom {
  code: string;
  gameType: GameType;
  hostId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  minPlayers: number;
  maxPlayers: number;
  match: GameMatch;
  configureRules(rules: RoomRules): void;
  botLoopTimeout?: NodeJS.Timeout;
  turnSeconds: number;
  turnDeadline: number | null;
  turnActor?: string;
  turnTimeout?: NodeJS.Timeout;
  lastActivity: number;
  customRules: RoomRules;
}
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  private rooms = new Map<string, ActiveRoom>();
  private socketToRoom = new Map<string, string>();
  private cleanupInterval: NodeJS.Timeout;
  constructor(private io: TypedServer) {
    this.cleanupInterval = setInterval(() => {
      for (const room of this.rooms.values())
        if (Date.now() - room.lastActivity > CONFIG.ROOM_MAX_IDLE_TIME_MS)
          this.destroyRoom(room.code, 'Sala cerrada tras 6 horas sin actividad.');
    }, CONFIG.CLEANUP_INTERVAL_MS);
    this.cleanupInterval.unref();
  }
  getRoomsCount() {
    return this.rooms.size;
  }
  generateRoomCode(): string {
    for (let attempts = 0; attempts < 1000; attempts++) {
      const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('No se pudo crear un código. Inténtalo otra vez.');
  }
  createRoom(name: string, id: string, socketId: string, gameType: GameType) {
    if (this.getRoomBySocket(socketId))
      return { success: false, error: 'Sal de la sala actual antes de crear otra.' };
    if (this.rooms.size >= CONFIG.MAX_ROOMS)
      return { success: false, error: 'El servidor está lleno. Inténtalo en unos minutos.' };
    // A session can occupy only one room, including disconnected reservations.
    if ([...this.rooms.values()].some((r) => r.players.some((p) => p.id === id)))
      return {
        success: false,
        error: 'Ya tienes una sala. Vuelve a conectarte a ella o espera a que caduque tu reserva.',
      };
    const definition = getGame(gameType);
    const runtime = gameFactories[gameType]();
    const room: ActiveRoom = {
      code: this.generateRoomCode(),
      gameType,
      hostId: id,
      status: 'waiting',
      players: [{ id, name, isBot: false, connected: true, isHost: true, socketId }],
      minPlayers: definition.minPlayers,
      maxPlayers: definition.maxPlayers,
      match: runtime.createMatch(),
      configureRules: runtime.configureRules,
      turnSeconds: 90,
      turnDeadline: null,
      lastActivity: Date.now(),
      customRules:
        gameType === 'monopoly'
          ? { ...DEFAULT_CIUDAD_FORTUNA_RULES }
          : gameType === 'colorclash'
            ? { startingCards: 7 }
            : defaultGameSettings(gameType),
    };
    this.rooms.set(room.code, room);
    this.socketToRoom.set(socketId, room.code);
    return { success: true, room: this.getRoomInfo(room) };
  }
  joinRoom(code: string, name: string, id: string, socketId: string) {
    const room = this.rooms.get(code);
    if (!room)
      return {
        success: false,
        error: 'No encontramos esa sala. Comprueba los seis caracteres del código.',
        errorCode: 'ROOM_UNAVAILABLE' as const,
      };
    const current = this.getRoomBySocket(socketId);
    if (current && current !== room)
      return { success: false, error: 'Sal de tu sala actual antes de unirte a otra.' };
    if (room.players.some((p) => p.id === id)) return this.reconnectPlayer(code, id, socketId);
    if ([...this.rooms.values()].some((r) => r.players.some((p) => p.id === id)))
      return { success: false, error: 'Ya tienes otra sala reservada. Vuelve a ella primero.' };
    if (room.status !== 'waiting')
      return {
        success: false,
        error: 'La partida ya ha empezado. Pide a tus amigos que te inviten a la siguiente.',
      };
    if (room.players.length >= room.maxPlayers)
      return { success: false, error: 'Esta sala está completa.' };
    room.players.push({ id, name, isBot: false, connected: true, isHost: false, socketId });
    this.socketToRoom.set(socketId, code);
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true, room: this.getRoomInfo(room) };
  }
  private hostRoom(code: string, id: string, status: RoomStatus): ActiveRoom {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== id) throw new Error('Solo el anfitrión puede hacerlo.');
    if (room.status !== status) throw new Error('Esta acción no está disponible en este momento.');
    return room;
  }
  addBot(code: string, id: string) {
    const room = this.hostRoom(code, id, 'waiting');
    if (room.players.length >= room.maxPlayers)
      return { success: false, error: 'La sala está completa.' };
    let n = 1;
    while (room.players.some((p) => p.name === `Bot ${n}`)) n++;
    room.players.push({
      id: `bot_${randomUUID()}`,
      name: `Bot ${n}`,
      isBot: true,
      connected: true,
      isHost: false,
      socketId: null,
    });
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }
  removeBot(code: string, id: string, botId: string) {
    const room = this.hostRoom(code, id, 'waiting');
    const index = room.players.findIndex((p) => p.id === botId && p.isBot);
    if (index < 0) return { success: false, error: 'No se encontró ese bot.' };
    room.players.splice(index, 1);
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }
  updateRoomRules(code: string, id: string, rules: unknown) {
    const room = this.hostRoom(code, id, 'waiting');
    if (!rules || typeof rules !== 'object' || Array.isArray(rules))
      return { success: false, error: 'Reglas no válidas.' };
    const next = { ...room.customRules };
    let seconds = room.turnSeconds;
    for (const [key, value] of Object.entries(rules)) {
      if (key === 'turnSeconds' && [30, 60, 90, 120, 180].includes(value as number))
        seconds = value as number;
      else if (
        room.gameType === 'colorclash' &&
        key === 'startingCards' &&
        [5, 7, 9].includes(value as number)
      )
        next.startingCards = value as number;
      else if (
        room.gameType === 'monopoly' &&
        ((key === 'startingCash' && [1000, 1500, 2000, 2500].includes(value as number)) ||
          (key === 'salaryGO' && [200, 300, 400].includes(value as number)) ||
          (key === 'maxRounds' && (value === null || [20, 40, 60].includes(value as number))) ||
          (key === 'jailFine' && [50, 100, 150].includes(value as number)) ||
          (key === 'maxJailTurns' && [1, 2, 3].includes(value as number)) ||
          ([
            'doubleGoSalary',
            'freeParkingPool',
            'auctionEnabled',
            'rentInJail',
            'evenBuilding',
          ].includes(key) &&
            typeof value === 'boolean'))
      )
        next[key] = value as number | boolean | null;
      else if (validGameSetting(room.gameType, key, value))
        next[key] = value as number | boolean | null;
      else return { success: false, error: 'Opción de regla no permitida.' };
    }
    room.configureRules(next);
    room.turnSeconds = seconds;
    room.customRules = next;
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }
  startGame(code: string, id: string) {
    const room = this.hostRoom(code, id, 'waiting');
    if (room.players.length < room.minPlayers || room.players.some((p) => !p.connected))
      return { success: false, error: 'Faltan jugadores. Invita a alguien o añade un bot.' };
    room.match.start(room.players.map(({ id, isBot, name }) => ({ id, isBot, name })));
    room.status = 'in_game';
    room.lastActivity = Date.now();
    this.armTurnClock(room, true);
    this.broadcastRoomUpdate(room);
    this.broadcastGameState(room, true);
    this.checkAndTriggerBotTurn(room);
    return { success: true };
  }
  restartGame(code: string, id: string) {
    const room = this.hostRoom(code, id, 'finished');
    clearTimeout(room.botLoopTimeout);
    room.botLoopTimeout = undefined;
    this.clearTurnClock(room);
    room.status = 'waiting';
    room.match.reset();
    room.lastActivity = Date.now();
    if (room.players.length > 1) room.players.push(room.players.shift()!);
    this.broadcastRoomUpdate(room);
    return { success: true };
  }
  handleAction(code: string, id: string, action: unknown) {
    const room = this.rooms.get(code);
    if (!room || room.status !== 'in_game' || !room.players.some((p) => p.id === id))
      return { success: false, error: 'La partida no está en curso.' };
    if (
      !action ||
      typeof action !== 'object' ||
      Array.isArray(action) ||
      typeof (action as { type?: unknown }).type !== 'string'
    )
      return { success: false, error: 'Acción no válida.' };
    const previousActor = this.actor(room);
    const result = room.match.act(id, action);
    if (!result)
      return { success: false, error: 'Ese movimiento no está permitido o no es tu turno.' };
    // The game policy decides whether a same-player action starts a new turn.
    this.armTurnClock(room, result.completed || previousActor !== this.actor(room));
    if (!room.players.find((p) => p.id === id)?.isBot) room.lastActivity = Date.now();
    this.finishIfNeeded(room);
    this.broadcastRoomUpdate(room);
    this.broadcastGameState(room);
    this.checkAndTriggerBotTurn(room);
    return { success: true };
  }
  private finishIfNeeded(room: ActiveRoom) {
    const { winnerId, isDraw } = room.match.result();
    if (!winnerId && !isDraw) return;
    room.status = 'finished';
    this.clearTurnClock(room);
    clearTimeout(room.botLoopTimeout);
    room.botLoopTimeout = undefined;
    this.io.to(room.code).emit('game:ended', {
      winnerId,
      winnerName: isDraw
        ? 'Empate'
        : room.players.find((p) => p.id === winnerId)?.name || 'Ganador',
      isDraw,
    });
    this.broadcastRoomUpdate(room);
  }
  reconnectPlayer(code: string, id: string, socketId: string) {
    const room = this.rooms.get(code),
      current = this.getRoomBySocket(socketId);
    if (!room || (current && current !== room))
      return {
        success: false,
        error: 'La sala ya no está disponible.',
        errorCode: 'ROOM_UNAVAILABLE' as const,
      };
    const player = room.players.find((p) => p.id === id && !p.isBot);
    if (!player)
      return {
        success: false,
        error: 'Esta sesión no pertenece a esa sala.',
        errorCode: 'NOT_A_MEMBER' as const,
      };
    if (player.socketId && player.socketId !== socketId) {
      const previous = this.io.sockets.sockets.get(player.socketId);
      this.socketToRoom.delete(player.socketId);
      previous?.leave(code);
      previous?.emit('session:replaced');
      previous?.disconnect(true);
    }
    clearTimeout(player.disconnectTimeout);
    player.disconnectTimeout = undefined;
    if (player.socketId) this.socketToRoom.delete(player.socketId);
    player.socketId = socketId;
    player.connected = true;
    this.socketToRoom.set(socketId, code);
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    this.checkAndTriggerBotTurn(room);
    return {
      success: true,
      room: this.getRoomInfo(room),
      state: room.match.publicState(id),
    };
  }
  handleDisconnect(socketId: string) {
    const room = this.getRoomBySocket(socketId);
    this.socketToRoom.delete(socketId);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    room.lastActivity = Date.now();
    clearTimeout(player.disconnectTimeout);
    player.disconnectTimeout = setTimeout(
      () => this.runAutomaticTask(room, 'reserva', () => this.removePlayer(room, player.id)),
      CONFIG.DISCONNECT_GRACE_PERIOD_MS,
    );
    this.broadcastRoomUpdate(room);
  }
  leaveRoom(socketId: string) {
    const room = this.getRoomBySocket(socketId);
    this.socketToRoom.delete(socketId);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) this.removePlayer(room, player.id);
  }
  private removePlayer(room: ActiveRoom, id: string) {
    if (!this.rooms.has(room.code)) return;
    const index = room.players.findIndex((p) => p.id === id);
    if (index < 0) return;
    const [player] = room.players.splice(index, 1);
    clearTimeout(player.disconnectTimeout);
    if (player.socketId) this.socketToRoom.delete(player.socketId);
    // Preserve other humans' disconnected reservations until their own grace expires.
    if (!room.players.some((p) => !p.isBot)) {
      this.destroyRoom(room.code, 'Todos los jugadores han salido.');
      return;
    }
    if (room.hostId === id)
      room.hostId = (room.players.find((p) => !p.isBot && p.connected) ||
        room.players.find((p) => !p.isBot))!.id;
    if (room.status === 'in_game') {
      clearTimeout(room.botLoopTimeout);
      room.botLoopTimeout = undefined;
      room.match.forfeit(id);
      this.finishIfNeeded(room);
      this.armTurnClock(room);
      this.broadcastGameState(room);
      this.checkAndTriggerBotTurn(room);
    }
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
  }
  private actor(room: ActiveRoom): string {
    return room.match.actor();
  }

  private clearTurnClock(room: ActiveRoom) {
    clearTimeout(room.turnTimeout);
    room.turnTimeout = undefined;
    room.turnDeadline = null;
    room.turnActor = undefined;
  }
  private armTurnClock(room: ActiveRoom, force = false) {
    if (room.status !== 'in_game') return;
    const actor = this.actor(room);
    if (!force && room.turnActor === actor && room.turnTimeout) return;
    this.clearTurnClock(room);
    room.turnActor = actor;
    const duration = room.match.timeoutSeconds() ?? room.turnSeconds;
    room.turnDeadline = Date.now() + duration * 1000;
    const deadline = room.turnDeadline;
    room.turnTimeout = setTimeout(
      () => this.runAutomaticTask(room, 'reloj', () => this.expireTurn(room, actor, deadline)),
      duration * 1000,
    );
  }
  private expireTurn(room: ActiveRoom, actor: string, deadline: number) {
    if (room.status !== 'in_game' || room.turnDeadline !== deadline) return;
    // Limpiar antes impide que un plazo antiguo actúe sobre el siguiente turno.
    this.clearTurnClock(room);
    if (room.match.expire()) {
      this.finishIfNeeded(room);
    } else {
      for (let i = 0; i < 100 && room.status === 'in_game' && this.actor(room) === actor; i++) {
        const step = room.match.timeoutStep(actor);
        if (!step) break;
        this.finishIfNeeded(room);
        if (!step.continue) break;
      }
    }
    this.armTurnClock(room, true);
    this.broadcastRoomUpdate(room);
    this.broadcastGameState(room);
    this.checkAndTriggerBotTurn(room);
  }
  private runAutomaticTask(room: ActiveRoom, operation: string, task: () => void) {
    if (this.rooms.get(room.code) !== room) return;
    try {
      task();
    } catch {
      // El motor podría haber mutado parcialmente el estado. No seguir ni publicarlo.
      // No registrar errores arbitrarios: pueden contener cartas o secretos.
      console.error('Fallo inesperado en una operación automática.', {
        gameType: room.gameType,
        operation,
      });
      this.destroyRoom(
        room.code,
        'La sala se ha cerrado por un error inesperado. Crea otra partida.',
      );
    }
  }

  private checkAndTriggerBotTurn(room: ActiveRoom) {
    clearTimeout(room.botLoopTimeout);
    room.botLoopTimeout = undefined;
    if (room.status !== 'in_game' || !room.players.some((p) => !p.isBot && p.connected)) return;
    const botId = room.match.botId(room.players);
    const bot = room.players.find((p) => p.id === botId);
    if (!bot) return;
    room.botLoopTimeout = setTimeout(() => {
      room.botLoopTimeout = undefined;
      this.runAutomaticTask(room, 'bot', () => {
        if (room.status !== 'in_game') return;
        const action = room.match.botAction(bot.id);
        if (action) this.handleAction(room.code, bot.id, action);
      });
    }, CONFIG.BOT_THINKING_TIME_MS);
  }

  private destroyRoom(code: string, reason: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    clearTimeout(room.botLoopTimeout);
    this.clearTurnClock(room);
    this.io.to(code).emit('room:closed', reason);
    for (const player of room.players) {
      clearTimeout(player.disconnectTimeout);
      if (player.socketId) {
        this.socketToRoom.delete(player.socketId);
        this.io.sockets.sockets.get(player.socketId)?.leave(code);
      }
    }
    this.rooms.delete(code);
  }
  broadcastGameState(room: ActiveRoom, isStart = false) {
    for (const player of room.players)
      if (player.socketId) {
        const state = room.match.publicState(player.id);
        if (!state) continue;
        if (isStart)
          this.io
            .to(player.socketId)
            .emit('game:started', { gameType: room.gameType, publicState: state });
        else this.io.to(player.socketId).emit('game:state_update', state);
      }
  }
  broadcastRoomUpdate(room: ActiveRoom) {
    this.io.to(room.code).emit('room:updated', this.getRoomInfo(room));
  }
  getRoomInfo(room: ActiveRoom): RoomInfo {
    return {
      code: room.code,
      gameType: room.gameType,
      hostId: room.hostId,
      status: room.status,
      minPlayers: room.minPlayers,
      maxPlayers: room.maxPlayers,
      players: room.players.map(({ id, name, isBot, connected }) => ({
        id,
        name,
        isBot,
        connected,
        isHost: id === room.hostId,
      })),
      customRules: room.customRules,
      turnSeconds: room.turnSeconds,
      turnDeadline: room.turnDeadline,
      serverNow: Date.now(),
      reconnectGraceMs: CONFIG.DISCONNECT_GRACE_PERIOD_MS,
    };
  }
  getRoomBySocket(socketId: string) {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }
  dispose() {
    clearInterval(this.cleanupInterval);
    for (const code of this.rooms.keys())
      this.destroyRoom(code, 'El servidor se está reiniciando.');
  }
}
