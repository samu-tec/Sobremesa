import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CATALOG, createDeck } from '../packages/sobremesa-logic/dist/index.js';
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

test('Contrato, aislamiento y acciones de los treinta motores', () => {
  for (const game of GAME_CATALOG) {
    {
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
    }
  }
});

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
    manager.getRoomBySocket('socket-a').match.requiresPlayerAction = () => false; // Exercise automatic work without human activity.
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

test('La jugada de autoplay no renueva la actividad humana de la sala', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    const activityAtStart = room.lastActivity;
    const unattended = room.match.actor();
    context.mock.timers.tick(1000);

    manager.startAutoPlay(room, 'timeout', unattended);

    assert.equal(room.match.state.board.filter(Boolean).length, 1, 'el bot sí aplicó su jugada');
    assert.equal(
      room.lastActivity,
      activityAtStart,
      'el movimiento automático no cuenta como presencia',
    );
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
      if (
        room.match.actor() === actor &&
        room.match.requiresPlayerAction() &&
        room.match.timeoutSeconds() === null
      )
        assert.equal(
          room.inactivityConfirmation?.playerId,
          actor,
          `${game}: no pidió confirmación de actividad`,
        );
      assert.equal(
        room.players.some((p) => p.id === actor),
        true,
        `${game}: retirado pronto`,
      );
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
      healthy.match.requiresPlayerAction = () => false; // Isolate automatic failure handling from the turn policy.
      const healthyBefore = structuredClone(healthy.match.state);
      if (failure === 'botAction') {
        assert.equal(
          manager.handleAction(code, 'a', { type: 'MAKE_MOVE', index: 0 }).success,
          true,
        );
      }
      room.match.requiresPlayerAction = () => false; // Force the deadline path under test.
      room.match[failure] = () => {
        throw new Error('mano-secreta-no-publicable');
      };
      if (failure === 'forfeit') manager.handleDisconnect('socket-b');
      emitted.length = 0;
      assert.doesNotThrow(() => context.mock.timers.tick(30000));
      if (failure === 'forfeit') {
        room.autoPlay.get('b').awaitingHost = true;
        assert.doesNotThrow(() => manager.resolveAutoPlay(code, 'a', 'b', 'remove'));
      }
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

test('La reconexión recupera el control automático y una desconexión antigua no afecta al sustituto', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  const manager = new RoomManager(io);
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    manager.handleDisconnect('socket-a');
    const lastHumanActivity = room.lastActivity;
    assert.ok(room.autoPlay.has('a'));
    context.mock.timers.tick(1000);
    assert.equal(room.lastActivity, lastHumanActivity, 'desconectarse no cuenta como actividad');
    const restored = manager.reconnectPlayer(code, 'a', 'socket-new');
    assert.equal(restored.success, true);
    assert.deepEqual(restored.state, {
      ...room.match.publicState('a'),
      gameType: room.gameType,
      matchId: room.matchId,
    });
    assert.equal(room.players[0].disconnectTimeout, undefined);
    assert.equal(
      room.lastActivity,
      lastHumanActivity,
      'reconectarse automáticamente no renueva la sala',
    );
    manager.handleDisconnect('socket-a'); // La conexión antigua ya fue sustituida.
    assert.equal(room.players[0].connected, true);
    manager.handleDisconnect('socket-new');
    assert.equal(
      room.lastActivity,
      lastHumanActivity,
      'una desconexión posterior tampoco renueva la sala',
    );
    assert.ok(room.autoPlay.has('a'), 'La conexión actual activa el modo automático');
    assert.equal(manager.reconnectPlayer(code, 'a', 'socket-newer').success, true);
    assert.equal(room.autoPlay.has('a'), false, 'Al volver recupera el control');
    assert.equal(manager.getRoomBySocket('socket-newer'), room);
    assert.equal(room.players.length, 2, 'La reserva cancelada no expulsa al jugador recuperado');
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Una acción humana válida recupera el control tras autoplay por inactividad', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 5 });
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    const unattended = room.match.actor();
    const other = unattended === 'a' ? 'b' : 'a';
    context.mock.timers.tick(room.turnDeadline - Date.now());
    assert.equal(room.inactivityConfirmation?.playerId, unattended);
    context.mock.timers.tick(20000);
    assert.equal(room.autoPlay.get(unattended)?.mode, 'timeout');
    assert.equal(room.match.actor(), other, 'el bot completó la jugada que venció');

    const nextMove = () => room.match.state.board.findIndex((cell) => cell === null);
    assert.equal(
      manager.handleAction(code, other, { type: 'MAKE_MOVE', index: nextMove() }).success,
      true,
    );
    assert.equal(room.match.actor(), unattended, 'el turno regresa al jugador');
    assert.ok(room.botLoopTimeout, 'el bot estaba preparado para actuar en su turno');

    const player = room.players.find((candidate) => candidate.id === unattended);
    const socketAction = (socketId) => {
      const handlers = new Map();
      registerSocketHandlers(
        {},
        {
          id: socketId,
          data: { playerId: unattended },
          emit() {},
          on: (event, handler) => handlers.set(event, handler),
        },
        manager,
        {},
      );
      return (action, matchId = room.matchId) => {
        let result;
        handlers.get('game:action')({ matchId, action }, (response) => {
          result = response;
        });
        return result;
      };
    };
    const currentAction = socketAction(player.socketId);
    assert.equal(
      currentAction({ type: 'MAKE_MOVE', index: nextMove() }, 'partida-antigua').success,
      false,
      'una acción de otro matchId no recupera la plaza',
    );
    assert.equal(room.autoPlay.has(unattended), true);
    assert.equal(
      currentAction({
        type: 'MAKE_MOVE',
        index: -1,
      }).success,
      false,
      'una acción inválida no acredita que la persona haya vuelto',
    );
    assert.equal(room.autoPlay.has(unattended), true);
    assert.equal(
      socketAction('socket-antiguo')({
        type: 'MAKE_MOVE',
        index: nextMove(),
      }).success,
      false,
      'un socket que ya no controla la plaza no puede recuperarla',
    );
    const movesBeforeHumanAction = room.match.state.board.filter(Boolean).length;
    const activityBeforeHumanAction = room.lastActivity;
    context.mock.timers.tick(1);
    assert.equal(currentAction({ type: 'MAKE_MOVE', index: nextMove() }).success, true);
    assert.equal(room.match.state.board.filter(Boolean).length, movesBeforeHumanAction + 1);
    assert.ok(room.lastActivity > activityBeforeHumanAction, 'la jugada humana renueva actividad');
    assert.equal(room.autoPlay.has(unattended), false, 'la acción humana recupera el control');
    assert.equal(room.botLoopTimeout, undefined, 'se invalida el turno automático pendiente');
    assert.equal(
      manager.resolveAutoPlay(code, room.hostId, unattended, 'remove').success,
      false,
      'una resolución antigua del anfitrión ya no puede retirar al jugador',
    );
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Volver a jugar recupera el control fuera de turno y cancela una revisión obsoleta', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const emitted = [];
  const manager = new RoomManager({
    to: (code) => ({ emit: (event, payload) => emitted.push({ code, event, payload }) }),
    sockets: { sockets: new Map() },
  });
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    const returningPlayer = room.match.actor();
    const originalSocket = room.players.find((player) => player.id === returningPlayer).socketId;
    manager.startAutoPlay(room, 'timeout', returningPlayer);
    const entry = room.autoPlay.get(returningPlayer);
    entry.awaitingHost = true;
    entry.deadline = Date.now() + 60000;
    assert.notEqual(room.match.actor(), returningPlayer, 'el turno ya pasó a otra persona');
    const actorBefore = room.match.actor();
    const boardBefore = structuredClone(room.match.state.board);
    const turnDeadlineBefore = room.turnDeadline;
    const activityBefore = room.lastActivity;
    context.mock.timers.tick(1000);

    const createHandler = (socketId, sessionPlayerId = returningPlayer) => {
      const handlers = new Map();
      registerSocketHandlers(
        {},
        {
          id: socketId,
          data: { playerId: sessionPlayerId },
          emit() {},
          on: (event, handler) => handlers.set(event, handler),
        },
        manager,
        {},
      );
      return (matchId = room.matchId) => {
        let result;
        handlers.get('room:resume_play')({ matchId }, (response) => (result = response));
        return result;
      };
    };
    const resume = createHandler(originalSocket);

    assert.equal(resume('partida-antigua').success, false, 'rechaza un matchId obsoleto');
    assert.equal(room.lastActivity, activityBefore, 'una petición antigua no renueva actividad');
    const other = room.players.find((player) => player.id !== returningPlayer);
    assert.equal(
      createHandler(other.socketId, other.id)().success,
      false,
      'otro participante no puede recuperar una plaza ajena',
    );
    assert.equal(resume().success, true);
    assert.equal(room.autoPlay.has(returningPlayer), false);
    assert.equal(room.match.actor(), actorBefore, 'no cambia el turno');
    assert.deepEqual(room.match.state.board, boardBefore, 'no ejecuta ni revierte jugadas');
    assert.equal(room.turnDeadline, turnDeadlineBefore, 'no reinicia el reloj de otra persona');
    assert.ok(
      room.lastActivity > activityBefore,
      'la recuperación humana sí cuenta como actividad',
    );
    assert.equal(resume().success, false, 'rechaza la recuperación duplicada');
    assert.equal(createHandler('socket-antiguo')().success, false, 'rechaza una sesión sustituida');
    assert.equal(
      manager.resolveAutoPlay(code, room.hostId, returningPlayer, 'remove').success,
      false,
      'la revisión antigua del anfitrión ya no puede retirar a quien volvió',
    );
    assert.ok(
      emitted.some((event) => event.code === code && event.event === 'room:updated'),
      'publica el estado de sala actualizado',
    );
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Volver a jugar en el turno propio cancela el bot pendiente y rearma un plazo finito', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    const returningPlayer = room.match.actor();
    const other = returningPlayer === 'a' ? 'b' : 'a';
    const returningSocket = room.players.find((player) => player.id === returningPlayer).socketId;
    const otherSocket = room.players.find((player) => player.id === other).socketId;
    manager.startAutoPlay(room, 'timeout', returningPlayer);
    const entry = room.autoPlay.get(returningPlayer);
    entry.permanent = true;
    entry.awaitingHost = false;
    const actionIndex = room.match.state.board.findIndex((cell) => cell === null);
    assert.equal(
      manager.handlePlayerAction(code, other, otherSocket, {
        type: 'MAKE_MOVE',
        index: actionIndex,
      }).success,
      true,
    );
    assert.equal(room.match.actor(), returningPlayer);
    assert.ok(room.botLoopTimeout, 'hay una jugada automática pendiente');
    const boardBeforeResume = structuredClone(room.match.state.board);
    context.mock.timers.tick(1);

    assert.equal(
      manager.resumePlayerControl(code, returningPlayer, returningSocket, room.matchId).success,
      true,
    );
    assert.deepEqual(
      room.match.state.board,
      boardBeforeResume,
      'recuperar no juega por la persona',
    );
    assert.equal(room.match.actor(), returningPlayer);
    assert.equal(room.autoPlay.has(returningPlayer), false);
    assert.equal(room.botLoopTimeout, undefined, 'se cancela la acción automática en cola');
    assert.ok(room.turnDeadline > Date.now(), 'el jugador vuelve con tiempo para actuar');
    assert.ok(room.turnDeadline <= Date.now() + room.turnSeconds * 1000);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('El anfitrión puede retirar de inmediato a un humano desconectado durante la partida', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const code = manager.createRoom('Ana', 'a', 'socket-a', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'socket-b');
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    manager.handleDisconnect('socket-b');
    assert.equal(room.players[1].connected, false);
    assert.ok(room.autoPlay.has('b'));

    assert.equal(manager.removeHuman(code, 'a', 'b').success, true);
    assert.equal(room.autoPlay.has('b'), false, 'cancela el autoplay de la plaza retirada');
    assert.equal(
      room.players.some((player) => player.id === 'b'),
      false,
    );
    assert.equal(room.status, 'finished', 'el motor resuelve el abandono y la victoria');
    assert.equal(room.match.state.winner, 'a');
    assert.equal(manager.reconnectPlayer(code, 'b', 'socket-b-returned').success, false);
    context.mock.timers.tick(4 * 60 * 1000);
    assert.equal(
      room.players.some((player) => player.id === 'b'),
      false,
      'el temporizador antiguo no resucita la plaza',
    );
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
    const act = (action) =>
      handlers.get('game:action')({ matchId: room.matchId, action }, (result) =>
        results.push(result),
      );
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

test('Participantes válidos y rechazo de identidades duplicadas en los treinta motores', () => {
  for (const game of GAME_CATALOG) {
    {
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
    }
  }
});

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
      healthy.match.requiresPlayerAction = () => false; // Isolate automatic failure handling from the presence policy.
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
    manager.getRoomBySocket('socket-a').match.requiresPlayerAction = () => false; // Explicit automatic actor fixture.
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
    manager.getRoomBySocket('socket-a').match.requiresPlayerAction = () => false; // Explicit automatic actor fixture.
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

test('Mahjong: reclamaciones de ocho segundos y la inactividad pide confirmación tras la jugada', (context) => {
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
    assert.equal(room.inactivityConfirmation?.playerId, 'b');
    assert.equal(room.autoPlay.has('b'), false);
    assert.equal(
      manager.respondToInactivity(
        code,
        'b',
        'socket-b',
        room.matchId,
        room.inactivityConfirmation.promptId,
        'continue',
      ).success,
      true,
    );
    context.mock.timers.tick(room.turnDeadline - Date.now());
    assert.equal(room.autoPlay.get('b')?.mode, 'timeout');
    assert.equal(
      room.players.some((p) => p.id === 'b'),
      true,
    );
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

function prepareColorRoom(manager, count = 4, stacking = true, bot = false, jumpIn = false) {
  const code = manager.createRoom('Ana', 'a', 'socket-a', 'colorclash').room.code;
  const ids = ['a', 'b', 'c', 'd'].slice(0, count);
  if (bot) manager.addBot(code, 'a');
  else for (const id of ids.slice(1)) manager.joinRoom(code, id, id, `socket-${id}`);
  manager.updateRoomRules(code, 'a', { stackDrawCards: stacking, jumpIn, turnSeconds: 30 });
  manager.startGame(code, 'a');
  const room = manager.getRoomBySocket('socket-a');
  const state = room.match.state;
  const pool = createDeck();
  const take = (value, color) =>
    pool.splice(
      pool.findIndex((c) => c.value === value && c.color === color),
      1,
    )[0];
  state.currentTurnPlayerId = 'a';
  state.activeColor = 'red';
  state.discardPile = [take('5', 'red')];
  state.players.forEach((p, index) => {
    p.cards = [take('1', ['red', 'blue', 'green', 'yellow'][index])];
  });
  state.drawPile = pool;
  return { code, room, state, take };
}

test('Cambio de Color: acumulación solo configura el anfitrión, con booleanos y aislamiento', () => {
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const a = manager.createRoom('Ana', 'a', 'socket-a', 'colorclash').room;
    const other = manager.createRoom('Clara', 'c', 'socket-c', 'colorclash').room;
    manager.joinRoom(a.code, 'Bruno', 'b', 'socket-b');
    assert.equal(a.customRules.stackDrawCards, false);
    assert.equal(a.customRules.jumpIn, false);
    assert.throws(
      () => manager.updateRoomRules(a.code, 'b', { stackDrawCards: true }),
      /anfitrión/,
    );
    for (const invalid of [1, 0, 'true', null, [], {}])
      assert.equal(
        manager.updateRoomRules(a.code, 'a', { stackDrawCards: invalid }).success,
        false,
      );
    for (const invalid of [1, null, 'true'])
      assert.equal(manager.updateRoomRules(a.code, 'a', { jumpIn: invalid }).success, false);
    assert.equal(
      manager.updateRoomRules(a.code, 'a', { stackDrawCards: true, jumpIn: true }).success,
      true,
    );
    assert.equal(manager.getRoomBySocket('socket-c').customRules.stackDrawCards, false);
    assert.equal(manager.getRoomBySocket('socket-c').customRules.jumpIn, false);
    manager.startGame(a.code, 'a');
    const room = manager.getRoomBySocket('socket-a');
    assert.equal(room.match.publicState('a').stackDrawCards, true);
    assert.equal(room.match.publicState('a').jumpInEnabled, true);
    assert.throws(() => manager.updateRoomRules(a.code, 'a', { stackDrawCards: false }), /momento/);
    room.match.state.winner = 'a';
    room.status = 'finished';
    assert.equal(manager.restartGame(a.code, 'a').success, true);
    manager.startGame(a.code, 'a');
    assert.equal(room.match.publicState('a').stackDrawCards, true);
    assert.deepEqual(room.match.publicState('a').playerOrder, ['b', 'a']);
    assert.equal(manager.getRoomBySocket('socket-c').code, other.code);
  } finally {
    manager.dispose();
  }
});

test('Ciudad Fortuna: las nuevas reglas de casa validan booleanos y llegan a la partida', () => {
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const room = manager.createRoom('Ana', 'a', 'socket-a', 'monopoly').room;
    for (const invalid of [1, null, 'true']) {
      assert.equal(
        manager.updateRoomRules(room.code, 'a', { doubleGoSalaryOnPass: invalid }).success,
        false,
      );
      assert.equal(
        manager.updateRoomRules(room.code, 'a', { snakeEyesBonus: invalid }).success,
        false,
      );
    }
    assert.equal(
      manager.updateRoomRules(room.code, 'a', {
        doubleGoSalaryOnPass: true,
        snakeEyesBonus: true,
      }).success,
      true,
    );
    manager.addBot(room.code, 'a');
    assert.equal(manager.startGame(room.code, 'a').success, true);
    const state = manager.getRoomBySocket('socket-a').match.state;
    assert.equal(state.customRules.doubleGoSalaryOnPass, true);
    assert.equal(state.customRules.snakeEyesBonus, true);
  } finally {
    manager.dispose();
  }
});

test('Cambio de Color: Jump-In acepta una segunda acción idéntica y resuelve su ventana en servidor', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const { room, code, state, take } = prepareColorRoom(manager, 4, false, false, true);
    const first = take('draw2', 'red');
    const second = take('draw2', 'red');
    state.players[0].cards.push(first);
    state.players[2].cards.push(second);

    assert.equal(
      manager.handleAction(code, 'a', { type: 'PLAY_CARD', cardId: first.id }).success,
      true,
    );
    assert.equal(room.match.timeoutSeconds(), 1.5);
    assert.equal(room.match.state.pendingDraw, 2);
    assert.equal(
      manager.handleAction(code, 'c', { type: 'PLAY_CARD', cardId: second.id }).success,
      true,
    );
    assert.equal(
      room.match.state.pendingDraw,
      2,
      'la segunda carta vuelve a aplicar solo su propio +2',
    );
    assert.equal(room.match.state.currentTurnPlayerId, 'd');
    context.mock.timers.tick(1500);
    assert.equal(room.match.state.jumpInWindow, false);
    assert.equal(room.match.state.pendingDraw, 0);
    assert.equal(room.match.state.players.find((p) => p.playerId === 'd').cards.length, 3);
    assert.equal(room.match.state.currentTurnPlayerId, 'a');
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Cambio de Color: el autoplay resuelve una cadena mixta y respeta dirección y privacidad', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const { room, code, state, take } = prepareColorRoom(manager);
    state.turnDirection = -1;
    const first = take('wild_draw4', 'wild'),
      second = take('draw2', 'blue');
    state.players[0].cards.push(first);
    state.players[3].cards.push(second);
    assert.equal(
      manager.handleAction(code, 'a', { type: 'PLAY_CARD', cardId: first.id, chosenColor: 'green' })
        .success,
      true,
    );
    assert.equal(room.match.state.currentTurnPlayerId, 'd');
    assert.equal(
      manager.handleAction(code, 'd', { type: 'PLAY_CARD', cardId: second.id }).success,
      true,
    );
    assert.equal(room.match.state.pendingDraw, 6);
    assert.equal(manager.handleAction(code, 'c', { type: 'PASS_TURN' }).success, false);
    assert.equal(
      manager.handleAction(code, 'c', {
        type: 'PLAY_CARD',
        cardId: room.match.state.players[2].cards[0].id,
      }).success,
      false,
    );
    const savedDeadline = room.turnDeadline;
    const recovered = manager.reconnectPlayer(code, 'c', 'socket-c-new');
    assert.equal(recovered.state.pendingDraw, 6);
    assert.equal(recovered.room.turnDeadline, savedDeadline);
    assert.equal('drawPile' in recovered.state, false);
    assert.ok(recovered.state.opponents.every((p) => !('cards' in p)));
    context.mock.timers.tick(30000);
    assert.equal(room.inactivityConfirmation?.playerId, 'c');
    context.mock.timers.tick(20000);
    assert.equal(room.match.state.pendingDraw, 0);
    assert.equal(room.match.state.players[2].cards.length, 7);
    assert.equal(room.match.state.currentTurnPlayerId, 'b');
    assert.ok(room.turnDeadline > Date.now());
    context.mock.timers.tick(1000);
    assert.equal(room.match.state.players[2].cards.length, 7);
    assert.equal(manager.handleAction(code, 'c', { type: 'DRAW_CARD' }).success, false);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Cambio de Color: desconectar activa el bot, reconectar conserva la partida y el siguiente bot responde', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const { room, code, state, take } = prepareColorRoom(manager, 3);
    const penalty = take('draw2', 'red');
    state.players[0].cards.push(penalty);
    manager.handleAction(code, 'a', { type: 'PLAY_CARD', cardId: penalty.id });
    manager.handleDisconnect('socket-b');
    assert.equal(room.match.state.currentTurnPlayerId, 'c');
    assert.equal(room.match.state.pendingDraw, 0);
    assert.equal(room.match.state.players.find((p) => p.playerId === 'b').cards.length, 3);
    assert.equal(manager.reconnectPlayer(code, 'b', 'socket-b-new').state.pendingDraw, 0);
    manager.leaveRoom('socket-b-new');
    assert.equal(room.match.state.currentTurnPlayerId, 'c');
    assert.equal(room.match.state.pendingDraw, 0);
    assert.deepEqual(room.match.publicState('c').playerOrder, ['a', 'c']);
    const second = room.match.state.drawPile.find((c) => c.value === 'wild_draw4');
    room.match.state.drawPile = room.match.state.drawPile.filter((c) => c.id !== second.id);
    room.match.state.players[1].cards.push(second);
    const botAction = room.match.botAction('c');
    assert.equal(botAction.cardId, second.id);
    assert.equal(manager.handleAction(code, 'c', botAction).success, true);
    assert.equal(room.match.state.pendingDraw, 4);
    manager.leaveRoom('socket-a');
    assert.equal(room.status, 'finished');
    assert.equal(room.match.state.pendingDraw, 0);
    assert.equal(room.match.state.winner, 'c');
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Cambio de Color: un bot programado responde con +4 a un +2 y devuelve el turno al humano', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const { room, code, state, take } = prepareColorRoom(manager, 2, true, true);
    const first = take('draw2', 'red'),
      second = take('wild_draw4', 'wild');
    state.players[0].cards.push(first);
    state.players[1].cards.push(second);
    const botId = state.players[1].playerId;
    assert.equal(
      manager.handleAction(code, 'a', { type: 'PLAY_CARD', cardId: first.id }).success,
      true,
    );
    assert.equal(room.match.state.pendingDraw, 2);
    assert.equal(room.match.state.currentTurnPlayerId, botId);
    // The configured thinking delay is at most ten seconds; the human clock is thirty.
    context.mock.timers.tick(10001);
    assert.equal(room.match.state.pendingDraw, 6);
    assert.equal(room.match.state.currentTurnPlayerId, 'a');
    assert.equal(room.match.state.players[1].cards.length, 1);
    assert.equal(manager.handleAction(code, 'a', { type: 'DRAW_CARD' }).success, true);
    assert.equal(room.match.state.pendingDraw, 0);
    assert.equal(room.match.state.players[0].cards.length, 7);
    assert.equal(room.match.state.currentTurnPlayerId, botId);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('El grupo cambia de motor y recupera reglas y reloj propios sin perder plazas ni conexiones', () => {
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const { code } = manager.createRoom('Ana', 'a', 'sa', 'colorclash').room;
    manager.joinRoom(code, 'Bruno', 'b', 'sb');
    manager.addBot(code, 'a');
    const room = manager.getRoomBySocket('sa');
    const players = room.players.map((p) => ({ ...p }));
    const original = room.match;
    const epoch = room.matchId;
    assert.equal(
      manager.updateRoomRules(code, 'a', { stackDrawCards: true, turnSeconds: 30 }).success,
      true,
    );
    assert.equal(manager.changeGame(code, 'b', 'chess').success, false);
    assert.equal(manager.changeGame(code, 'a', 'unknown').success, false);
    assert.equal(manager.changeGame(code, 'a', 'chess').success, true);
    assert.notEqual(room.match, original);
    assert.notEqual(room.matchId, epoch);
    assert.deepEqual(room.players, players);
    assert.equal(room.hostId, 'a');
    assert.equal(room.code, code);
    assert.equal(room.turnSeconds, 90);
    assert.equal(room.customRules.stackDrawCards, undefined);
    assert.equal(
      manager.startGame(code, 'a').success,
      false,
      'Tres participantes no caben en ajedrez',
    );
    assert.equal(manager.changeGame(code, 'a', 'drawing').success, true);
    assert.equal(
      manager.startGame(code, 'a').success,
      false,
      'No se convierten ni eliminan bots de forma automática',
    );
    assert.equal(manager.changeGame(code, 'a', 'colorclash').success, true);
    assert.equal(room.customRules.stackDrawCards, true);
    assert.equal(room.turnSeconds, 30);
    assert.equal(room.match.publicState('a'), null);
    assert.equal(manager.startGame(code, 'a').success, true);
    const startedEpoch = room.matchId;
    assert.equal(manager.changeGame(code, 'a', 'pig').success, false);
    assert.equal(room.matchId, startedEpoch);
    assert.equal(room.gameType, 'colorclash');
  } finally {
    manager.dispose();
  }
});

test('Retirar personas valida anfitrión, elimina reservas y aplica el abandono sin expulsar conectados en juego', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const sent = [];
  const sockets = new Map([
    [
      'sb',
      {
        data: { roomCode: '' },
        leave: (code) => sent.push(['leave', code]),
        emit: (...args) => sent.push(args),
      },
    ],
  ]);
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets } });
  try {
    const botCode = manager.createRoom('BotHost', 'bot-host', 'bot-host-socket', 'tictactoe').room
      .code;
    manager.addBot(botCode, 'bot-host');
    const botId = manager
      .getRoomBySocket('bot-host-socket')
      .players.find((player) => player.isBot).id;
    assert.equal(manager.removeHuman(botCode, 'bot-host', botId).success, false);
    const { code } = manager.createRoom('Ana', 'a', 'sa', 'tictactoe').room;
    manager.joinRoom(code, 'Bruno', 'b', 'sb');
    assert.equal(manager.removeHuman(code, 'b', 'a').success, false);
    assert.equal(manager.removeHuman(code, 'a', 'a').success, false);
    assert.equal(manager.removeHuman(code, 'a', 'missing').success, false);
    assert.equal(manager.removeHuman(code, 'a', 'b').success, true);
    assert.ok(sent.some(([event]) => event === 'room:removed'));
    assert.equal(manager.getRoomBySocket('sb'), undefined);
    assert.equal(manager.reconnectPlayer(code, 'b', 'new-b').success, false);
    assert.equal(manager.joinRoom(code, 'Bruno', 'b', 'sb').success, true);
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('sa');
    assert.equal(manager.removeHuman(code, 'a', 'b').success, false);
    manager.handleDisconnect('sb');
    assert.equal(room.players[1].disconnectTimeout, undefined);
    assert.ok(room.autoPlay.get('b'));
    // Una reconexión que llega antes de la retirada vuelve a proteger la plaza.
    manager.reconnectPlayer(code, 'b', 'new-b');
    assert.equal(manager.removeHuman(code, 'a', 'b').success, false);
    manager.handleDisconnect('new-b');
    assert.equal(manager.removeHuman(code, 'a', 'b').success, true);
    assert.equal(room.status, 'finished');
    assert.equal(room.match.state.winner, 'a');
    assert.equal(room.players.length, 1);
    assert.equal(room.autoPlay.has('b'), false);
    assert.equal(manager.reconnectPlayer(code, 'b', 'third-b').success, false);
    context.mock.timers.tick(300001);
    assert.equal(room.players.length, 1, 'el autoplay anterior no repite la retirada');
    assert.equal(manager.changeGame(code, 'a', 'pig').success, true);
    assert.equal(room.status, 'waiting');
    assert.equal(room.turnTimeout, undefined);
    assert.equal(room.botLoopTimeout, undefined);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Cambiar de juego conserva el anfitrión humano y lo transfiere al salir', () => {
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const { code } = manager.createRoom('Ana', 'a', 'sa', 'pig').room;
    manager.addBot(code, 'a');
    manager.joinRoom(code, 'Bruno', 'b', 'sb');
    manager.changeGame(code, 'a', 'colorclash');
    manager.leaveRoom('sa');
    const room = manager.getRoomBySocket('sb');
    assert.equal(room.hostId, 'b');
    assert.equal(room.code, code);
    assert.equal(manager.changeGame(code, 'b', 'pig').success, true);
    manager.leaveRoom('sb');
    assert.equal(manager.getRoomBySocket('sb'), undefined);
    assert.equal(manager.reconnectPlayer(code, 'b', 'new-b').success, false);
  } finally {
    manager.dispose();
  }
});

