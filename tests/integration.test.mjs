import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { io } from 'socket.io-client';
const url = 'http://127.0.0.1:3190';
let server;
const clients = [];
const secret = () => randomBytes(32).toString('hex');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
before(async () => {
  server = spawn(process.execPath, ['apps/sobremesa-server/dist/server.js'], {
    env: {
      ...process.env,
      PORT: '3190',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      TRUSTED_CLOUDFLARE_IPS: '',
      BOT_THINKING_TIME_MS: '10',
      DISCONNECT_GRACE_PERIOD_MS: '1000',
      ROOM_CREATE_LIMIT_PER_IP: '100',
      ROOM_CREATE_LIMIT_GLOBAL: '500',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.on('data', (d) => (logs += d));
  server.stderr.on('data', (d) => (logs += d));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url + '/health')).ok) return;
    } catch {}
    await wait(50);
  }
  throw new Error('Servidor no disponible: ' + logs);
});
after(async () => {
  for (const s of clients) s.disconnect();
  server?.kill('SIGTERM');
});
const ack = (socket, event, ...data) =>
  new Promise((resolve, reject) => {
    socket
      .timeout(3000)
      .emit(event, ...data, (err, result) => (err ? reject(err) : resolve(result)));
  });
async function connect(token = secret(), extra = {}) {
  const socket = io(url, {
    auth: { sessionToken: token },
    transports: ['websocket'],
    reconnection: false,
    ...extra,
  });
  clients.push(socket);
  const { playerId } = await new Promise((resolve, reject) => {
    socket.once('session:ready', resolve);
    socket.once('connect_error', reject);
  });
  return { socket, playerId, token };
}
async function create(client, gameType = 'tictactoe') {
  const result = await ack(client.socket, 'room:create', { playerName: 'Ana', gameType });
  assert.equal(result.success, true);
  return result.room;
}

