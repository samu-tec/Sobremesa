import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CATALOG } from '../packages/sobremesa-logic/dist/index.js';
import { gameFactories } from '../apps/sobremesa-server/dist/games/engines.js';
import {
  parseAllowedOrigins,
  contentSecurityPolicy,
} from '../apps/sobremesa-server/dist/origins.js';
import { RoomManager } from '../apps/sobremesa-server/dist/RoomManager.js';
import { RoomCreationLimiter } from '../apps/sobremesa-server/dist/RoomCreationLimiter.js';
import {
  parseTrustedCloudflareIps,
  resolveClientIp,
} from '../apps/sobremesa-server/dist/clientIp.js';

test('Orígenes exactos y CSP derivada sin comodines ni interpolación de cabeceras', () => {
  const origins = parseAllowedOrigins(
    'http://127.0.0.1:13000, https://example.test,http://127.0.0.1:13000',
  );
  assert.deepEqual(origins, ['http://127.0.0.1:13000', 'https://example.test']);
  const csp = contentSecurityPolicy(origins);
  assert.match(csp, /ws:\/\/127\.0\.0\.1:13000/);
  assert.match(csp, /wss:\/\/example\.test/);
  assert.ok(!csp.includes('*'));
  for (const origin of [
    '',
    '*',
    'null',
    'https://example.test/path',
    'https://a.test; script-src *',
    'https://user:pass@example.test',
    'file:///tmp',
    'http://example.test/',
  ])
    assert.throws(() => parseAllowedOrigins(origin));
});

for (const game of GAME_CATALOG) {
  test(`${game.id}: registro completo, motor aislado, acciones inválidas inocuas y abandono idempotente`, () => {
    const runtime = gameFactories[game.id]();
    const other = gameFactories[game.id]();
    assert.notEqual(runtime.engine, other.engine);
    const players = Array.from({ length: game.minPlayers }, (_, i) => ({
      id: `p${i}`,
      isBot: false,
    }));
    const engine = runtime.engine;
    const state = engine.initGame(players);
    const actor = runtime.actor(state);
    const before = structuredClone(state);
    const action = engine.getBotAction(state, actor);
    assert.ok(action);
    assert.equal(engine.validateAction(state, actor, action), true);
    assert.equal(engine.validateAction(state, 'outsider', action), false);
    for (const invalid of [
      null,
      [],
      {},
      { type: 'UNKNOWN' },
      { type: 'MOVE', from: Infinity, to: -1 },
    ]) {
      assert.equal(engine.validateAction(state, actor, invalid), false);
      assert.equal(engine.applyAction(state, actor, invalid), state);
    }
    assert.deepEqual(state, before);
    assert.equal(engine.forfeitPlayer(state, 'outsider'), state);
    const ended = engine.forfeitPlayer(state, actor);
    if (ended.winner || ended.isDraw) assert.equal(engine.forfeitPlayer(ended, actor), ended);

    const match = runtime.createMatch();
    const isolated = other.createMatch();
    match.start(players);
    isolated.start(players);
    const untouched = structuredClone(isolated.state);
    const matchActor = match.botId(players) || match.actor();
    const matchBefore = structuredClone(match.state);
    for (const invalid of [null, [], {}, { type: 'UNKNOWN' }]) {
      assert.equal(match.act(matchActor, invalid), null);
      assert.deepEqual(match.state, matchBefore);
    }
    assert.ok(match.act(matchActor, match.botAction(matchActor)));
    assert.deepEqual(isolated.state, untouched, 'Otra partida conserva su estado');
    match.reset();
    assert.equal(match.publicState(matchActor), null);
    assert.equal(match.timeoutStep(matchActor), null);
    assert.equal(match.expire(), false);
  });
}

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
      const actor = room.match.state.currentTurnPlayerId;
      let action;
      if (game === 'chess') action = { type: 'OFFER_DRAW' };
      if (game === 'battleship') action = { type: 'RANDOMIZE' };
      if (game === 'combinations') action = { type: 'ROLL', keep: [] };
      if (game === 'backgammon') action = room.match.botAction(actor);
      if (game === 'checkers') {
        room.match.state.board = Array(64).fill(null);
        room.match.state.board[42] = { owner: actor, king: false };
        room.match.state.board[35] = { owner: `b-${game}`, king: false };
        room.match.state.board[21] = { owner: `b-${game}`, king: false };
        room.match.state.board[55] = { owner: `b-${game}`, king: false };
        action = { type: 'MOVE', from: 42, to: 28 };
      }
      assert.equal(manager.handleAction(code, actor, action).success, true);
      assert.equal(room.turnDeadline, deadline, `${game}: reinició el reloj`);
      context.mock.timers.tick(20000);
      assert.notEqual(room.match.state.currentTurnPlayerId, actor, `${game}: turno bloqueado`);
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
    const s = manager.getRoomBySocket('socket-a').match.state;
    assert.equal(s.players[0].hand.length, 10);
    assert.equal(s.rules.openingPoints, 50);
    assert.equal(s.rules.useJokers, false);
    assert.throws(() => manager.updateRoomRules(a.code, 'a', { openingPoints: 0 }), /momento/);
  } finally {
    manager.dispose();
  }
});