test('Ciudad Fortuna: si vence el turno el mismo bot termina la jugada y el siguiente jugador puede tirar', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const code = manager.createRoom('Ana', 'a', 'sa', 'monopoly').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'sb');
    manager.updateRoomRules(code, 'a', { turnSeconds: 120 });
    manager.startGame(code, 'a');
    const room = manager.getRoomBySocket('sa');
    const unattendedPlayer = room.match.actor();
    context.mock.timers.tick(room.turnDeadline - Date.now());
    assert.equal(room.inactivityConfirmation?.playerId, unattendedPlayer);
    context.mock.timers.tick(20000);
    assert.equal(room.autoPlay.get(unattendedPlayer)?.mode, 'timeout');

    for (let i = 0; i < 40 && room.match.actor() === unattendedPlayer; i++)
      context.mock.timers.tick(1000);
    assert.equal(room.match.actor(), 'b');
    assert.equal(room.match.state.turnPhase, 'roll');
    assert.equal(room.autoPlay.has(unattendedPlayer), true);
    assert.equal(manager.handleAction(code, 'b', { type: 'ROLL_DICE' }).success, true);
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Autoplay: tras tres minutos el anfitrión puede mantener una plaza como bot o retirar al jugador', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  const stopRoomClocks = (room) => {
    clearTimeout(room.turnTimeout);
    room.turnTimeout = undefined;
    room.turnDeadline = null;
    clearTimeout(room.botLoopTimeout);
    room.botLoopTimeout = undefined;
  };
  try {
    const keepCode = manager.createRoom('Ana', 'a', 'sa', 'tictactoe').room.code;
    manager.joinRoom(keepCode, 'Bruno', 'b', 'sb');
    manager.updateRoomRules(keepCode, 'a', { turnSeconds: 30 });
    manager.startGame(keepCode, 'a');
    const keepRoom = manager.getRoomBySocket('sa');
    manager.handleDisconnect('sb');
    stopRoomClocks(keepRoom);
    context.mock.timers.tick(180000);
    assert.equal(keepRoom.autoPlay.get('b').awaitingHost, true);
    assert.equal(manager.resolveAutoPlay(keepCode, 'b', 'b', 'keep').success, false);
    assert.equal(manager.resolveAutoPlay(keepCode, 'a', 'b', 'keep').success, true);
    assert.equal(keepRoom.autoPlay.get('b').permanent, true);
    assert.equal(manager.reconnectPlayer(keepCode, 'b', 'sb-return').success, true);
    assert.equal(keepRoom.autoPlay.has('b'), false, 'al volver recupera el control');

    const removeCode = manager.createRoom('Clara', 'c', 'sc', 'tictactoe').room.code;
    manager.joinRoom(removeCode, 'Diego', 'd', 'sd');
    manager.updateRoomRules(removeCode, 'c', { turnSeconds: 30 });
    manager.startGame(removeCode, 'c');
    const removeRoom = manager.getRoomBySocket('sc');
    manager.handleDisconnect('sd');
    stopRoomClocks(removeRoom);
    context.mock.timers.tick(180000);
    assert.equal(removeRoom.autoPlay.get('d').awaitingHost, true);
    const activityBeforeHostDecision = removeRoom.lastActivity;
    assert.equal(manager.resolveAutoPlay(removeCode, 'c', 'd', 'remove').success, true);
    assert.ok(
      removeRoom.lastActivity > activityBeforeHostDecision,
      'la decisión del anfitrión sí cuenta',
    );
    assert.equal(
      removeRoom.players.some((p) => p.id === 'd'),
      false,
    );

    const automaticCode = manager.createRoom('Elena', 'e', 'se', 'tictactoe').room.code;
    manager.joinRoom(automaticCode, 'Fabio', 'f', 'sf');
    manager.startGame(automaticCode, 'e');
    const automaticRoom = manager.getRoomBySocket('se');
    manager.handleDisconnect('sf');
    stopRoomClocks(automaticRoom);
    const activityBeforeAutomaticRemoval = automaticRoom.lastActivity;
    context.mock.timers.tick(180000);
    assert.equal(automaticRoom.autoPlay.get('f').awaitingHost, true);
    context.mock.timers.tick(120001);
    assert.equal(
      automaticRoom.players.some((player) => player.id === 'f'),
      false,
    );
    assert.equal(
      automaticRoom.lastActivity,
      activityBeforeAutomaticRemoval,
      'la retirada automática no renueva actividad humana',
    );
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('El apodo se actualiza solo para la identidad autenticada de la sala', () => {
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const code = manager.createRoom('Ana', 'a', 'sa', 'tictactoe').room.code;
    manager.joinRoom(code, 'Bruno', 'b', 'sb');
    assert.equal(manager.updatePlayerName(code, 'b', 'Bruno Nuevo').success, true);
    assert.equal(manager.getRoomInfo(manager.getRoomBySocket('sb')).players[1].name, 'Bruno Nuevo');
    assert.equal(manager.updatePlayerName(code, 'other', 'Intruso').success, false);
  } finally {
    manager.dispose();
  }
});

