import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ColorClashEngine,
  DEFAULT_MONOPOLY_RULES,
  GameLifecycleHooks,
  GameType,
  IGameEngine,
  MonopolyEngine,
  Player,
  RoomInfo,
  RoomStatus,
  ServerToClientEvents,
  SocketData,
  TicTacToeEngine,
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
  maxPlayers: number;
  minPlayers: number;
  engine: IGameEngine<any, any, any>;
  gameState: any;
  botLoopTimeout?: NodeJS.Timeout;
  createdAt: number;
  lastActivity: number;
  gameStartTime?: number;
  customRules?: any;
}

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0, O, 1, I to avoid visual confusion
const BOT_NAMES = ['CyberBot', 'PixelAI', 'RoboGamer', 'AlphaZero', 'NeonBot', 'QuantumByte'];

export class RoomManager {
  private rooms: Map<string, ActiveRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map(); // socketId -> roomCode
  private cleanupInterval: NodeJS.Timeout;

  constructor(private io: TypedServer, private lifecycleHooks?: GameLifecycleHooks) {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms();
    }, CONFIG.CLEANUP_INTERVAL_MS);
  }

  public getRoomsCount(): number {
    return this.rooms.size;
  }

  public generateRoomCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        const randIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
        code += ROOM_CODE_ALPHABET[randIndex];
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 1000);
    return code;
  }

  private createEngine(gameType: GameType, customRules?: any): { engine: IGameEngine<any, any, any>; minPlayers: number; maxPlayers: number } {
    if (gameType === 'tictactoe') {
      return { engine: new TicTacToeEngine(), minPlayers: 2, maxPlayers: 2 };
    } else if (gameType === 'colorclash') {
      return { engine: new ColorClashEngine(), minPlayers: 2, maxPlayers: 4 };
    } else if (gameType === 'monopoly') {
      return { engine: new MonopolyEngine(customRules || DEFAULT_MONOPOLY_RULES), minPlayers: 2, maxPlayers: 6 };
    }
    throw new Error(`Unsupported game type: ${gameType}`);
  }

  public createRoom(
    playerName: string,
    playerId: string,
    socketId: string,
    gameType: GameType
  ): { success: boolean; room?: RoomInfo; error?: string } {
    const code = this.generateRoomCode();
    const initialRules = gameType === 'monopoly' ? { ...DEFAULT_MONOPOLY_RULES } : undefined;
    const { engine, minPlayers, maxPlayers } = this.createEngine(gameType, initialRules);

    const hostPlayer: RoomPlayer = {
      id: playerId,
      name: playerName.trim() || 'Jugador 1',
      isBot: false,
      connected: true,
      isHost: true,
      socketId,
    };

    const room: ActiveRoom = {
      code,
      gameType,
      hostId: playerId,
      status: 'waiting',
      players: [hostPlayer],
      minPlayers,
      maxPlayers,
      engine,
      gameState: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      customRules: initialRules,
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);

    return { success: true, room: this.getRoomInfo(room) };
  }

  public joinRoom(
    roomCode: string,
    playerName: string,
    playerId: string,
    socketId: string
  ): { success: boolean; room?: RoomInfo; error?: string } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Sala no encontrada. Comprueba el código.' };
    }

    // Check if player is reconnecting
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      if (existingPlayer.disconnectTimeout) {
        clearTimeout(existingPlayer.disconnectTimeout);
        existingPlayer.disconnectTimeout = undefined;
      }
      existingPlayer.connected = true;
      existingPlayer.socketId = socketId;
      existingPlayer.name = playerName.trim() || existingPlayer.name;
      this.socketToRoom.set(socketId, code);
      room.lastActivity = Date.now();

      this.broadcastRoomUpdate(room);
      return { success: true, room: this.getRoomInfo(room) };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'La partida ya ha comenzado.' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'La sala está completa.' };
    }

    const newPlayer: RoomPlayer = {
      id: playerId,
      name: playerName.trim() || `Jugador ${room.players.length + 1}`,
      isBot: false,
      connected: true,
      isHost: false,
      socketId,
    };

    room.players.push(newPlayer);
    this.socketToRoom.set(socketId, code);
    room.lastActivity = Date.now();

    this.broadcastRoomUpdate(room);
    return { success: true, room: this.getRoomInfo(room) };
  }

  public addBot(roomCode: string, requesterId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada.' };
    if (room.hostId !== requesterId) return { success: false, error: 'Solo el anfitrión puede añadir bots.' };
    if (room.status !== 'waiting') return { success: false, error: 'No se pueden añadir bots durante la partida.' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'La sala está llena.' };

    const botNumber = room.players.filter(p => p.isBot).length + 1;
    const botName = BOT_NAMES[(botNumber - 1) % BOT_NAMES.length];
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    room.players.push({
      id: botId,
      name: `${botName} (Bot)`,
      isBot: true,
      connected: true,
      isHost: false,
      socketId: null,
    });

    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }

  public removeBot(roomCode: string, requesterId: string, botId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada.' };
    if (room.hostId !== requesterId) return { success: false, error: 'Solo el anfitrión puede eliminar bots.' };
    if (room.status !== 'waiting') return { success: false, error: 'No se pueden quitar bots durante la partida.' };

    const botIndex = room.players.findIndex(p => p.id === botId && p.isBot);
    if (botIndex === -1) return { success: false, error: 'Bot no encontrado.' };

    room.players.splice(botIndex, 1);
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }

  public updateRoomRules(
    roomCode: string,
    requesterId: string,
    rules: any
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada.' };
    if (room.hostId !== requesterId) return { success: false, error: 'Solo el anfitrión puede modificar las reglas.' };
    if (room.status !== 'waiting') return { success: false, error: 'No se pueden modificar reglas con la partida en curso.' };

    room.customRules = { ...room.customRules, ...rules };
    if (room.engine instanceof MonopolyEngine) {
      room.engine.setRules(room.customRules);
    }
    room.lastActivity = Date.now();
    this.broadcastRoomUpdate(room);
    return { success: true };
  }

  public startGame(roomCode: string, requesterId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada.' };
    if (room.hostId !== requesterId) return { success: false, error: 'Solo el anfitrión puede iniciar la partida.' };
    if (room.players.length < room.minPlayers) {
      return { success: false, error: `Se necesitan al menos ${room.minPlayers} jugadores para empezar.` };
    }

    try {
      const enginePlayers = room.players.map(p => ({ id: p.id, isBot: p.isBot }));
      room.gameState = room.engine.initGame(enginePlayers);
      room.status = 'in_game';
      room.lastActivity = Date.now();
      room.gameStartTime = Date.now();

      // Lifecycle hook for ads / monetization
      if (this.lifecycleHooks?.onGameStart) {
        this.lifecycleHooks.onGameStart({
          roomCode: room.code,
          gameType: room.gameType,
          playerIds: room.players.map(p => p.id),
        });
      }

      this.broadcastRoomUpdate(room);
      this.broadcastGameState(room, true);

      // Check if first turn belongs to a bot
      this.checkAndTriggerBotTurn(room);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al iniciar la partida' };
    }
  }

  public restartGame(roomCode: string, requesterId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada.' };
    if (room.hostId !== requesterId) return { success: false, error: 'Solo el anfitrión puede reiniciar.' };

    if (room.botLoopTimeout) {
      clearTimeout(room.botLoopTimeout);
      room.botLoopTimeout = undefined;
    }

    room.status = 'waiting';
    room.gameState = null;
    room.lastActivity = Date.now();

    this.broadcastRoomUpdate(room);
    return { success: true };
  }

  public handleAction(
    roomCode: string,
    playerId: string,
    action: any
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'in_game') {
      return { success: false, error: 'La partida no está en curso.' };
    }

    if (!room.engine.validateAction(room.gameState, playerId, action)) {
      return { success: false, error: 'Acción no permitida o no es tu turno.' };
    }

    room.gameState = room.engine.applyAction(room.gameState, playerId, action);
    room.lastActivity = Date.now();

    const winnerId = room.engine.checkWinner(room.gameState);
    const isDraw = (room.gameState as any).isDraw === true;

    if (winnerId || isDraw) {
      room.status = 'finished';
      if (room.botLoopTimeout) {
        clearTimeout(room.botLoopTimeout);
        room.botLoopTimeout = undefined;
      }

      const winnerPlayer = room.players.find(p => p.id === winnerId);
      const winnerName = isDraw ? 'Empate' : (winnerPlayer?.name || 'Jugador desconocido');

      this.broadcastGameState(room, false);
      this.io.to(room.code).emit('game:ended', {
        winnerId,
        winnerName,
        isDraw,
      });

      // Lifecycle hook on finish
      if (this.lifecycleHooks?.onGameEnd) {
        this.lifecycleHooks.onGameEnd({
          roomCode: room.code,
          gameType: room.gameType,
          winnerId,
          durationMs: room.gameStartTime ? Date.now() - room.gameStartTime : 0,
        });
      }

      this.broadcastRoomUpdate(room);
      return { success: true };
    }

    this.broadcastGameState(room, false);
    this.checkAndTriggerBotTurn(room);

    return { success: true };
  }

  public reconnectPlayer(
    roomCode: string,
    playerId: string,
    socketId: string
  ): { success: boolean; room?: RoomInfo; state?: any; error?: string } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Sala no encontrada.' };
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Jugador no registrado en esta sala.' };
    }

    if (player.disconnectTimeout) {
      clearTimeout(player.disconnectTimeout);
      player.disconnectTimeout = undefined;
    }

    player.connected = true;
    player.socketId = socketId;
    this.socketToRoom.set(socketId, code);
    room.lastActivity = Date.now();

    this.broadcastRoomUpdate(room);

    let sanitizedState = null;
    if (room.status === 'in_game' && room.gameState) {
      sanitizedState = room.engine.getSanitizedState(room.gameState, playerId);
    }

    return {
      success: true,
      room: this.getRoomInfo(room),
      state: sanitizedState,
    };
  }

  public handleDisconnect(socketId: string): void {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return;

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return;

    player.connected = false;
    player.socketId = null;

    if (room.status === 'waiting') {
      // In waiting lobby, remove player directly or start brief timer
      player.disconnectTimeout = setTimeout(() => {
        this.removePlayerFromRoom(room, player.id);
      }, 5000);
    } else {
      // In game, allow grace period for reconnection
      player.disconnectTimeout = setTimeout(() => {
        this.removePlayerFromRoom(room, player.id);
      }, CONFIG.DISCONNECT_GRACE_PERIOD_MS);
    }

    this.broadcastRoomUpdate(room);
  }

  public leaveRoom(socketId: string): void {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    this.socketToRoom.delete(socketId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socketId);
    if (player) {
      if (player.disconnectTimeout) {
        clearTimeout(player.disconnectTimeout);
      }
      this.removePlayerFromRoom(room, player.id);
    }
  }

  private removePlayerFromRoom(room: ActiveRoom, playerId: string): void {
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    room.players.splice(playerIndex, 1);

    // If no human players left, destroy room
    const humanPlayers = room.players.filter(p => !p.isBot && p.connected);
    if (humanPlayers.length === 0) {
      this.destroyRoom(room.code, 'Todos los jugadores abandonaron la sala.');
      return;
    }

    // Reassign host if host left
    if (room.hostId === playerId) {
      const nextHost = room.players.find(p => !p.isBot);
      if (nextHost) {
        room.hostId = nextHost.id;
        nextHost.isHost = true;
      }
    }

    // If game in progress and remaining humans < minPlayers, end game
    if (room.status === 'in_game' && room.players.length < room.minPlayers) {
      room.status = 'finished';
      this.io.to(room.code).emit('game:ended', {
        winnerId: null,
        winnerName: 'Partida cancelada por abandono',
        isDraw: true,
      });
    }

    this.broadcastRoomUpdate(room);
  }

  private destroyRoom(roomCode: string, reason: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    if (room.botLoopTimeout) {
      clearTimeout(room.botLoopTimeout);
    }

    for (const player of room.players) {
      if (player.disconnectTimeout) {
        clearTimeout(player.disconnectTimeout);
      }
      if (player.socketId) {
        this.socketToRoom.delete(player.socketId);
      }
    }

    this.io.to(roomCode).emit('room:closed', reason);
    this.rooms.delete(roomCode);
  }

  private checkAndTriggerBotTurn(room: ActiveRoom): void {
    if (room.status !== 'in_game' || !room.gameState) return;

    const currentTurnId =
      (room.gameState as any).currentTurn ||
      (room.gameState as any).currentTurnPlayerId;

    if (!currentTurnId) return;

    const currentPlayer = room.players.find(p => p.id === currentTurnId);
    if (currentPlayer && currentPlayer.isBot) {
      if (room.botLoopTimeout) {
        clearTimeout(room.botLoopTimeout);
      }

      room.botLoopTimeout = setTimeout(() => {
        this.executeBotTurn(room, currentTurnId);
      }, CONFIG.BOT_THINKING_TIME_MS);
    }
  }

  private executeBotTurn(room: ActiveRoom, botId: string): void {
    if (room.status !== 'in_game' || !room.gameState) return;

    const botAction = room.engine.getBotAction(room.gameState, botId);
    if (botAction) {
      this.handleAction(room.code, botId, botAction);
    }
  }

  /**
   * Dispatches tailored, sanitized states individually to each connected client.
   * Server-Authoritative Zero-Trust: clients never receive opponents' private cards.
   */
  public broadcastGameState(room: ActiveRoom, isStart: boolean = false): void {
    if (!room.gameState) return;

    for (const player of room.players) {
      if (player.socketId) {
        const sanitizedState = room.engine.getSanitizedState(room.gameState, player.id);
        if (isStart) {
          this.io.to(player.socketId).emit('game:started', {
            gameType: room.gameType,
            publicState: sanitizedState,
          });
        } else {
          this.io.to(player.socketId).emit('game:state_update', sanitizedState);
        }
      }
    }
  }

  public broadcastRoomUpdate(room: ActiveRoom): void {
    const roomInfo = this.getRoomInfo(room);
    this.io.to(room.code).emit('room:updated', roomInfo);
  }

  public getRoomInfo(room: ActiveRoom): RoomInfo {
    return {
      code: room.code,
      gameType: room.gameType,
      hostId: room.hostId,
      status: room.status,
      maxPlayers: room.maxPlayers,
      minPlayers: room.minPlayers,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        connected: p.connected,
        isHost: p.id === room.hostId,
      })),
      customRules: room.customRules,
    };
  }

  public getRoomBySocket(socketId: string): ActiveRoom | undefined {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  private cleanupInactiveRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivity > CONFIG.ROOM_MAX_IDLE_TIME_MS) {
        this.destroyRoom(code, 'Sala cerrada por inactividad prolongada.');
      }
    }
  }

  public dispose(): void {
    clearInterval(this.cleanupInterval);
    for (const code of this.rooms.keys()) {
      this.destroyRoom(code, 'Servidor reiniciándose.');
    }
  }
}