for (const failure of ['expire', 'timeoutStep', 'publicState', 'forfeit', 'botAction']) {
  test(`Un fallo en ${failure} cierra solo su sala y cancela sus tareas automáticas`, (context) => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
    const emitted = [];
    const leaves = [];
    const io = {
      to: (code) => ({ emit: (event, payload) => emitted.push({ code, event, payload }) }),
      sockets: {
        sockets: new Map(
          ['socket-a', 'socket-b'].map((id) => [
            id,
            { leave: (code) => leaves.push({ id, code }) },
          ]),
        ),
      },
    };
    const logged = context.mock.method(console, 'error', () => {});
    const manager = new RoomManager(io);
    try {
      const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
      if (failure === 'botAction') manager.addBot(code, 'a');
      else manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
      const other = manager.createRoom('Clara', 'c', 'socket-c', 'tictactoe').room.code;
      manager.joinRoom(other, 'David', 'd', 'socket-d');
      manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
      manager.updateRoomRules(other, 'c', { turnSeconds: 30 });
      manager.startGame(code, 'a');
      manager.startGame(other, 'c');
      const room = manager.getRoomBySocket('socket-a');
      const healthy = manager.getRoomBySocket('socket-c');
      const healthyBefore = structuredClone(healthy.match.state);
      if (failure === 'botAction') {
        assert.equal(
          manager.handleAction(code, 'a', { type: 'MAKE_MOVE', index: 0 }).success,
          true,
        );
      }
      room.match[failure] = () => {
        throw new Error('mano-secreta-no-publicable');
      };
      if (failure === 'forfeit') manager.handleDisconnect('socket-b');
      emitted.length = 0;
      assert.doesNotThrow(() => context.mock.timers.tick(failure === 'forfeit' ? 300000 : 30000));
      assert.equal(manager.getRoomsCount(), 1);
      assert.equal(manager.getRoomBySocket('socket-a'), undefined);
      assert.equal(manager.getRoomBySocket('socket-b'), undefined);
      assert.equal(room.turnDeadline, null);
      assert.equal(manager.getRoomBySocket('socket-c'), healthy);
      assert.notDeepEqual(
        healthy.match.state,
        healthyBefore,
        'El reloj de la otra sala sigue activo',
      );
      const closed = emitted.filter((e) => e.event === 'room:closed');
      assert.equal(closed.length, 1);
      assert.equal(closed[0].code, code);
      assert.match(closed[0].payload, /error inesperado/);
      assert.equal(
        emitted.some((e) => e.code === code && e.event === 'game:state_update'),
        false,
      );
      assert.ok(leaves.some((e) => e.id === 'socket-a' && e.code === code));
      assert.equal(logged.mock.calls.length, 1);
      assert.ok(!JSON.stringify([emitted, logged.mock.calls]).includes('mano-secreta'));
      context.mock.timers.tick(300000);
      assert.equal(emitted.filter((e) => e.event === 'room:closed').length, 1);
      assert.equal(logged.mock.calls.length, 1, 'No se reintenta un motor averiado');
    } finally {
      manager.dispose();
      context.mock.timers.reset();
    }
  });
}