test('HTTP: cabeceras, catálogo de quince juegos y rutas desconocidas', async () => {
  const res = await fetch(url);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(res.headers.get('content-security-policy'), /wss:\/\/games\.samuelciocan\.com/);
  assert.ok(!(await res.text()).includes('fonts.googleapis'));
  const stats = await fetch(url + '/api/stats');
  assert.equal((await stats.json()).supportedGames.length, 15);
  assert.equal(stats.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(url + '/api/unknown')).status, 404);
  assert.equal((await fetch(url + '/missing.js')).status, 404);
  const transport = await fetch(url + '/socket.io/?EIO=4&transport=polling');
  assert.equal(transport.headers.get('cache-control'), 'no-store');
  const notices = await fetch(url + '/third-party-notices.txt');
  assert.equal(notices.status, 200);
  assert.match(await notices.text(), /lucide-react[\s\S]*react-dom[\s\S]*socket.io-client/);
});
test('Rechaza orígenes ajenos y secretos de sesión no válidos', async () => {
  await assert.rejects(connect('short'));
  await assert.rejects(connect(secret(), { extraHeaders: { Origin: 'https://evil.example' } }));
  const a = await connect();
  assert.match(a.playerId, /^guest_[a-f0-9]{32}$/);
  a.socket.disconnect();
});
test('Eventos malformados no tumban el servidor ni crean salas', async () => {
  const a = await connect();
  for (const payload of [
    null,
    {},
    [],
    { gameType: 'unknown', playerName: 'Ana' },
    { gameType: 'tictactoe', playerName: 5 },
  ])
    assert.equal((await ack(a.socket, 'room:create', payload)).success, false);
  a.socket.emit('room:create', null);
  assert.equal((await fetch(url + '/health')).status, 200);
  a.socket.disconnect();
});
test('El identificador público no permite robar una sesión ni permisos de anfitrión', async () => {
  const a = await connect(),
    b = await connect(),
    room = await create(a);
  assert.equal(
    (await ack(b.socket, 'game:reconnect', { roomCode: room.code, playerId: a.playerId })).success,
    false,
  );
  const joined = await ack(b.socket, 'room:join', {
    roomCode: room.code,
    playerName: 'Bruno',
    playerId: a.playerId,
  });
  assert.equal(joined.success, true);
  assert.ok(joined.room.players.some((p) => p.id === b.playerId));
  for (const event of ['room:add_bot', 'room:start_game', 'room:restart_game'])
    assert.equal((await ack(b.socket, event)).success, false);
  assert.equal((await ack(b.socket, 'room:update_rules', { startingCash: 2500 })).success, false);
  assert.equal(
    (await ack(a.socket, 'room:create', { playerName: 'Ana', gameType: 'pig' })).success,
    false,
  );
  assert.equal((await ack(a.socket, 'room:start_game')).success, true);
  assert.equal((await ack(a.socket, 'room:start_game')).success, false);
  assert.equal((await ack(a.socket, 'room:restart_game')).success, false);
  assert.equal(
    (await ack(b.socket, 'game:action', { type: 'MAKE_MOVE', index: 0, playerId: a.playerId }))
      .success,
    false,
  );
  assert.equal(
    (await ack(a.socket, 'game:action', { type: 'MAKE_MOVE', index: 1.5 })).success,
    false,
  );
  assert.equal((await ack(a.socket, 'game:action', { type: 'MAKE_MOVE', index: 0 })).success, true);
  await ack(a.socket, 'room:leave');
  await ack(b.socket, 'room:leave');
  a.socket.disconnect();
  b.socket.disconnect();
});
test('Reconexión con secreto, estado restaurado y cambio de conexión autenticado', async () => {
  const a = await connect(),
    room = await create(a);
  await ack(a.socket, 'room:add_bot');
  await ack(a.socket, 'room:start_game');
  await ack(a.socket, 'game:action', { type: 'MAKE_MOVE', index: 0 });
  a.socket.disconnect();
  await wait(100);
  const reconnect = await connect(a.token),
    result = await ack(reconnect.socket, 'game:reconnect', { roomCode: room.code });
  assert.equal(result.success, true);
  assert.equal(result.state.board[0], 'X');
  assert.equal(reconnect.playerId, a.playerId);
  const duplicate = await connect(a.token);
  const replaced = new Promise((resolve) => reconnect.socket.once('session:replaced', resolve));
  const detached = new Promise((resolve) => reconnect.socket.once('disconnect', resolve));
  const handover = await ack(duplicate.socket, 'game:reconnect', { roomCode: room.code });
  assert.equal(handover.success, true);
  await Promise.all([replaced, detached]);
  assert.equal(reconnect.socket.connected, false);
  assert.equal(handover.state.board[0], 'X');
  await ack(duplicate.socket, 'room:leave');
  duplicate.socket.disconnect();
  reconnect.socket.disconnect();
});
test('Reglas solo admiten opciones enumeradas y valores finitos', async () => {
  const a = await connect(),
    room = await create(a, 'monopoly');
  for (const rules of [
    null,
    [],
    { startingCash: -1 },
    { startingCash: '1500' },
    { salaryGO: 999999 },
    { jailFine: 0 },
    { maxRounds: 1 },
    { auctionEnabled: 1 },
    { __proto__: { admin: true } },
  ]) {
    if (rules && Object.keys(rules).length === 0) continue;
    assert.equal((await ack(a.socket, 'room:update_rules', rules)).success, false);
  }
  assert.equal(
    (
      await ack(a.socket, 'room:update_rules', {
        startingCash: 2000,
        auctionEnabled: true,
        maxRounds: 20,
      })
    ).success,
    true,
  );
  await ack(a.socket, 'room:leave');
  a.socket.disconnect();
});
test('Ausencias simultáneas preservan la reserva del segundo jugador', async () => {
  const a = await connect(),
    b = await connect(),
    room = await create(a);
  await ack(b.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' });
  a.socket.disconnect();
  await wait(500);
  b.socket.disconnect();
  await wait(650);
  const resumed = await connect(b.token),
    result = await ack(resumed.socket, 'game:reconnect', { roomCode: room.code });
  assert.equal(result.success, true);
  assert.equal(result.room.hostId, b.playerId);
  await ack(resumed.socket, 'room:leave');
  resumed.socket.disconnect();
});
test('Límite de acciones responde con un error controlado', async () => {
  const a = await connect();
  const results = await Promise.all(
    Array.from({ length: 45 }, () => ack(a.socket, 'game:action', { type: 'NOOP' })),
  );
  assert.ok(results.some((r) => /Demasiadas/.test(r.error)));
  a.socket.disconnect();
  assert.equal((await fetch(url + '/health')).status, 200);
});

test('Salas simultáneas del mismo juego y de otro juego mantienen sus estados separados', async () => {
  const people = await Promise.all(Array.from({ length: 6 }, () => connect()));
  const rooms = [];
  for (let i = 0; i < 3; i++) {
    const room = await create(people[i * 2], i === 2 ? 'colorclash' : 'tictactoe');
    rooms.push(room);
    assert.equal(
      (
        await ack(people[i * 2 + 1].socket, 'room:join', {
          roomCode: room.code,
          playerName: 'Invitado',
        })
      ).success,
      true,
    );
    assert.equal((await ack(people[i * 2].socket, 'room:start_game')).success, true);
  }
  assert.equal(new Set(rooms.map((r) => r.code)).size, 3);
  await ack(people[0].socket, 'game:action', { type: 'MAKE_MOVE', index: 0 });
  const other = await ack(people[2].socket, 'game:reconnect', { roomCode: rooms[1].code });
  assert.deepEqual(other.state.board, Array(9).fill(null));
  assert.equal(
    (await ack(people[2].socket, 'game:action', { type: 'MAKE_MOVE', index: 0 })).success,
    true,
  );
  const cards = await ack(people[4].socket, 'game:reconnect', { roomCode: rooms[2].code });
  assert.equal(cards.state.myHand.length, 7);
  assert.equal('drawPile' in cards.state, false);
  for (const person of people) {
    await ack(person.socket, 'room:leave');
    person.socket.disconnect();
  }
});

test('Ciudad Fortuna: todos pueden pujar y una oferta renueva la ventana de 15 segundos', async () => {
  const host = await connect(),
    guest = await connect(),
    room = await create(host, 'monopoly');
  await ack(guest.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' });
  let state = null;
  host.socket.on('game:started', (game) => (state = game.publicState));
  await ack(host.socket, 'room:start_game');
  assert.ok(state);

  const act = async (player, action) => {
    const update = new Promise((resolve) => host.socket.once('game:state_update', resolve));
    const result = await ack(player.socket, 'game:action', action);
    assert.equal(result.success, true, `Acción de subasta rechazada: ${JSON.stringify(action)}`);
    return await update;
  };
  for (let steps = 0; !state.auction && steps < 100; steps++) {
    const id = state.currentTurnPlayerId,
      player = id === host.playerId ? host : guest,
      current = state.players.find((participant) => participant.id === id),
      action =
        current.cash < 0
          ? { type: 'DECLARE_BANKRUPTCY' }
          : state.turnPhase === 'roll'
            ? { type: 'ROLL_DICE' }
            : state.turnPhase === 'tile_action'
              ? { type: 'PASS_PROPERTY' }
              : { type: 'END_TURN' };
    state = await act(player, action);
    assert.ok(!state.winner, 'La partida no debería terminar antes de abrir la subasta');
  }
  assert.ok(state.auction, 'Una casilla de propiedad debe abrir una subasta');
  assert.equal(state.auction.currentBid, 0);
  const auctionTileIndex = state.auction.tileIndex;

  const getRoom = async () => {
    const result = await ack(host.socket, 'game:reconnect', { roomCode: room.code });
    assert.equal(result.success, true);
    return result.room;
  };
  const initialRoom = await getRoom();
  assert.ok(initialRoom.turnDeadline - initialRoom.serverNow <= 15000);
  assert.ok(initialRoom.turnDeadline - initialRoom.serverNow > 14000);

  state = await act(host, { type: 'BID', amount: 10 });
  assert.equal(state.auction.highestBidderId, host.playerId);
  let afterBidRoom = await getRoom();
  assert.ok(afterBidRoom.turnDeadline > initialRoom.turnDeadline);
  assert.ok(afterBidRoom.turnDeadline - afterBidRoom.serverNow > 14000);

  await wait(20);
  state = await act(guest, { type: 'BID', amount: 20 });
  assert.equal(state.auction.highestBidderId, guest.playerId);
  const secondBidRoom = await getRoom();
  assert.ok(secondBidRoom.turnDeadline > afterBidRoom.turnDeadline);

  state = await act(host, { type: 'BID', amount: 30 });
  assert.equal(state.auction.highestBidderId, host.playerId);
  const cashBeforeAward = state.players.find((p) => p.id === host.playerId).cash;
  state = await act(guest, { type: 'PASS_AUCTION' });
  assert.equal(state.auction, null);
  assert.equal(state.properties[auctionTileIndex].ownerId, host.playerId);
  assert.equal(state.players.find((p) => p.id === host.playerId).cash, cashBeforeAward - 30);

  await ack(host.socket, 'room:leave');
  await ack(guest.socket, 'room:leave');
  host.socket.disconnect();
  guest.socket.disconnect();
});

test(
  'El servidor resuelve turnos agotados en los seis juegos sin depender del navegador',
  { timeout: 45000 },
  async () => {
    const sessions = [];
    for (const game of ['monopoly', 'colorclash', 'connect4', 'reversi', 'tictactoe', 'pig']) {
      const host = await connect(),
        guest = await connect(),
        room = await create(host, game);
      await ack(guest.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' });
      assert.equal(
        (await ack(host.socket, 'room:update_rules', { turnSeconds: 30 })).success,
        true,
      );
      let latest = null,
        updates = 0;
      host.socket.on('game:state_update', (state) => {
        latest = state;
        updates++;
      });
      await ack(host.socket, 'room:start_game');
      assert.equal(
        (await ack(host.socket, 'room:update_rules', { turnSeconds: 180 })).success,
        false,
      );
      sessions.push({ host, guest, room, game, read: () => ({ latest, updates }) });
    }
    await wait(31200);
    for (const session of sessions) {
      const { latest, updates } = session.read();
      assert.ok(updates > 0, `No terminó el turno de ${session.game}`);
      const actor = latest.currentTurn || latest.currentTurnPlayerId;
      if (session.game === 'monopoly' && latest.auction) {
        assert.equal(latest.auction.highestBidderId, null);
      } else {
        assert.equal(actor, session.guest.playerId, `Turno bloqueado en ${session.game}`);
      }
      const recovered = await ack(session.host.socket, 'game:reconnect', {
        roomCode: session.room.code,
      });
      assert.equal(recovered.room.turnSeconds, 30);
      assert.ok(recovered.room.turnDeadline > Date.now());
      if (session.game === 'monopoly' && latest.auction)
        assert.ok(recovered.room.turnDeadline - recovered.room.serverNow <= 15000);
      if (session.game === 'tictactoe') assert.equal(latest.board.filter(Boolean).length, 1);
      if (session.game === 'colorclash') assert.equal('drawPile' in latest, false);
      await ack(session.host.socket, 'room:leave');
      await ack(session.guest.socket, 'room:leave');
      session.host.socket.disconnect();
      session.guest.socket.disconnect();
    }
  },
);

test('Nuevos juegos: dos salas independientes, proyección privada y reconexión', async () => {
  for (const game of [
    'rummy',
    'chess',
    'impostor',
    'dominoes',
    'checkers',
    'backgammon',
    'battleship',
    'mancala',
    'combinations',
  ]) {
    const host = await connect(),
      guest = await connect(),
      other = await connect();
    const room = await create(host, game),
      second = await create(other, game);
    await ack(guest.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' });
    if (game === 'impostor') await ack(host.socket, 'room:add_bot');
    await ack(other.socket, 'room:add_bot');
    if (game === 'impostor') await ack(other.socket, 'room:add_bot');
    assert.equal((await ack(host.socket, 'room:start_game')).success, true);
    assert.equal((await ack(other.socket, 'room:start_game')).success, true);
    const a = await ack(host.socket, 'game:reconnect', { roomCode: room.code }),
      b = await ack(guest.socket, 'game:reconnect', { roomCode: room.code });
    assert.equal(a.success, true);
    assert.equal(b.success, true);
    assert.notEqual(room.code, second.code);
    assert.equal(
      (await ack(guest.socket, 'game:reconnect', { roomCode: second.code })).success,
      false,
    );
    assert.equal(
      (await ack(host.socket, 'game:action', { type: 'FIRE', index: Infinity })).success,
      false,
    );
    if (game === 'rummy' || game === 'dominoes') {
      assert.equal('stock' in a.state, false);
      assert.equal('hand' in a.state.players[1], false);
      assert.ok(a.state.hand.length);
      assert.ok(!a.state.hand.some((c) => b.state.hand.some((d) => d.id === c.id)));
    }
    if (game === 'impostor') {
      for (const s of [a.state, b.state]) {
        assert.equal('secret' in s, false);
        assert.equal('impostorId' in s, false);
        assert.deepEqual(s.votes, {});
        assert.equal(s.word === null, s.isImpostor);
      }
    }
    if (game === 'battleship') {
      await ack(host.socket, 'game:action', { type: 'RANDOMIZE' });
      const v = await ack(guest.socket, 'game:reconnect', { roomCode: room.code });
      assert.deepEqual(v.state.ships, []);
      assert.equal(v.state.revealedFleet, null);
      assert.equal('ships' in v.state.players[0], false);
    }
    await ack(host.socket, 'room:leave');
    await ack(guest.socket, 'room:leave');
    await ack(other.socket, 'room:leave');
    host.socket.disconnect();
    guest.socket.disconnect();
    other.socket.disconnect();
  }
});

test(
  'Los nueve juegos nuevos completan decisiones agotadas con acciones legales',
  { timeout: 45000 },
  async () => {
    const sessions = [];
    for (const game of [
      'rummy',
      'chess',
      'impostor',
      'dominoes',
      'checkers',
      'backgammon',
      'battleship',
      'mancala',
      'combinations',
    ]) {
      const host = await connect(),
        guest = await connect(),
        room = await create(host, game);
      await ack(guest.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' });
      if (game === 'impostor') await ack(host.socket, 'room:add_bot');
      await ack(host.socket, 'room:update_rules', { turnSeconds: 30 });
      let latest = null,
        updates = 0;
      host.socket.on('game:state_update', (s) => {
        latest = s;
        updates++;
      });
      await ack(host.socket, 'room:start_game');
      const initial = (await ack(host.socket, 'game:reconnect', { roomCode: room.code })).state;
      sessions.push({ host, guest, room, game, initial, read: () => ({ latest, updates }) });
    }
    await wait(31500);
    for (const s of sessions) {
      const { latest, updates } = s.read();
      assert.ok(updates > 0, `Sin progreso en ${s.game}`);
      assert.notDeepEqual(latest, s.initial, `Decisión bloqueada: ${s.game}`);
      const recovered = await ack(s.host.socket, 'game:reconnect', { roomCode: s.room.code });
      assert.equal(recovered.success, true);
      assert.ok(recovered.room.turnDeadline > Date.now());
      if (s.game === 'rummy') assert.equal(latest.lastAction, 'draw');
      if (s.game === 'battleship') assert.ok(latest.players[0].ready);
      await ack(s.host.socket, 'room:leave');
      await ack(s.guest.socket, 'room:leave');
      s.host.socket.disconnect();
      s.guest.socket.disconnect();
    }
  },
);
