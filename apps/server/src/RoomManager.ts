import { randomInt, randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import {
  ColorClashEngine,
  MonopolyEngine,
  TicTacToeEngine,
  Connect4Engine,
  ReversiEngine,
  PigEngine,
  DEFAULT_MONOPOLY_RULES,
  getGame,
  type GameType,
  type IGameEngine,
  type Player,
  type RoomInfo,
  type RoomStatus,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from '@games/game-logic';
import { CONFIG } from './config.js';
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>;
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
  engine: IGameEngine<any, any, any>;
  gameState: any;
  botLoopTimeout?: NodeJS.Timeout;
  turnSeconds: number;
  turnDeadline: number | null;
  turnActor?: string;
  turnTimeout?: NodeJS.Timeout;
  lastActivity: number;
  customRules?: any;
}
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AUCTION_BID_SECONDS = 15;
const engineFactories = {
  tictactoe: () => new TicTacToeEngine(),
  colorclash: () => new ColorClashEngine(),
  monopoly: () => new MonopolyEngine(),
  connect4: () => new Connect4Engine(),
  reversi: () => new ReversiEngine(),
  pig: () => new PigEngine(),
};
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
    const room: ActiveRoom = {
      code: this.generateRoomCode(),
      gameType,
      hostId: id,
      status: 'waiting',
      players: [{ id, name, isBot: false, connected: true, isHost: true, socketId }],
      minPlayers: definition.minPlayers,
      maxPlayers: definition.maxPlayers,
      engine: engineFactories[gameType](),
      gameState: null,
      turnSeconds: 90,
      turnDeadline: null,
      lastActivity: Date.now(),
      customRules:
        gameType === 'monopoly'
          ? { ...DEFAULT_MONOPOLY_RULES }
          : gameType === 'colorclash'
            ? { startingCards: 7 }
            : undefined,
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
        next[key] = value;
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
        next[key] = value;
      else return { success: false, error: 'Opción de regla no permitida.' };
    }
    room.turnSeconds = seconds;
    room.customRules = next;
    if (room.gameType === 'monopoly') (room.engine as MonopolyEngine).setRules(next);
    if (room.gameType === 'colorclash')
      (room.engine as ColorClashEngine).setStartingCards(next.startingCards);
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }
  startGame(code: string, id: string) {
    const room = this.hostRoom(code, id, 'waiting');
    if (room.players.length < room.minPlayers || room.players.some((p) => !p.connected))
      return { success: false, error: 'Faltan jugadores. Invita a alguien o añade un bot.' };
    room.gameState = room.engine.initGame(
      room.players.map(({ id, isBot, name }) => ({ id, isBot, name })),
    );
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
    room.gameState = null;
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
    if (!room.engine.validateAction(room.gameState, id, action))
      return { success: false, error: 'Ese movimiento no está permitido o no es tu turno.' };
    const previousActor = this.actor(room);
    room.gameState = room.engine.applyAction(room.gameState, id, action);
    // Several games can skip an opponent and give the same player a new turn.
    const kind = (action as { type: string }).type;
    const completed =
      room.gameType === 'colorclash'
        ? kind === 'PLAY_CARD' || kind === 'PASS_TURN' || !room.gameState.hasDrawnThisTurn
        : room.gameType === 'monopoly'
          ? kind === 'END_TURN' || kind === 'BID'
          : room.gameType === 'pig'
            ? kind === 'HOLD' || room.gameState.lastRoll === 1
            : true;
    this.armTurnClock(room, completed || previousActor !== this.actor(room));
    if (Array.isArray(room.gameState.logs)) room.gameState.logs = room.gameState.logs.slice(0, 80);
    if (!room.players.find((p) => p.id === id)?.isBot) room.lastActivity = Date.now();
    this.finishIfNeeded(room);
    this.broadcastRoomUpdate(room);
    this.broadcastGameState(room);
    this.checkAndTriggerBotTurn(room);
    return { success: true };
  }
  private finishIfNeeded(room: ActiveRoom) {
    const winnerId = room.engine.checkWinner(room.gameState),
      isDraw = room.gameState.isDraw === true;
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
      state: room.gameState ? room.engine.getSanitizedState(room.gameState, id) : null,
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
      () => this.removePlayer(room, player.id),
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
      room.gameState = room.engine.forfeitPlayer(room.gameState, id);
      this.finishIfNeeded(room);
      this.armTurnClock(room);
      this.broadcastGameState(room);
      this.checkAndTriggerBotTurn(room);
    }
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
  }
  private actor(room: ActiveRoom): string {
    if (room.gameType === 'monopoly' && room.gameState?.auction)
      return `auction:${room.gameState.auction.tileIndex}`;
    return room.gameState?.currentTurn || room.gameState?.currentTurnPlayerId;
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
    const duration = room.gameState?.auction ? AUCTION_BID_SECONDS : room.turnSeconds;
    room.turnDeadline = Date.now() + duration * 1000;
    const deadline = room.turnDeadline;
    room.turnTimeout = setTimeout(() => {
      if (room.status !== 'in_game' || room.turnDeadline !== deadline) return;
      // Complete a legal, conservative turn, including unresolved purchase decisions.
      // Clearing first prevents a stale deadline from acting on a later turn.
      this.clearTurnClock(room);
      if (room.gameType === 'monopoly' && room.gameState.auction) {
        room.gameState = (room.engine as MonopolyEngine).finishAuction(room.gameState);
        this.finishIfNeeded(room);
      } else {
        for (let i = 0; i < 100 && room.status === 'in_game' && this.actor(room) === actor; i++) {
          const s = room.gameState;
          let action: any;
          if (room.gameType === 'monopoly') {
            const p = s.players.find((p: any) => p.id === actor);
            action =
              p?.cash < 0
                ? room.engine.getBotAction(s, actor)
                : {
                    type:
                      s.turnPhase === 'roll'
                        ? 'ROLL_DICE'
                        : s.turnPhase === 'tile_action'
                          ? 'PASS_PROPERTY'
                          : 'END_TURN',
                  };
          } else if (room.gameType === 'colorclash')
            action = { type: s.hasDrawnThisTurn ? 'PASS_TURN' : 'DRAW_CARD' };
          else if (room.gameType === 'pig') action = { type: s.turnTotal > 0 ? 'HOLD' : 'ROLL' };
          else action = room.engine.getBotAction(s, actor);
          if (!action || !room.engine.validateAction(s, actor, action)) break;
          room.gameState = room.engine.applyAction(s, actor, action);
          this.finishIfNeeded(room);
          if (room.gameType === 'monopoly' && action.type === 'END_TURN') break;
          if (!['monopoly', 'colorclash', 'pig'].includes(room.gameType)) break;
        }
      }
      if (Array.isArray(room.gameState.logs))
        room.gameState.logs = room.gameState.logs.slice(0, 80);
      this.armTurnClock(room, true);
      this.broadcastRoomUpdate(room);
      this.broadcastGameState(room);
      this.checkAndTriggerBotTurn(room);
    }, duration * 1000);
  }
  private checkAndTriggerBotTurn(room: ActiveRoom) {
    clearTimeout(room.botLoopTimeout);
    room.botLoopTimeout = undefined;
    if (
      room.status !== 'in_game' ||
      !room.gameState ||
      !room.players.some((p) => !p.isBot && p.connected)
    )
      return;
    const state = room.gameState;
    const auctionBot =
      state.auction && room.gameType === 'monopoly'
        ? room.players.find(
            (player) =>
              player.isBot &&
              !state.auction.passedPlayerIds.includes(player.id) &&
              state.auction.highestBidderId !== player.id &&
              state.players.find(
                (participant: any) => participant.id === player.id && !participant.isBankrupt,
              ),
          )
        : undefined;
    const targetId = state.activeTrade?.toPlayerId;
    const target = room.players.find((p) => p.id === targetId && p.isBot);
    const current = room.players.find(
      (p) => p.id === (state.currentTurn || state.currentTurnPlayerId) && p.isBot,
    );
    const bot = state.auction ? auctionBot : target || current;
    if (!bot) return;
    room.botLoopTimeout = setTimeout(() => {
      room.botLoopTimeout = undefined;
      if (!this.rooms.has(room.code) || room.status !== 'in_game') return;
      try {
        const action = room.engine.getBotAction(room.gameState, bot.id);
        if (action) this.handleAction(room.code, bot.id, action);
      } catch {
        console.error('No se pudo completar un turno de bot.');
      }
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
    if (!room.gameState) return;
    for (const player of room.players)
      if (player.socketId) {
        const state = room.engine.getSanitizedState(room.gameState, player.id);
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