test('Reconectar conserva el plazo y anula la reserva; una desconexión antigua no afecta al sustituto', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    const deadline = room.turnDeadline;
    manager.handleDisconnect('socket-a');
    context.mock.timers.tick(10000);
    const restored = manager.reconnectPlayer(code, 'a', 'socket-new');
    assert.equal(restored.success, true);
    assert.deepEqual(restored.state, room.match.publicState('a'));
    assert.equal(room.turnDeadline, deadline);
    assert.equal(room.players[0].disconnectTimeout, undefined);
    manager.handleDisconnect('socket-a');
    assert.equal(room.players[0].connected, true);
    context.mock.timers.tick(20000);
    assert.equal(room.match.actor(), 'b', 'El reloj original vence durante la conexión nueva');
    assert.equal(room.match.state.board.filter(Boolean).length, 1);
    context.mock.timers.tick(300000);
    assert.equal(manager.getRoomBySocket('socket-new'), room);
    assert.equal(room.players.length, 2, 'La reserva cancelada no expulsa al jugador recuperado');
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Una partida terminada durante la desconexión se recupera sin rearmar relojes ni bots', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.startGame(code, 'a');
    for (const [id, index] of [
      ['a', 0],
      ['b', 3],
      ['a', 1],
      ['b', 4],
    ])
      assert.equal(manager.handleAction(code, id, { type: 'MAKE_MOVE', index }).success, true);
    manager.handleDisconnect('socket-b');
    assert.equal(manager.handleAction(code, 'a', { type: 'MAKE_MOVE', index: 2 }).success, true);
    const result = manager.reconnectPlayer(code, 'b', 'socket-new');
    assert.equal(result.success, true);
    assert.equal(result.room.status, 'finished');
    assert.equal(result.state.winner, 'a');
    const room = manager.getRoomBySocket('socket-new');
    const finished = structuredClone(room.match.state);
    assert.equal(room.turnTimeout, undefined);
    assert.equal(room.botLoopTimeout, undefined);
    context.mock.timers.tick(300000);
    assert.deepEqual(room.match.state, finished);
    assert.equal(room.players.length, 2);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Salir con un bot pendiente y apagar liberan todas las tareas sin emitir estados tardíos', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const emitted = [];
  const io = {
    to: (code) => ({ emit: (event) => emitted.push({ code, event }) }),
    sockets: { sockets: new Map() },
  };
  const manager = new RoomManager(io);
  try {
    for (const leave of [true, false]) {
      const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
      manager.addBot(code, 'a');
      manager.startGame(code, 'a');
      manager.handleAction(code, 'a', { type: 'MAKE_MOVE', index: 0 });
      if (leave) manager.leaveRoom('socket-a');
      else manager.dispose();
      const count = emitted.length;
      context.mock.timers.tick(7 * 60 * 60 * 1000);
      assert.equal(manager.getRoomsCount(), 0);
      assert.equal(manager.getRoomBySocket('socket-a'), undefined);
      assert.equal(emitted.length, count);
    }
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Ciudad Fortuna conserva la subasta y su plazo al reconectar, y adjudica una sola vez', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  context.mock.method(Math, 'random', () => 0);
  const emitted = [];
  const io = {
    to: (code) => ({ emit: (event, payload) => emitted.push({ code, event, payload }) }),
    sockets: { sockets: new Map() },
  };
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'monopoly').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    room.match.state.players[0].position = 1;
    assert.equal(manager.handleAction(code, 'a', { type: 'ROLL_DICE' }).success, true);
    assert.equal(manager.handleAction(code, 'a', { type: 'PASS_PROPERTY' }).success, true);
    const tile = room.match.state.auction.tileIndex;
    assert.equal(tile, 3);
    const initialDeadline = room.turnDeadline;
    context.mock.timers.tick(5000);
    assert.equal(manager.handleAction(code, 'b', { type: 'BID', amount: 10 }).success, true);
    const deadline = room.turnDeadline;
    assert.equal(deadline, initialDeadline + 5000);
    const cash = room.match.state.players.find((p) => p.id === 'b').cash;
    manager.handleDisconnect('socket-b');
    context.mock.timers.tick(5000);
    const result = manager.reconnectPlayer(code, 'b', 'socket-new');
    assert.equal(result.success, true);
    assert.equal(result.state.auction.highestBidderId, 'b');
    assert.equal(result.room.turnDeadline, deadline);
    for (const state of [
      result.state,
      ...emitted.filter((e) => e.event === 'game:state_update').map((e) => e.payload),
    ]) {
      assert.equal('chanceDeck' in state, false);
      assert.equal('communityDeck' in state, false);
    }
    context.mock.timers.tick(10000);
    assert.equal(room.match.state.auction, null);
    assert.equal(room.match.state.properties[tile].ownerId, 'b');
    assert.equal(room.match.state.players.find((p) => p.id === 'b').cash, cash - 10);
    const restored = manager.reconnectPlayer(code, 'b', 'socket-again');
    assert.equal(restored.state.auction, null);
    assert.equal(restored.state.players.find((p) => p.id === 'b').cash, cash - 10);
    assert.ok(room.turnDeadline > deadline);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});
