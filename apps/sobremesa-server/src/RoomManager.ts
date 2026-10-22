import { randomInt, randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import {
  DEFAULT_CIUDAD_FORTUNA_RULES,
  message,
  GAME_CATALOG,
  type GameSnapshot,
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
import type { GameMatch } from './games/runtime.js';
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
interface AutoPlayEntry {
  mode: 'manual' | 'disconnect' | 'timeout';
  startedAt: number;
  deadline: number | null;
  awaitingHost: boolean;
  permanent: boolean;
  timeout?: NodeJS.Timeout;
}
interface ActiveRoom {
  matchId: string;
  rulesByGame: Partial<Record<GameType, { rules: RoomRules; turnSeconds: number }>>;
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
  autoPlay: Map<string, AutoPlayEntry>;
  lastActivity: number;
  customRules: RoomRules;
}
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AUTO_PLAY_HOST_REVIEW_MS = 3 * 60_000;

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
      matchId: randomUUID(),
      rulesByGame: {},
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
      autoPlay: new Map(),
      lastActivity: Date.now(),
      customRules:
        gameType === 'monopoly'
          ? { ...DEFAULT_CIUDAD_FORTUNA_RULES }
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
    if (
      getGame(room.gameType).supportsBots === false ||
      (room.gameType === 'impostor' && room.customRules?.impostorMode === 1)
    )
      return { success: false, error: 'Este juego requiere participantes humanos.' };
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
  removeHuman(code: string, hostId: string, playerId: string) {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== hostId)
      return { success: false, error: 'Solo el anfitrión puede hacerlo.' };
    const player = room.players.find((p) => p.id === playerId && !p.isBot);
    if (!player || playerId === hostId)
      return { success: false, error: 'No puedes retirar a ese participante.' };
    const autoPlay = room.autoPlay.get(playerId);
    if (
      room.status === 'in_game' &&
      (player.connected || (!autoPlay?.awaitingHost && !autoPlay?.permanent))
    )
      return {
        success: false,
        error: 'Solo puedes retirar a un jugador cuando su autoplay esté pendiente de revisión.',
      };
    if (room.status === 'in_game') return this.resolveAutoPlay(code, hostId, playerId, 'remove');
    return this.runMatchOperation(room, 'retirada', () => {
      if (player.socketId) {
        const socket = this.io.sockets.sockets.get(player.socketId);
        socket?.leave(code);
        if (socket?.data) socket.data.roomCode = undefined;
        socket?.emit('room:removed', 'El anfitrión te ha retirado de la sala.');
      }
      this.removePlayer(room, playerId);
      return { success: true };
    });
  }
  updatePlayerName(code: string, id: string, name: string) {
    const room = this.rooms.get(code);
    const player = room?.players.find((p) => p.id === id && !p.isBot);
    if (!room || !player) return { success: false, error: 'No estás en esta sala.' };
    player.name = name;
    this.broadcastRoomUpdate(room);
    return { success: true };
  }
  resolveAutoPlay(code: string, hostId: string, playerId: string, decision: 'keep' | 'remove') {
    const room = this.rooms.get(code);
    const entry = room?.autoPlay.get(playerId);
    if (!room || room.hostId !== hostId || room.status !== 'in_game')
      return { success: false, error: 'Solo el anfitrión puede gestionar esta partida.' };
    if (!entry?.awaitingHost && !(decision === 'remove' && entry?.permanent))
      return { success: false, error: 'La decisión de este jugador ya no está pendiente.' };
    if (decision === 'remove') {
      return this.runMatchOperation(room, 'retirada por autoplay', () => {
        this.clearAutoPlay(room, playerId);
        this.removeInactivePlayer(room, playerId);
        return { success: true };
      });
    }
    clearTimeout(entry.timeout);
    entry.timeout = undefined;
    entry.permanent = true;
    entry.deadline = null;
    entry.awaitingHost = false;
    room.lastActivity = Date.now();
    if (this.actor(room) === playerId) this.armTurnClock(room, true);
    this.broadcastRoomUpdate(room);
    this.checkAndTriggerBotTurn(room);
    return { success: true };
  }
  setAutoPlay(code: string, playerId: string, enabled: boolean) {
    const room = this.rooms.get(code);
    const player = room?.players.find((candidate) => candidate.id === playerId && !candidate.isBot);
    if (!room || room.status !== 'in_game' || !player || !player.connected)
      return { success: false, error: 'Solo un jugador conectado puede cambiar su autoplay.' };
    const existing = room.autoPlay.get(playerId);
    if (enabled) {
      if (existing?.mode === 'disconnect')
        return { success: false, error: 'El autoplay por desconexión no se puede cambiar.' };
      if (existing) return { success: true };
      const startedAt = Date.now();
      const entry: AutoPlayEntry = {
        mode: 'manual',
        startedAt,
        deadline: startedAt + AUTO_PLAY_HOST_REVIEW_MS,
        awaitingHost: false,
        permanent: false,
      };
      room.autoPlay.set(playerId, entry);
      this.scheduleAutoPlayReview(room, playerId, entry);
      room.lastActivity = startedAt;
      this.broadcastRoomUpdate(room);
      this.checkAndTriggerBotTurn(room);
      return { success: true };
    }
    if (!existing || existing.mode === 'disconnect')
      return { success: false, error: 'No hay un autoplay que puedas desactivar.' };
    this.clearAutoPlay(room, playerId);
    if (this.actor(room) === playerId) {
      clearTimeout(room.botLoopTimeout);
      room.botLoopTimeout = undefined;
      this.armTurnClock(room, true);
    }
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }
  changeGame(code: string, id: string, gameType: GameType) {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== id)
      return { success: false, error: 'Solo el anfitrión puede hacerlo.' };
    if (room.status === 'in_game')
      return { success: false, error: 'Termina la partida antes de cambiar de juego.' };
    const definition = GAME_CATALOG.find((g) => g.id === gameType);
    if (!definition) return { success: false, error: 'Juego no válido.' };
    if (gameType === room.gameType) return { success: true };
    return this.runMatchOperation(room, 'cambio de juego', () => {
      const runtime = gameFactories[gameType]();
      const settings = {
        ...(room.rulesByGame[gameType]?.rules ??
          (gameType === 'monopoly' ? DEFAULT_CIUDAD_FORTUNA_RULES : defaultGameSettings(gameType))),
      };
      runtime.configureRules(settings);
      const match = runtime.createMatch();
      this.clearTurnClock(room);
      clearTimeout(room.botLoopTimeout);
      room.botLoopTimeout = undefined;
      room.rulesByGame[room.gameType] = {
        rules: { ...room.customRules },
        turnSeconds: room.turnSeconds,
      };
      room.turnSeconds = room.rulesByGame[gameType]?.turnSeconds ?? 90;
      room.gameType = gameType;
      room.minPlayers = definition.minPlayers;
      room.maxPlayers = definition.maxPlayers;
      room.match = match;
      room.configureRules = runtime.configureRules;
      room.customRules = settings;
      room.matchId = randomUUID();
      room.status = 'waiting';
      room.lastActivity = Date.now();
      this.broadcastRoomUpdate(room);
      return { success: true };
    });
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
        room.gameType === 'monopoly' &&
        ((key === 'startingCash' && [1000, 1500, 2000, 2500].includes(value as number)) ||
          (key === 'salaryGO' && [200, 300, 400].includes(value as number)) ||
          (key === 'maxRounds' && (value === null || [20, 40, 60].includes(value as number))) ||
          (key === 'jailFine' && [50, 100, 150].includes(value as number)) ||
          (key === 'maxJailTurns' && [1, 2, 3].includes(value as number)) ||
          ([
            'doubleGoSalary',
            'doubleGoSalaryOnPass',
            'snakeEyesBonus',
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
    return this.runMatchOperation(room, 'configuración', () => {
      room.configureRules(next);
      room.turnSeconds = seconds;
      room.customRules = next;
      room.lastActivity = Date.now();
      this.broadcastRoomUpdate(room);
      return { success: true };
    });
  }
  startGame(code: string, id: string) {
    const room = this.hostRoom(code, id, 'waiting');
    if (
      room.players.length < room.minPlayers ||
      room.players.length > room.maxPlayers ||
      room.players.some((p) => !p.connected)
    )
      return { success: false, error: 'Faltan jugadores. Invita a alguien o añade un bot.' };
    if (
      (getGame(room.gameType).supportsBots === false ||
        (room.gameType === 'impostor' && room.customRules?.impostorMode === 1)) &&
      room.players.some((p) => p.isBot)
    )
      return { success: false, error: 'Este juego requiere participantes humanos.' };
    const counts = getGame(room.gameType).playerCounts;
    if (counts && !counts.includes(room.players.length))
      return {
        success: false,
        error: 'Esta cantidad de participantes no es válida para este juego.',
      };
    return this.runMatchOperation(room, 'inicio', () => {
      room.match.start(
        room.players.map(({ id, isBot, name }) => ({
          id,
          isBot,
          name,
          isHost: id === room.hostId,
        })),
      );
      room.matchId = randomUUID();
      room.status = 'in_game';
      room.lastActivity = Date.now();
      this.armTurnClock(room, true);
      this.broadcastRoomUpdate(room);
      this.broadcastGameState(room, true);
      this.checkAndTriggerBotTurn(room);
      return { success: true };
    });
  }
  restartGame(code: string, id: string) {
    const room = this.hostRoom(code, id, 'finished');
    return this.runMatchOperation(room, 'reinicio', () => {
      clearTimeout(room.botLoopTimeout);
      room.botLoopTimeout = undefined;
      this.clearTurnClock(room);
      room.status = 'waiting';
      room.matchId = randomUUID();
      room.match.reset();
      room.lastActivity = Date.now();
      if (room.players.length > 1) room.players.push(room.players.shift()!);
      this.broadcastRoomUpdate(room);
      return { success: true };
    });
  }
  handleAction(code: string, id: string, action: unknown) {
    return this.applyAction(code, id, action);
  }
  private applyAction(code: string, id: string, action: unknown) {
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
    try {
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
    } catch {
      this.closeFailedRoom(room, 'acción');
      return {
        success: false,
        error: 'No se pudo completar la acción. Comprueba el estado de la sala.',
      };
    }
  }
  private finishIfNeeded(room: ActiveRoom) {
    const { winnerId, isDraw } = room.match.result();
    if (!winnerId && !isDraw) return;
    room.status = 'finished';
    this.clearTurnClock(room);
    for (const id of room.autoPlay.keys()) this.clearAutoPlay(room, id);
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
    this.clearAutoPlay(room, id);
    if (!room.players.some((candidate) => candidate.id === room.hostId && candidate.connected))
      room.hostId = id;
    this.socketToRoom.set(socketId, code);
    room.lastActivity = Date.now();
    return this.runMatchOperation(room, 'reconexión', () => {
      if (!room.turnTimeout) this.armTurnClock(room);
      this.broadcastRoomUpdate(room);
      this.checkAndTriggerBotTurn(room);
      return {
        success: true,
        room: this.getRoomInfo(room),
        state: this.snapshot(room, id),
      };
    });
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
    if (room.status === 'in_game' && !player.isBot) {
      this.startAutoPlay(room, player.id, 'disconnect');
      if (room.hostId === player.id) {
        const nextHost = room.players.find((candidate) => !candidate.isBot && candidate.connected);
        if (nextHost) room.hostId = nextHost.id;
      }
    } else {
      player.disconnectTimeout = setTimeout(
        () => this.runAutomaticTask(room, 'reserva', () => this.removePlayer(room, player.id)),
        CONFIG.DISCONNECT_GRACE_PERIOD_MS,
      );
    }
    this.broadcastRoomUpdate(room);
  }
  leaveRoom(socketId: string) {
    const room = this.getRoomBySocket(socketId);
    this.socketToRoom.delete(socketId);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) this.runMatchOperation(room, 'abandono', () => this.removePlayer(room, player.id));
  }
  private removePlayer(room: ActiveRoom, id: string) {
    if (!this.rooms.has(room.code)) return;
    const index = room.players.findIndex((p) => p.id === id);
    if (index < 0) return;
    const [player] = room.players.splice(index, 1);
    this.clearAutoPlay(room, id);
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
      room.match.forfeit(id, room.hostId);
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
    if (room.autoPlay.get(actor)?.awaitingHost && room.match.requiresPlayerAction()) return;
    const duration = room.match.timeoutSeconds() ?? room.turnSeconds;
    room.turnDeadline = Date.now() + duration * 1000;
    const deadline = room.turnDeadline;
    room.turnTimeout = setTimeout(
      () => this.runAutomaticTask(room, 'reloj', () => this.expireTurn(room, actor, deadline)),
      duration * 1000,
    );
  }
  private clearAutoPlay(room: ActiveRoom, id: string) {
    const entry = room.autoPlay.get(id);
    if (!entry) return;
    clearTimeout(entry.timeout);
    room.autoPlay.delete(id);
  }
  private scheduleAutoPlayReview(room: ActiveRoom, id: string, entry: AutoPlayEntry) {
    clearTimeout(entry.timeout);
    entry.timeout = setTimeout(
      () =>
        this.runAutomaticTask(room, 'autoplay', () => {
          if (room.autoPlay.get(id) !== entry) return;
          entry.awaitingHost = true;
          entry.timeout = undefined;
          if (this.actor(room) === id && room.match.requiresPlayerAction()) {
            this.clearTurnClock(room);
            room.turnActor = id;
          }
          this.broadcastRoomUpdate(room);
        }),
      Math.max(0, (entry.deadline ?? Date.now()) - Date.now()),
    );
    entry.timeout.unref();
  }
  private startAutoPlay(room: ActiveRoom, id: string, mode: 'disconnect' | 'timeout') {
    if (room.status !== 'in_game' || room.players.find((p) => p.id === id)?.isBot) return;
    const current = room.autoPlay.get(id);
    if (current?.mode === 'disconnect') return;
    const startedAt = Date.now();
    const entry: AutoPlayEntry = current ?? {
      mode,
      startedAt,
      deadline: startedAt + AUTO_PLAY_HOST_REVIEW_MS,
      awaitingHost: false,
      permanent: false,
    };
    entry.mode = mode;
    entry.startedAt = startedAt;
    entry.deadline = startedAt + AUTO_PLAY_HOST_REVIEW_MS;
    entry.awaitingHost = false;
    entry.permanent = false;
    room.autoPlay.set(id, entry);
    this.scheduleAutoPlayReview(room, id, entry);
    this.broadcastRoomUpdate(room);
    if (this.actor(room) === id && room.match.requiresPlayerAction()) {
      clearTimeout(room.turnTimeout);
      room.turnTimeout = undefined;
      room.turnDeadline = null;
      room.turnActor = id;
      this.runAutoPlayAction(room, id);
    } else this.checkAndTriggerBotTurn(room);
  }
  private runAutoPlayAction(room: ActiveRoom, id: string) {
    const entry = room.autoPlay.get(id);
    if (
      room.status !== 'in_game' ||
      !entry ||
      entry.awaitingHost ||
      this.actor(room) !== id ||
      !room.match.requiresPlayerAction()
    )
      return;
    const action = room.match.botAction(id);
    if (action) {
      const result = this.applyAction(room.code, id, action);
      if (result.success) return;
    }
    this.clearTurnClock(room);
    if (room.match.expire()) this.finishIfNeeded(room);
    else {
      for (let i = 0; i < 100 && room.status === 'in_game' && this.actor(room) === id; i++) {
        const step = room.match.timeoutStep(id);
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
  private removeInactivePlayer(room: ActiveRoom, id: string) {
    const player = room.players.find((p) => p.id === id);
    if (!player) return;
    if (player.socketId) {
      const socket = this.io.sockets.sockets.get(player.socketId);
      socket?.leave(room.code);
      if (socket?.data) socket.data.roomCode = undefined;
      socket?.emit('room:removed', 'Has salido de la partida por inactividad.');
    }
    this.clearTurnClock(room);
    this.io.to(room.code).emit('game:notification', {
      text: message('{0} ha salido por inactividad.', player.name),
      type: 'info',
    });
    this.removePlayer(room, id);
  }
  private expireTurn(room: ActiveRoom, actor: string, deadline: number) {
    if (room.status !== 'in_game' || room.turnDeadline !== deadline || this.actor(room) !== actor)
      return;
    const player = room.players.find((p) => p.id === actor);
    // Rule deadlines (auctions, timed questions, claims and drawing) keep their own resolution.
    if (player && !player.isBot && room.match.requiresPlayerAction()) {
      const entry = room.autoPlay.get(actor);
      if (entry?.awaitingHost) {
        room.turnDeadline = null;
        room.turnTimeout = undefined;
        this.broadcastRoomUpdate(room);
        return;
      }
      if (entry) {
        this.runAutoPlayAction(room, actor);
        return;
      }
      this.startAutoPlay(room, actor, 'timeout');
      return;
    }
    this.clearTurnClock(room);
    if (room.match.expire()) this.finishIfNeeded(room);
    else {
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
  private runMatchOperation<T>(room: ActiveRoom, operation: string, task: () => T) {
    try {
      return task();
    } catch {
      this.closeFailedRoom(room, operation);
      return {
        success: false as const,
        error: 'No se pudo completar la acción. Comprueba el estado de la sala.',
      };
    }
  }

  private runAutomaticTask(room: ActiveRoom, operation: string, task: () => void) {
    if (this.rooms.get(room.code) !== room) return;
    try {
      task();
    } catch {
      this.closeFailedRoom(room, operation);
    }
  }

  private closeFailedRoom(room: ActiveRoom, operation: string) {
    // El motor podría haber mutado parcialmente el estado. No seguir ni publicarlo.
    // No registrar errores arbitrarios: pueden contener cartas o secretos.
    console.error('Fallo inesperado en una operación de partida.', {
      gameType: room.gameType,
      operation,
    });
    this.destroyRoom(
      room.code,
      'La sala se ha cerrado por un error inesperado. Crea otra partida.',
    );
  }

  private checkAndTriggerBotTurn(room: ActiveRoom) {
    clearTimeout(room.botLoopTimeout);
    room.botLoopTimeout = undefined;
    if (room.status !== 'in_game') return;
    const actor = this.actor(room);
    const auto = room.autoPlay.get(actor);
    if (auto?.awaitingHost || (auto && !room.match.requiresPlayerAction())) return;
    const botId = room.match.botId(room.players) || (auto ? actor : undefined);
    const bot = room.players.find((p) => p.id === botId);
    if (!bot) return;
    room.botLoopTimeout = setTimeout(() => {
      room.botLoopTimeout = undefined;
      this.runAutomaticTask(room, 'bot', () => {
        if (room.status !== 'in_game') return;
        if (room.autoPlay.has(bot.id)) this.runAutoPlayAction(room, bot.id);
        else {
          const action = room.match.botAction(bot.id);
          if (action) this.applyAction(room.code, bot.id, action);
        }
      });
    }, CONFIG.BOT_THINKING_TIME_MS);
  }

  private destroyRoom(code: string, reason: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    clearTimeout(room.botLoopTimeout);
    for (const entry of room.autoPlay.values()) clearTimeout(entry.timeout);
    room.autoPlay.clear();
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
  private snapshot(room: ActiveRoom, playerId: string): GameSnapshot | null {
    const state = room.match.publicState(playerId);
    return state ? { ...state, matchId: room.matchId, gameType: room.gameType } : null;
  }
  broadcastGameState(room: ActiveRoom, isStart = false) {
    for (const player of room.players)
      if (player.socketId) {
        const state = this.snapshot(room, player.id);
        if (!state) continue;
        if (isStart)
          this.io.to(player.socketId).emit('game:started', {
            gameType: room.gameType,
            matchId: room.matchId,
            publicState: state,
          });
        else this.io.to(player.socketId).emit('game:state_update', state);
      }
  }
  broadcastRoomUpdate(room: ActiveRoom) {
    this.io.to(room.code).emit('room:updated', this.getRoomInfo(room));
  }
  getRoomInfo(room: ActiveRoom): RoomInfo {
    return {
      matchId: room.matchId,
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
      autoPlay: [...room.autoPlay].map(([playerId, entry]) => ({
        playerId,
        mode: entry.mode,
        startedAt: entry.startedAt,
        deadline: entry.deadline,
        awaitingHost: entry.awaitingHost,
        permanent: entry.permanent,
      })),
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
