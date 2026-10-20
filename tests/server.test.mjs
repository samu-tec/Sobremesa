import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CATALOG } from '../packages/sobremesa-logic/dist/index.js';
import { gameFactories } from '../apps/sobremesa-server/dist/games/engines.js';
import {
  parseAllowedOrigins,
  contentSecurityPolicy,
} from '../apps/sobremesa-server/dist/origins.js';
import { RoomManager } from '../apps/sobremesa-server/dist/RoomManager.js';
import { registerSocketHandlers } from '../apps/sobremesa-server/dist/socketHandlers.js';
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
    const botAction = engine.getBotAction(state, actor);
    if (game.supportsBots === false) assert.equal(botAction, null);
    const action = game.id === 'drawing' ? { type: 'CHOOSE', index: 0 } : botAction;
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
    assert.ok(
      match.act(
        matchActor,
        game.id === 'drawing' ? { type: 'CHOOSE', index: 0 } : match.botAction(matchActor),
      ),
    );
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
    assert.equal(manager.handleAction(code, 'a', { type: 'BID', amount: 10 }).success, true);
    assert.equal(
      room.turnDeadline,
      initialDeadline,
      'Una puja en el mismo milisegundo conserva la marca',
    );
    assert.equal(room.turnDeadline, Date.now() + 15000);
    context.mock.timers.tick(5000);
    assert.equal(manager.handleAction(code, 'b', { type: 'BID', amount: 20 }).success, true);
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
    assert.equal(room.match.state.players.find((p) => p.id === 'b').cash, cash - 20);
    const restored = manager.reconnectPlayer(code, 'b', 'socket-again');
    assert.equal(restored.state.auction, null);
    assert.equal(restored.state.players.find((p) => p.id === 'b').cash, cash - 20);
    assert.ok(room.turnDeadline > deadline);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Una excepción del motor en una acción manual cierra solo su sala y responde sin secretos', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const emitted = [];
  const handlers = new Map();
  const io = {
    to: (code) => ({ emit: (event, payload) => emitted.push({ code, event, payload }) }),
    sockets: { sockets: new Map() },
  };
  const logged = context.mock.method(console, 'error', () => {});
  const factory = gameFactories.tictactoe;
  const runtimes = [];
  context.mock.method(gameFactories, 'tictactoe', () => {
    const runtime = factory();
    runtimes.push(runtime);
    return runtime;
  });
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    const other = manager.createRoom('Clara', 'c', 'socket-c', 'tictactoe').room.code;
    manager.joinRoom(other, 'David', 'd', 'socket-d');
    manager.startGame(code, 'a');
    manager.startGame(other, 'c');
    const room = manager.getRoomBySocket('socket-a');
    const healthy = manager.getRoomBySocket('socket-c');
    const before = structuredClone(healthy.match.state);
    registerSocketHandlers(
      io,
      {
        id: 'socket-a',
        data: { playerId: 'a' },
        emit: (event, payload) => emitted.push({ code: 'socket-a', event, payload }),
        on: (event, handler) => handlers.set(event, handler),
      },
      manager,
      {},
    );
    const results = [];
    const act = (action) => handlers.get('game:action')(action, (result) => results.push(result));
    act({ type: 'MAKE_MOVE', index: -1 });
    assert.deepEqual(results.pop(), {
      success: false,
      error: 'Ese movimiento no está permitido o no es tu turno.',
    });
    assert.equal(manager.getRoomsCount(), 2, 'Las acciones inválidas conservan la sala');
    context.mock.method(runtimes[0].engine, 'applyAction', (state) => {
      state.board[0] = 'X';
      throw new Error('mano-privada-no-publicable');
    });
    emitted.length = 0;
    assert.doesNotThrow(() => act({ type: 'MAKE_MOVE', index: 0 }));
    assert.equal(room.match.state.board[0], 'X', 'El motor alcanzó a mutar su estado');
    assert.deepEqual(results, [
      {
        success: false,
        error: 'No se pudo completar la acción. Comprueba el estado de la sala.',
      },
    ]);
    assert.equal(manager.getRoomsCount(), 1);
    assert.equal(manager.getRoomBySocket('socket-a'), undefined);
    assert.equal(manager.getRoomBySocket('socket-b'), undefined);
    assert.equal(room.turnTimeout, undefined);
    assert.equal(room.turnDeadline, null);
    assert.equal(manager.reconnectPlayer(code, 'a', 'socket-new').success, false);
    assert.equal(
      emitted.filter((event) => event.code === code && event.event === 'room:closed').length,
      1,
    );
    assert.equal(
      emitted.some((event) => event.event === 'game:state_update'),
      false,
    );
    assert.equal(logged.mock.calls.length, 1);
    assert.ok(!JSON.stringify([results, emitted, logged.mock.calls]).includes('mano-privada'));
    assert.deepEqual(healthy.match.state, before);
    assert.equal(manager.handleAction(other, 'c', { type: 'MAKE_MOVE', index: 0 }).success, true);
    context.mock.timers.tick(300000);
    assert.equal(manager.getRoomBySocket('socket-c'), healthy);
    assert.equal(logged.mock.calls.length, 1);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

