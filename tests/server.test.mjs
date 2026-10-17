import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../apps/sobremesa-server/dist/RoomManager.js';
import { RoomCreationLimiter } from '../apps/sobremesa-server/dist/RoomCreationLimiter.js';
import {
  parseTrustedCloudflareIps,
  resolveClientIp,
} from '../apps/sobremesa-server/dist/clientIp.js';

test('CF-Connecting-IP solo se acepta desde direcciones proxy autorizadas y debe ser una IP válida', () => {
  const trusted = parseTrustedCloudflareIps('172.20.0.4, ::ffff:172.20.0.5');
  assert.deepEqual([...trusted], ['172.20.0.4', '172.20.0.5']);
  assert.equal(resolveClientIp('172.20.0.4', '198.51.100.12', trusted), '198.51.100.12');
  assert.equal(resolveClientIp('172.20.0.9', '198.51.100.12', trusted), '172.20.0.9');
  assert.equal(resolveClientIp('172.20.0.4', 'invalid', trusted), '172.20.0.4');
  assert.equal(resolveClientIp('172.20.0.4', ['198.51.100.12'], trusted), '172.20.0.4');
  assert.throws(() => parseTrustedCloudflareIps('cloudflared'), /TRUSTED_CLOUDFLARE_IPS/);
});

test('La creación de salas queda limitada por IP, globalmente y en memoria', () => {
  const limiter = new RoomCreationLimiter(5, 30, 60000, 2);
  let allowed = 0;
  for (let i = 0; i < 100000; i++) if (limiter.allowAttempt('192.0.2.1', 1000)) allowed++;
  assert.equal(allowed, 5);
  assert.equal(limiter.allowAttempt('192.0.2.2', 1000), true);
  assert.equal(limiter.allowAttempt('192.0.2.3', 1000), false);
  assert.equal(limiter.allowAttempt('192.0.2.3', 61000), true);

  const global = new RoomCreationLimiter(10, 3, 60000);
  for (let i = 0; i < 3; i++) {
    assert.equal(global.canCreateGlobally(1000), true);
    global.recordCreated(1000);
  }
  assert.equal(global.canCreateGlobally(1000), false);
  assert.equal(global.canCreateGlobally(61000), true);
});

test('Los turnos automáticos no mantienen viva una sala abandonada por inactividad', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const emitted = [];
  const io = {
    to: (code) => ({ emit: (event, payload) => emitted.push({ code, event, payload }) }),
    sockets: { sockets: new Map() },
  };
  const manager = new RoomManager(io);
  try {
    const created = manager.createRoom('Ana', 'a', 'socket-a', 'colorclash');
    assert.equal(created.success, true);
    const code = created.room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 180 });
    manager.startGame(code, 'a');
    context.mock.timers.tick(180000);
    assert.ok(emitted.some((e) => e.event === 'game:state_update'));
    context.mock.timers.tick(6 * 60 * 60 * 1000 + 60000);
    assert.equal(manager.getRoomsCount(), 0);
    assert.ok(emitted.some((e) => e.event === 'room:closed'));
    assert.ok(emitted.some((e) => e.event === 'room:closed' && /6 horas/.test(e.payload)));
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('La limpieza por inactividad respeta la reserva después de desconectar', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: new Map() },
  };
  const manager = new RoomManager(io);
  try {
    const created = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe');
    assert.equal(created.success, true);
    context.mock.timers.tick(359 * 60000);
    manager.handleDisconnect('socket-a');
    context.mock.timers.tick(90000);
    assert.equal(manager.getRoomsCount(), 1);
    assert.equal(manager.reconnectPlayer(created.room.code, 'a', 'socket-b').success, true);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('El reloj conserva el presupuesto del turno durante decisiones intermedias', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    for (const game of ['chess', 'battleship', 'combinations', 'checkers', 'backgammon']) {
      const created = manager.createRoom('Ana', `a-${game}`, `socket-a-${game}`, game);
      const code = created.room.code;
      manager.joinRoom(code, 'Bruno', `b-${game}`, `socket-b-${game}`);
      manager.updateRoomRules(code, `a-${game}`, { turnSeconds: 30 });
      manager.startGame(code, `a-${game}`);
      const room = manager.getRoomBySocket(`socket-a-${game}`),
        deadline = room.turnDeadline;
      context.mock.timers.tick(10000);
      const actor = room.gameState.currentTurnPlayerId;
      let action;
      if (game === 'chess') action = { type: 'OFFER_DRAW' };
      if (game === 'battleship') action = { type: 'RANDOMIZE' };
      if (game === 'combinations') action = { type: 'ROLL', keep: [] };
      if (game === 'backgammon') action = room.engine.getBotAction(room.gameState, actor);
      if (game === 'checkers') {
        room.gameState.board = Array(64).fill(null);
        room.gameState.board[42] = { owner: actor, king: false };
        room.gameState.board[35] = { owner: `b-${game}`, king: false };
        room.gameState.board[21] = { owner: `b-${game}`, king: false };
        room.gameState.board[55] = { owner: `b-${game}`, king: false };
        action = { type: 'MOVE', from: 42, to: 28 };
      }
      assert.equal(manager.handleAction(code, actor, action).success, true);
      assert.equal(room.turnDeadline, deadline, `${game}: reinició el reloj`);
      context.mock.timers.tick(20000);
      assert.notEqual(room.gameState.currentTurnPlayerId, actor, `${game}: turno bloqueado`);
      assert.ok(room.turnDeadline > Date.now());
      manager.leaveRoom(`socket-a-${game}`);
      manager.leaveRoom(`socket-b-${game}`);
    }
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('La sala valida opciones, conserva las de otra sala y las bloquea al empezar', () => {
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const a = manager.createRoom('Ana', 'a', 'socket-a', 'rummy').room,
      b = manager.createRoom('Bruno', 'b', 'socket-b', 'rummy').room;
    manager.joinRoom(a.code, 'Clara', 'c', 'socket-c');
    assert.throws(() => manager.updateRoomRules(a.code, 'c', { openingPoints: 50 }), /anfitrión/);
    assert.equal(
      manager.updateRoomRules(a.code, 'a', {
        openingPoints: 50,
        startingTiles: 10,
        useJokers: false,
      }).success,
      true,
    );
    assert.equal(
      manager.updateRoomRules(a.code, 'a', { openingPoints: 30, startingTiles: 100 }).success,
      false,
    );
    assert.equal(manager.getRoomBySocket('socket-a').customRules.openingPoints, 50);
    assert.equal(manager.getRoomBySocket('socket-b').customRules.openingPoints, 30);
    manager.startGame(a.code, 'a');
    const s = manager.getRoomBySocket('socket-a').gameState;
    assert.equal(s.players[0].hand.length, 10);
    assert.equal(s.rules.openingPoints, 50);
    assert.equal(s.rules.useJokers, false);
    assert.throws(() => manager.updateRoomRules(a.code, 'a', { openingPoints: 0 }), /momento/);
  } finally {
    manager.dispose();
  }
});
