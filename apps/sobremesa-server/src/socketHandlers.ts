import type { Server, Socket } from 'socket.io';
import {
  GAME_CATALOG,
  PROTOCOL_VERSION,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
  type GameType,
  type InterServerEvents,
  type Result,
  type RoomResult,
} from 'sobremesa-logic';
import type { RoomManager } from './RoomManager.js';
type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
interface RoomCreationGuard {
  allowAttempt: () => boolean;
  canCreateGlobally: () => boolean;
  recordCreated: () => void;
}
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
  typeof value === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(value.toUpperCase().replace(/\s/g, ''))
    ? value.toUpperCase().replace(/\s/g, '')
    : null;
export function registerSocketHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  manager: RoomManager,
  roomCreationGuard: RoomCreationGuard,
) {
  socket.emit('session:ready', {
    playerId: socket.data.playerId,
    protocolVersion: PROTOCOL_VERSION,
  });
  let tokens = 30,
    updated = Date.now(),
    rateLimitViolations = 0;
  // Runtime guards matter: network messages do not inherit TypeScript's guarantees.
  // Socket.IO's generic overloads describe trusted callers; this boundary validates unknown data.
  const subscribe = socket.on.bind(socket) as (
    event: keyof ClientToServerEvents,
    listener: (...args: unknown[]) => void,
  ) => void;
  const on = (event: keyof ClientToServerEvents, handler: (...args: unknown[]) => Result) => {
    subscribe(event, (...args: unknown[]) => {
      const last = args.at(-1);
      const callback = typeof last === 'function' ? last : undefined;
      const reply = (result: unknown) => callback?.(result);
      const now = Date.now();
      tokens = Math.min(30, tokens + (now - updated) / 200);
      updated = now;
      if (tokens < 1) {
        rateLimitViolations++;
        reply({ success: false, error: 'Demasiadas acciones. Espera un momento.' });
        if (rateLimitViolations >= 20) socket.disconnect(true);
        return;
      }
      tokens--;
      rateLimitViolations = Math.max(0, rateLimitViolations - 1);
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
  const roomAction = (context: unknown, operation: (roomCode: string, id: string) => Result) => {
    const room = manager.getRoomBySocket(socket.id);
    if (!room) return { success: false, error: 'No estás en una sala.' };
    if (!record(context) || context.matchId !== room.matchId)
      return {
        success: false,
        error: 'La partida ha cambiado. Usa los controles actuales de la sala.',
      };
    return operation(room.code, socket.data.playerId);
  };
  const enter = <T extends RoomResult>(result: T): T => {
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
    if (!roomCreationGuard.allowAttempt() || !roomCreationGuard.canCreateGlobally())
      return {
        success: false,
        error: 'Se alcanzó el límite temporal de creación de salas. Inténtalo de nuevo más tarde.',
        errorCode: 'ROOM_CREATE_RATE_LIMITED' as const,
      };
    const result = manager.createRoom(
      name(data.playerName),
      socket.data.playerId,
      socket.id,
      data.gameType as GameType,
    );
    if (result.success) roomCreationGuard.recordCreated();
    return enter(result);
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
  on('room:add_bot', (data) => roomAction(data, (c, id) => manager.addBot(c, id)));
  on('room:remove_bot', (data) =>
    record(data) && typeof data.botId === 'string'
      ? roomAction(data, (c, id) => manager.removeBot(c, id, data.botId as string))
      : { success: false, error: 'Bot no válido.' },
  );
  on('room:remove_player', (data) =>
    record(data) && typeof data.playerId === 'string'
      ? roomAction(data, (c, id) => manager.removeHuman(c, id, data.playerId as string))
      : { success: false, error: 'Participante no válido.' },
  );
  on('room:resolve_autoplay', (data) =>
    record(data) &&
    typeof data.playerId === 'string' &&
    (data.decision === 'keep' || data.decision === 'remove')
      ? roomAction(data, (c, id) =>
          manager.resolveAutoPlay(
            c,
            id,
            data.playerId as string,
            data.decision as 'keep' | 'remove',
          ),
        )
      : { success: false, error: 'Decisión no válida.' },
  );
  on('room:respond_inactivity', (data) =>
    record(data) &&
    typeof data.matchId === 'string' &&
    typeof data.promptId === 'string' &&
    (data.decision === 'continue' || data.decision === 'leave')
      ? roomAction(data, (c, id) =>
          manager.respondToInactivity(
            c,
            id,
            socket.id,
            data.matchId as string,
            data.promptId as string,
            data.decision,
          ),
        )
      : { success: false, error: 'Decisión de actividad no válida.' },
  );
  on('room:update_name', (data) =>
    record(data) && name(data.playerName)
      ? roomAction(data, (c, id) => manager.updatePlayerName(c, id, name(data.playerName)))
      : { success: false, error: 'Introduce un nombre válido.' },
  );
  on('room:change_game', (data) =>
    record(data) && GAME_CATALOG.some((g) => g.id === data.gameType)
      ? roomAction(data, (c, id) => manager.changeGame(c, id, data.gameType as GameType))
      : { success: false, error: 'Juego no válido.' },
  );
  on('room:start_game', (data) => roomAction(data, (c, id) => manager.startGame(c, id)));
  on('room:restart_game', (data) => roomAction(data, (c, id) => manager.restartGame(c, id)));
  on('room:update_rules', (data) =>
    roomAction(data, (c, id) => manager.updateRoomRules(c, id, record(data) ? data.rules : null)),
  );
  on('game:action', (data) =>
    roomAction(data, (c, id) => manager.handleAction(c, id, record(data) ? data.action : null)),
  );
  socket.on('disconnect', () => manager.handleDisconnect(socket.id));
}