for (const game of GAME_CATALOG) {
  test(`${game.id}: inicio rechaza identidades repetidas y cantidades fuera del catálogo`, () => {
    const engine = gameFactories[game.id]().engine;
    const players = Array.from({ length: game.maxPlayers + 1 }, (_, i) => ({
      id: `p${i}`,
      isBot: false,
      name: `Persona ${i}`,
    }));
    const duplicated = players.slice(0, game.minPlayers);
    duplicated[1] = { ...duplicated[1], id: duplicated[0].id };
    assert.throws(() => engine.initGame(duplicated));
    assert.throws(() => engine.initGame(players.slice(0, game.minPlayers - 1)));
    assert.throws(() => engine.initGame(players));
    for (const count of new Set([game.minPlayers, game.maxPlayers])) {
      const input = players.slice(0, count);
      const before = structuredClone(input);
      assert.doesNotThrow(() => engine.initGame(input));
      assert.deepEqual(input, before);
    }
  });
}

for (const scenario of [
  ['inicio', 'start'],
  ['inicio', 'actor'],
  ['inicio', 'publicState'],
  ['inicio', 'botId'],
  ['reinicio', 'reset'],
  ['abandono', 'forfeit'],
  ['abandono', 'result'],
  ['finalización', 'result'],
  ['reconexión', 'publicState'],
  ['configuración', 'configureRules'],
]) {
  const [operation, failure] = scenario;
  test(`Fallo de ${failure} durante ${operation}: cierra solo la sala afectada`, (context) => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
    const emitted = [];
    const leaves = [];
    const io = {
      to: (code) => ({ emit: (event, payload) => emitted.push({ code, event, payload }) }),
      sockets: {
        sockets: new Map(
          ['socket-a', 'socket-b', 'socket-new'].map((id) => [
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
      manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
      const room = manager.getRoomBySocket('socket-a');
      const other = manager.createRoom('Clara', 'c', 'socket-c', 'tictactoe').room.code;
      manager.joinRoom(other, 'David', 'd', 'socket-d');
      manager.startGame(other, 'c');
      const healthy = manager.getRoomBySocket('socket-c');
      const before = structuredClone(healthy.match.state);
      if (!['inicio', 'configuración'].includes(operation)) manager.startGame(code, 'a');
      if (operation === 'reinicio' || operation === 'finalización') {
        for (const [id, index] of [
          ['a', 0],
          ['b', 3],
          ['a', 1],
          ['b', 4],
        ])
          assert.equal(manager.handleAction(code, id, { type: 'MAKE_MOVE', index }).success, true);
        if (operation === 'reinicio') {
          manager.handleAction(code, 'a', { type: 'MAKE_MOVE', index: 2 });
          assert.equal(room.status, 'finished');
        }
      }
      if (operation === 'reconexión') manager.handleDisconnect('socket-b');
      const target = failure === 'configureRules' ? room : room.match;
      target[failure] = () => {
        throw new Error('secreto-no-publicable');
      };
      emitted.length = 0;
      let result;
      assert.doesNotThrow(() => {
        if (operation === 'inicio') result = manager.startGame(code, 'a');
        if (operation === 'reinicio') result = manager.restartGame(code, 'a');
        if (operation === 'abandono') manager.leaveRoom('socket-b');
        if (operation === 'finalización')
          result = manager.handleAction(code, 'a', { type: 'MAKE_MOVE', index: 2 });
        if (operation === 'reconexión') result = manager.reconnectPlayer(code, 'b', 'socket-new');
        if (operation === 'configuración')
          result = manager.updateRoomRules(code, 'a', { turnSeconds: 60 });
      });
      if (result) assert.equal(result.success, false);
      assert.equal(manager.getRoomsCount(), 1);
      for (const socket of ['socket-a', 'socket-b', 'socket-new'])
        assert.equal(manager.getRoomBySocket(socket), undefined);
      assert.equal(room.turnTimeout, undefined);
      assert.equal(room.turnDeadline, null);
      assert.equal(room.botLoopTimeout, undefined);
      assert.equal(manager.reconnectPlayer(code, 'a', 'socket-again').success, false);
      assert.equal(emitted.filter((e) => e.event === 'room:closed' && e.code === code).length, 1);
      assert.ok(leaves.some((e) => e.id === 'socket-a' && e.code === code));
      assert.equal(logged.mock.calls.length, 1);
      assert.ok(
        !JSON.stringify([emitted, logged.mock.calls, result]).includes('secreto-no-publicable'),
      );
      assert.deepEqual(healthy.match.state, before);
      context.mock.timers.tick(300000);
      assert.equal(manager.getRoomBySocket('socket-c'), healthy);
      assert.notDeepEqual(healthy.match.state, before);
      assert.equal(logged.mock.calls.length, 1);
    } finally {
      manager.dispose();
      context.mock.timers.reset();
    }
  });
}

test('Cambio de Color: opciones compartidas conservan valores, tipos, aislamiento y reparto', () => {
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const other = manager.createRoom('Clara', 'c', 'socket-c', 'colorclash').room;
    for (const count of [5, 7, 9]) {
      const room = manager.createRoom('Ana', 'a', 'socket-a', 'colorclash').room;
      manager.joinRoom(room.code, 'Bruno', 'b', 'socket-b');
      assert.equal(manager.updateRoomRules(room.code, 'a', { startingCards: count }).success, true);
      for (const invalid of [4, 6, 8, 10, '7', true, null, [], {}]) {
        assert.equal(
          manager.updateRoomRules(room.code, 'a', { startingCards: invalid }).success,
          false,
        );
        assert.equal(manager.getRoomBySocket('socket-a').customRules.startingCards, count);
      }
      assert.equal(manager.getRoomBySocket('socket-c').customRules.startingCards, 7);
      manager.startGame(room.code, 'a');
      assert.equal(manager.getRoomBySocket('socket-a').match.publicState('a').myHand.length, count);
      manager.leaveRoom('socket-a');
      manager.leaveRoom('socket-b');
    }
    assert.equal(manager.getRoomBySocket('socket-c').code, other.code);
  } finally {
    manager.dispose();
  }
});

test('Parchís: capturar conserva el reloj del movimiento y el plazo completa el premio pendiente', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'parchis').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a'),
      deadline = room.turnDeadline,
      s = room.match.state;
    s.phase = 'move';
    s.steps = 1;
    s.lastRoll = 1;
    s.players[0].pawns[0] = 0;
    s.players[1].pawns[0] = 35;
    context.mock.timers.tick(10000);
    assert.equal(manager.handleAction(code, 'a', { type: 'MOVE', pawn: 0 }).success, true);
    assert.equal(room.match.state.steps, 20);
    assert.equal(room.match.state.bonus, true);
    assert.equal(room.turnDeadline, deadline, 'La captura no concede otro presupuesto');
    context.mock.timers.tick(20000);
    assert.equal(room.match.state.players[0].pawns[0], 21);
    assert.equal(room.match.state.currentTurnPlayerId, 'b');
    assert.equal(room.match.state.bonus, false);
    assert.equal(room.match.state.phase, 'roll');
    assert.ok(room.turnDeadline > Date.now());
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Parchís: tres seises sin poder salir no bloquean un turno automático', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  context.mock.method(Math, 'random', () => 0.99);
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'parchis').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    context.mock.timers.tick(30000);
    const room = manager.getRoomBySocket('socket-a');
    assert.equal(room.match.state.currentTurnPlayerId, 'b');
    assert.equal(room.match.state.rollCount, 3);
    assert.equal(room.match.state.sixes, 0);
    assert.equal(room.status, 'in_game');
    assert.ok(room.turnDeadline > Date.now());
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Go: marcar un grupo no renueva el reloj y un timeout de revisión reanuda sin aceptar', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'go').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    for (const [id, action] of [
      ['a', { type: 'PLACE', index: 0 }],
      ['b', { type: 'PLACE', index: 20 }],
      ['a', { type: 'PASS' }],
      ['b', { type: 'PASS' }],
    ])
      assert.equal(manager.handleAction(code, id, action).success, true);
    const room = manager.getRoomBySocket('socket-a'),
      deadline = room.turnDeadline;
    context.mock.timers.tick(10000);
    manager.handleAction(code, 'a', { type: 'MARK_DEAD', index: 0 });
    assert.equal(room.turnDeadline, deadline);
    manager.handleAction(code, 'a', { type: 'ACCEPT_SCORE' });
    assert.equal(room.match.state.phase, 'score');
    assert.deepEqual(room.match.state.accepted, ['a']);
    context.mock.timers.tick(30000);
    assert.equal(room.match.state.phase, 'play');
    assert.equal(room.match.state.currentTurnPlayerId, 'a');
    assert.equal(room.match.state.board[0], 1);
    assert.equal(room.match.state.winner, null);
    assert.deepEqual(room.match.state.accepted, []);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Damas chinas: cinco participantes no cierran la sala y seis pueden empezar', () => {
  const manager = new RoomManager({
    to: () => ({ emit: () => {} }),
    sockets: { sockets: new Map() },
  });
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'chinesecheckers').room.code;
    for (let n = 0; n < 4; n++) assert.equal(manager.addBot(code, 'a').success, true);
    const result = manager.startGame(code, 'a');
    assert.equal(result.success, false);
    assert.equal(manager.getRoomBySocket('socket-a').status, 'waiting');
    assert.equal(manager.getRoomBySocket('socket-a').players.length, 5);
    assert.equal(manager.addBot(code, 'a').success, true);
    assert.equal(manager.startGame(code, 'a').success, true);
    assert.equal(manager.getRoomBySocket('socket-a').status, 'in_game');
  } finally {
    manager.dispose();
  }
});

