import type { Server, Socket } from 'socket.io';
import {
  GAME_CATALOG,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
  type GameType,
} from '@games/game-logic';
import type { RoomManager } from './RoomManager.js';
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const name = (value: unknown) =>
  typeof value === 'string'
    ? value
        .normalize('NFC')
        .replace(/[\p{Cc}\p{Cf}]/gu, '')
        .trim()
        .slice(0, 24)
    : '';
const code = (value: unknown) =>
  typeof value === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(value.toUpperCase().trim())
    ? value.toUpperCase().trim()
    : null;
export function registerSocketHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  manager: RoomManager,
) {
  socket.emit('session:ready', { playerId: socket.data.playerId });
  let tokens = 30,
    updated = Date.now();
  // Runtime guards matter: network messages do not inherit TypeScript's guarantees.
  const on = (event: string, handler: (...args: any[]) => unknown) => {
    (socket.on as Function)(event, (...args: any[]) => {
      const callback =
        typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
      const reply = (result: unknown) => callback?.(result);
      const now = Date.now();
      tokens = Math.min(30, tokens + (now - updated) / 200);
      updated = now;
      if (tokens < 1) {
        reply({ success: false, error: 'Demasiadas acciones. Espera un momento.' });
        return;
      }
      tokens--;
      try {
        reply(handler(...args));
      } catch {
        reply({
          success: false,
          error: 'No se pudo completar la acción. Comprueba el estado de la sala.',
        });
      }
    });
  };
  const roomAction = (operation: (roomCode: string, id: string) => unknown) => {
    const room = manager.getRoomBySocket(socket.id);
    if (!room) return { success: false, error: 'No estás en una sala.' };
    return operation(room.code, socket.data.playerId);
  };
  const enter = (result: any) => {
    if (result.success && result.room) {
      socket.join(result.room.code);
      socket.data.roomCode = result.room.code;
    }
    return result;
  };
  on('room:create', (data: unknown) => {
    if (
      !record(data) ||
      !name(data.playerName) ||
      !GAME_CATALOG.some((g) => g.id === data.gameType)
    )
      return { success: false, error: 'Elige un nombre y un juego válidos.' };
    return enter(
      manager.createRoom(
        name(data.playerName),
        socket.data.playerId,
        socket.id,
        data.gameType as GameType,
      ),
    );
  });
  on('room:join', (data: unknown) => {
    if (!record(data) || !code(data.roomCode) || !name(data.playerName))
      return { success: false, error: 'Introduce tu nombre y un código de seis caracteres.' };
    return enter(
      manager.joinRoom(
        code(data.roomCode)!,
        name(data.playerName),
        socket.data.playerId,
        socket.id,
      ),
    );
  });
  on('game:reconnect', (data: unknown) => {
    if (!record(data) || !code(data.roomCode))
      return { success: false, error: 'Código no válido.' };
    return enter(manager.reconnectPlayer(code(data.roomCode)!, socket.data.playerId, socket.id));
  });
  on('room:leave', () => {
    if (socket.data.roomCode) socket.leave(socket.data.roomCode);
    manager.leaveRoom(socket.id);
    socket.data.roomCode = undefined;
    return { success: true };
  });
  on('room:add_bot', () => roomAction((c, id) => manager.addBot(c, id)));
  on('room:remove_bot', (data: unknown) =>
    record(data) && typeof data.botId === 'string'
      ? roomAction((c, id) => manager.removeBot(c, id, data.botId as string))
      : { success: false, error: 'Bot no válido.' },
  );
  on('room:start_game', () => roomAction((c, id) => manager.startGame(c, id)));
  on('room:restart_game', () => roomAction((c, id) => manager.restartGame(c, id)));
  on('room:update_rules', (rules: unknown) =>
    roomAction((c, id) => manager.updateRoomRules(c, id, rules)),
  );
  on('game:action', (action: unknown) =>
    roomAction((c, id) => manager.handleAction(c, id, action)),
  );
  socket.on('disconnect', () => manager.handleDisconnect(socket.id));
}