test('Confirmación de inactividad: solo el jugador, la sesión y el nonce vigentes responden; la prórroga es única', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const emitted = [];
  const manager = new RoomManager({
    to: (target) => ({ emit: (event, payload) => emitted.push({ target, event, payload }) }),
    sockets: { sockets: new Map() },
  });
  try {
    const room = manager.createRoom('Ana', 'a', 'sa', 'tictactoe').room;
    manager.joinRoom(room.code, 'Bruno', 'b', 'sb');
    manager.updateRoomRules(room.code, 'a', { turnSeconds: 30 });
    manager.startGame(room.code, 'a');
    const active = manager.getRoomBySocket('sa');
    const actor = active.match.actor();
    const player = active.players.find((candidate) => candidate.id === actor);
    context.mock.timers.tick(active.turnDeadline - Date.now());
    const prompt = active.inactivityConfirmation;
    assert.ok(prompt);
    const privatePrompt = emitted.find((event) => event.event === 'room:inactivity_prompt');
    assert.equal(privatePrompt.target, player.socketId);
    assert.equal(
      manager.respondToInactivity(
        room.code,
        actor,
        'forged-socket',
        active.matchId,
        prompt.promptId,
        'continue',
      ).success,
      false,
    );
    assert.equal(
      manager.respondToInactivity(
        room.code,
        actor,
        player.socketId,
        'stale-match',
        prompt.promptId,
        'continue',
      ).success,
      false,
    );
    assert.equal(
      manager.respondToInactivity(
        room.code,
        actor,
        player.socketId,
        active.matchId,
        'stale-nonce',
        'continue',
      ).success,
      false,
    );
    assert.equal(
      manager.respondToInactivity(
        room.code,
        actor,
        player.socketId,
        active.matchId,
        prompt.promptId,
        'invalid',
      ).success,
      false,
    );
    assert.equal(
      manager.respondToInactivity(
        room.code,
        actor,
        player.socketId,
        active.matchId,
        prompt.promptId,
        'continue',
      ).success,
      true,
    );
    assert.equal(active.idleConfirmationUsed.has(actor), true);
    context.mock.timers.tick(active.turnDeadline - Date.now());
    assert.equal(
      active.inactivityConfirmation,
      undefined,
      'no puede pedir otra prórroga sin jugar',
    );
    assert.equal(active.autoPlay.get(actor)?.mode, 'timeout');
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('Autoplay sin respuesta muestra una cuenta atrás al anfitrión y expulsa al agotarse', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const room = manager.createRoom('Ana', 'a', 'sa', 'tictactoe').room;
    manager.joinRoom(room.code, 'Bruno', 'b', 'sb');
    manager.updateRoomRules(room.code, 'a', { turnSeconds: 30 });
    manager.startGame(room.code, 'a');
    const active = manager.getRoomBySocket('sa');
    const actor = active.match.actor();
    context.mock.timers.tick(active.turnDeadline - Date.now());
    context.mock.timers.tick(20000);
    const entry = active.autoPlay.get(actor);
    assert.equal(entry?.mode, 'timeout');
    context.mock.timers.tick(180000);
    assert.equal(entry.awaitingHost, true);
    assert.equal(entry.deadline, Date.now() + 60000);
    context.mock.timers.tick(59999);
    assert.ok(active.players.some((player) => player.id === actor));
    context.mock.timers.tick(1);
    assert.equal(
      active.players.some((player) => player.id === actor),
      false,
    );
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});

test('La revisión del anfitrión no detiene el vencimiento propio de una fase cronometrada', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 });
  const manager = new RoomManager({ to: () => ({ emit() {} }), sockets: { sockets: new Map() } });
  try {
    const room = manager.createRoom('Ana', 'a', 'sa', 'tictactoe').room;
    manager.joinRoom(room.code, 'Bruno', 'b', 'sb');
    manager.startGame(room.code, 'a');
    const active = manager.getRoomBySocket('sa');
    let expirations = 0;
    active.match.actor = () => 'b';
    active.match.requiresPlayerAction = () => true;
    active.match.timeoutSeconds = () => 5;
    active.match.expire = () => false;
    active.match.timeoutStep = () => {
      expirations++;
      return { continue: false };
    };
    manager.armTurnClock(active, true);
    manager.handleDisconnect('sb');

    context.mock.timers.tick(180000);
    assert.equal(active.autoPlay.get('b').awaitingHost, true);
    const beforeReviewStep = expirations;
    context.mock.timers.tick(5000);
    assert.ok(expirations > beforeReviewStep, 'la fase cronometrada sigue venciendo');
    assert.ok(active.turnTimeout, 'sigue armado el siguiente plazo de la fase');
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});