test('Mahjong: reclamaciones de ocho segundos y robar no renueva el presupuesto del descarte', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({
    to: () => ({ emit: () => {} }),
    sockets: { sockets: new Map() },
  });
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'mahjong').room.code;
    for (const id of ['b', 'c', 'd']) manager.joinRoom(code, id, id, `socket-${id}`);
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    const discard = room.match.publicState('a').legalActions.find((a) => a.type === 'DISCARD');
    context.mock.timers.tick(5000);
    assert.equal(manager.handleAction(code, 'a', discard).success, true);
    assert.equal(room.turnDeadline, Date.now() + 8000);
    for (const expected of ['c', 'd']) {
      context.mock.timers.tick(8000);
      assert.equal(room.match.state.currentTurnPlayerId, expected);
      assert.equal(room.match.state.phase, 'claim');
      assert.equal(room.turnDeadline, Date.now() + 8000);
    }
    context.mock.timers.tick(8000);
    assert.equal(room.match.state.phase, 'draw');
    assert.equal(room.match.state.currentTurnPlayerId, 'b');
    const deadline = room.turnDeadline;
    context.mock.timers.tick(5000);
    assert.equal(manager.handleAction(code, 'b', { type: 'DRAW' }).success, true);
    assert.equal(room.turnDeadline, deadline);
    assert.equal(room.match.state.players[1].hand.length, 14);
    context.mock.timers.tick(deadline - Date.now());
    assert.ok(['claim', 'finished'].includes(room.match.state.phase));
    assert.ok(room.match.state.revision >= 6);
    assert.equal('responses' in room.match.publicState('a'), false);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Dibujo: una sala sin bots, límites de trazos y respuestas que no renuevan el reloj', () => {
  const runtime = gameFactories.drawing(),
    match = runtime.createMatch();
  match.start([
    { id: 'a', isBot: false },
    { id: 'b', isBot: false },
    { id: 'c', isBot: false },
  ]);
  assert.equal(match.timeoutSeconds(), 20);
  assert.equal(match.botAction('a'), null);
  assert.equal(match.act('a', { type: 'CHOOSE', index: 0 }).completed, true);
  assert.equal(match.timeoutSeconds(), 60);
  const stroke = {
    points: [
      [0, 0],
      [1000, 1000],
    ],
    color: 0,
    width: 5,
  };
  assert.equal(match.act('a', { type: 'STROKE', stroke }).completed, false);
  assert.equal(match.act('b', { type: 'GUESS', text: 'incorrecta' }).completed, false);
  assert.equal(match.act('c', { type: 'STROKE', stroke }), null);
  assert.equal(match.timeoutStep('a').continue, false);
  assert.equal(match.timeoutSeconds(), 8);
  assert.ok(match.publicState('c').word);
});
test('Diccionarios locales y banco propio: cobertura bilingüe, soluciones solo en el servidor', () => {
  for (const language of [0, 1]) {
    const runtime = gameFactories.words();
    runtime.configureRules({ wordLanguage: language });
    const match = runtime.createMatch();
    match.start([
      { id: 'a', isBot: false },
      { id: 'b', isBot: true },
    ]);
    assert.equal(match.publicState('a').language, language ? 'en' : 'es');
    assert.ok(match.botAction('a'));
    assert.equal('bag' in match.publicState('a'), false);
  }
  const quiz = gameFactories.quiz().createMatch();
  quiz.start([
    { id: 'a', isBot: false },
    { id: 'b', isBot: false },
  ]);
  assert.equal(quiz.publicState('b').question.answer, null);
  assert.equal(quiz.timeoutStep('a').continue, false);
  assert.notEqual(quiz.publicState('b').question.answer, null);
});

