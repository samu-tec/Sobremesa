import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@games/game-logic';
import { RoomManager } from './RoomManager.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>;

export function registerSocketHandlers(io: TypedServer, socket: TypedSocket, roomManager: RoomManager) {
  // CREATE ROOM
  socket.on('room:create', ({ playerName, gameType, playerId }, callback) => {
    try {
      const result = roomManager.createRoom(playerName, playerId, socket.id, gameType);
      if (result.success && result.room) {
        socket.join(result.room.code);
        socket.data.playerId = playerId;
        socket.data.playerName = playerName;
        socket.data.roomCode = result.room.code;
      }
      callback(result);
    } catch (err: any) {
      callback({ success: false, error: err?.message || 'Error al crear la sala' });
    }
  });

  // JOIN ROOM
  socket.on('room:join', ({ roomCode, playerName, playerId }, callback) => {
    try {
      const result = roomManager.joinRoom(roomCode, playerName, playerId, socket.id);
      if (result.success && result.room) {
        socket.join(result.room.code);
        socket.data.playerId = playerId;
        socket.data.playerName = playerName;
        socket.data.roomCode = result.room.code;
      }
      callback(result);
    } catch (err: any) {
      callback({ success: false, error: err?.message || 'Error al unirse a la sala' });
    }
  });

  // LEAVE ROOM
  socket.on('room:leave', (callback) => {
    try {
      if (socket.data.roomCode) {
        socket.leave(socket.data.roomCode);
      }
      roomManager.leaveRoom(socket.id);
      socket.data.roomCode = undefined;
      callback?.({ success: true });
    } catch {
      callback?.({ success: false });
    }
  });

  // ADD BOT
  socket.on('room:add_bot', (callback) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) {
      return callback({ success: false, error: 'No estás en ninguna sala' });
    }
    const playerId = socket.data.playerId || '';
    const result = roomManager.addBot(room.code, playerId);
    callback(result);
  });

  // REMOVE BOT
  socket.on('room:remove_bot', ({ botId }, callback) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) {
      return callback({ success: false, error: 'No estás en ninguna sala' });
    }
    const playerId = socket.data.playerId || '';
    const result = roomManager.removeBot(room.code, playerId, botId);
    callback(result);
  });

  // START GAME
  socket.on('room:start_game', (callback) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) {
      return callback({ success: false, error: 'No estás en ninguna sala' });
    }
    const playerId = socket.data.playerId || '';
    const result = roomManager.startGame(room.code, playerId);
    callback(result);
  });

  // UPDATE RULES (Host can configure rules before starting)
  socket.on('room:update_rules', (rules, callback) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) {
      return callback?.({ success: false, error: 'No estás en ninguna sala' });
    }
    const playerId = socket.data.playerId || '';
    const result = roomManager.updateRoomRules(room.code, playerId, rules);
    callback?.(result);
  });

  // RESTART GAME
  socket.on('room:restart_game', (callback) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) {
      return callback({ success: false, error: 'No estás en ninguna sala' });
    }
    const playerId = socket.data.playerId || '';
    const result = roomManager.restartGame(room.code, playerId);
    callback(result);
  });

  // IN-GAME ACTION (Server-Authoritative validation & application)
  socket.on('game:action', (action, callback) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) {
      callback?.({ success: false, error: 'No estás en una sala activa' });
      return;
    }
    const playerId = socket.data.playerId || '';
    const result = roomManager.handleAction(room.code, playerId, action);
    callback?.(result);
  });

  // RECONNECT TO GAME
  socket.on('game:reconnect', ({ roomCode, playerId }, callback) => {
    try {
      const result = roomManager.reconnectPlayer(roomCode, playerId, socket.id);
      if (result.success && result.room) {
        socket.join(result.room.code);
        socket.data.playerId = playerId;
        socket.data.roomCode = result.room.code;
      }
      callback(result);
    } catch (err: any) {
      callback({ success: false, error: err?.message || 'Error al reconectar' });
    }
  });

  // DISCONNECT HANDLER (Grace period support)
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
}