test('Impostor presencial: rechaza bots y conserva el moderador autorizado al migrar a un humano conectado', () => {
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } },
    manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'impostor').room.code;
    for (const id of ['b', 'c', 'd']) manager.joinRoom(code, id, id, `socket-${id}`);
    manager.updateRoomRules(code, 'a', { impostorMode: 1, physicalVoting: 1 });
    assert.equal(manager.addBot(code, 'a').success, false);
    assert.equal(manager.startGame(code, 'a').success, true);
    const room = manager.getRoomBySocket('socket-a');
    room.match.state.impostorId = 'd';
    manager.handleDisconnect('socket-b');
    manager.leaveRoom('socket-a');
    assert.equal(room.hostId, 'c');
    assert.equal(room.match.state.moderatorId, 'c');
    assert.equal(manager.getRoomBySocket('socket-c'), room);
  } finally {
    manager.dispose();
  }
});

test('Palabras: partidas completas con los dos diccionarios de producción y conservación de letras', () => {
  for (const wordLanguage of [0, 1]) {
    const { engine } = gameFactories.words();
    engine.setRules({ wordLanguage });
    let state = engine.initGame([
        { id: 'a', isBot: true },
        { id: 'b', isBot: true },
      ]),
      steps = 0,
      placements = 0;
    const letters = state.bag.length + state.players.reduce((sum, p) => sum + p.hand.length, 0);
    while (!state.winner && steps++ < 1000) {
      const action = engine.getBotAction(state, state.currentTurnPlayerId);
      assert.ok(action);
      assert.ok(engine.validateAction(state, state.currentTurnPlayerId, action));
      if (action.type === 'PLACE') placements++;
      state = engine.applyAction(state, state.currentTurnPlayerId, action);
      assert.equal(
        state.bag.length +
          state.players.reduce((sum, p) => sum + p.hand.length, 0) +
          state.board.filter(Boolean).length,
        letters,
      );
    }
    assert.ok(state.winner);
    assert.ok(placements > 0);
  }
});
