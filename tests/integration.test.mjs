import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { io } from 'socket.io-client';
import { PROTOCOL_VERSION, getGame } from '../packages/sobremesa-logic/dist/index.js';
const url = 'http://127.0.0.1:3190';
let server;
let serverStartedAt = 0;
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
      if ((await fetch(url + '/health')).ok) {
        serverStartedAt = Date.now();
        return;
      }
    } catch {}
    await wait(50);
  }
  throw new Error('Servidor no disponible: ' + logs);
});
after(async () => {
  for (const s of clients) s.disconnect();
  server?.kill('SIGTERM');
});
afterEach(() => {
  for (const socket of clients.splice(0)) socket.disconnect();
});
const ack = (socket, event, ...data) => {
  if (
    [
      'game:action',
      'room:update_rules',
      'room:add_bot',
      'room:remove_bot',
      'room:start_game',
      'room:restart_game',
      'room:remove_player',
      'room:change_game',
      'room:confirm_presence',
    ].includes(event) &&
    !data[0]?.matchId
  ) {
    data = [
      event === 'game:action'
        ? { matchId: socket.matchId, action: data[0] }
        : event === 'room:update_rules'
          ? { matchId: socket.matchId, rules: data[0] }
          : { ...data[0], matchId: socket.matchId },
    ];
  }
  return new Promise((resolve, reject) =>
    socket.timeout(3000).emit(event, ...data, (error, result) => {
      if (error) reject(error);
      else {
        if (result?.room) socket.matchId = result.room.matchId;
        resolve(result);
      }
    }),
  );
};
async function connect(token = secret(), extra = {}) {
  const socket = io(url, {
    auth: { sessionToken: token, protocolVersion: PROTOCOL_VERSION },
    transports: ['websocket'],
    reconnection: false,
    ...extra,
  });
  socket.on('room:updated', (room) => {
    socket.matchId = room.matchId;
  });
  clients.push(socket);
  const { playerId } = await new Promise((resolve, reject) => {
    socket.once('session:ready', resolve);
    socket.once('connect_error', reject);
    socket.once('session:incompatible', ({ protocolVersion }) =>
      reject(
        Object.assign(new Error('Protocol mismatch'), {
          data: { code: 'PROTOCOL_MISMATCH', protocolVersion },
        }),
      ),
    );
  });
  return { socket, playerId, token };
}
async function create(client, gameType = 'tictactoe') {
  const result = await ack(client.socket, 'room:create', { playerName: 'Ana', gameType });
  assert.equal(result.success, true);
  return result.room;
}

test('HTTP: cabeceras, catálogo de treinta juegos y rutas desconocidas', async () => {
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
  assert.equal((await stats.json()).supportedGames.length, 30);
  assert.equal(stats.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(url + '/api/unknown')).status, 404);
  assert.equal((await fetch(url + '/missing.js')).status, 404);
  const transport = await fetch(url + '/socket.io/?EIO=4&transport=polling');
  assert.equal(transport.headers.get('cache-control'), 'no-store');
  const notices = await fetch(url + '/third-party-notices.txt');
  assert.equal(notices.status, 200);
  assert.match(await notices.text(), /lucide-react[\s\S]*react-dom[\s\S]*socket.io-client/);
  const license = await fetch(url + '/license.txt');
  assert.equal(license.status, 200);
  assert.match(await license.text(), /Samuel Ciocan[\s\S]*Todos los derechos reservados/);
});
test('Rechaza orígenes ajenos y secretos de sesión no válidos', async () => {
  await assert.rejects(connect('short'));
  await assert.rejects(connect(secret(), { extraHeaders: { Origin: 'https://evil.example' } }));
  const a = await connect();
  assert.match(a.playerId, /^guest_[a-f0-9]{32}$/);
  a.socket.disconnect();
});
test('Un cliente de protocolo antiguo recibe un error explícito y conserva su secreto', async () => {
  for (const protocolVersion of [undefined, 0, PROTOCOL_VERSION - 1, PROTOCOL_VERSION + 1, '1']) {
    await assert.rejects(
      connect(secret(), { auth: { sessionToken: secret(), protocolVersion } }),
      (error) =>
        error.data?.code === 'PROTOCOL_MISMATCH' && error.data.protocolVersion === PROTOCOL_VERSION,
    );
  }
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
  // Dos eventos pueden compartir milisegundo: renovar no implica aumentar siempre la marca.
  assert.ok(afterBidRoom.turnDeadline >= initialRoom.turnDeadline);
  assert.ok(afterBidRoom.turnDeadline - afterBidRoom.serverNow <= 15000);
  assert.ok(afterBidRoom.turnDeadline - afterBidRoom.serverNow > 14000);

  state = await act(guest, { type: 'BID', amount: 20 });
  assert.equal(state.auction.highestBidderId, guest.playerId);
  const secondBidRoom = await getRoom();
  assert.ok(secondBidRoom.turnDeadline >= afterBidRoom.turnDeadline);
  assert.ok(secondBidRoom.turnDeadline - secondBidRoom.serverNow <= 15000);
  assert.ok(secondBidRoom.turnDeadline - secondBidRoom.serverNow > 14000);

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
  'Presencia autenticada y abandono real en los seis primeros juegos',
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
      const recovered = await ack(session.host.socket, 'game:reconnect', {
        roomCode: session.room.code,
      });
      const pending = recovered.room.presence;
      assert.equal(pending.playerId, session.host.playerId);
      assert.ok(pending.deadline > recovered.room.serverNow);
      assert.equal(
        (
          await ack(session.guest.socket, 'room:confirm_presence', {
            challengeId: pending.challengeId,
            stay: true,
            playerId: session.host.playerId,
          })
        ).success,
        false,
      );
      if (session.game === 'tictactoe') {
        assert.equal(
          recovered.state.board.filter(Boolean).length,
          0,
          'Nadie decide estratégicamente por el ausente',
        );
        assert.equal(
          (
            await ack(session.host.socket, 'room:confirm_presence', {
              challengeId: pending.challengeId,
              stay: true,
            })
          ).success,
          true,
        );
        assert.equal(
          (
            await ack(session.host.socket, 'room:confirm_presence', {
              challengeId: pending.challengeId,
              stay: true,
            })
          ).success,
          false,
        );
        assert.equal(
          (await ack(session.host.socket, 'game:action', { type: 'MAKE_MOVE', index: 0 })).success,
          true,
        );
        await ack(session.host.socket, 'room:leave');
      } else {
        assert.equal(
          (
            await ack(session.host.socket, 'room:confirm_presence', {
              challengeId: pending.challengeId,
              stay: false,
            })
          ).success,
          true,
        );
        assert.equal(
          (
            await ack(session.host.socket, 'room:confirm_presence', {
              challengeId: pending.challengeId,
              stay: true,
            })
          ).success,
          false,
        );
      }
      const remaining = await ack(session.guest.socket, 'game:reconnect', {
        roomCode: session.room.code,
      });
      assert.equal(remaining.room.status, 'finished');
      assert.equal(remaining.state.winner, session.guest.playerId);
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
    'parchis',
    'oca',
    'go',
    'chinesecheckers',
    'mahjong',
    'brisca',
    'mus',
    'escoba',
    'cinquillo',
    'poker',
    'words',
    'quiz',
    'drawing',
    'mystery',
    'conquest',
  ]) {
    const host = await connect(),
      guest = await connect(),
      other = await connect();
    const room = await create(host, game),
      second = await create(other, game);
    await ack(guest.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' });
    const extra = [];
    for (const [owner, info, count] of [
      [host, room, 2],
      [other, second, 1],
    ]) {
      for (let n = count; n < getGame(game).minPlayers; n++) {
        if (getGame(game).supportsBots === false) {
          const human = await connect();
          extra.push(human);
          assert.equal(
            (
              await ack(human.socket, 'room:join', {
                roomCode: info.code,
                playerName: `Persona ${n}`,
              })
            ).success,
            true,
          );
        } else await ack(owner.socket, 'room:add_bot');
      }
    }
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
    if (['mus', 'escoba', 'cinquillo', 'words', 'mystery'].includes(game)) {
      for (const view of [a.state, b.state]) {
        assert.equal('stock' in view, false);
        assert.equal('bag' in view, false);
        assert.equal('solution' in view && view.solution !== null, false);
      }
      if (game === 'mus') assert.ok(a.state.players.every((p) => p.hand === null));
      else assert.ok(a.state.players.every((p) => !('hand' in p)));
      assert.ok(a.state.hand.length);
      assert.ok(b.state.hand.length);
    }
    if (game === 'poker') {
      assert.equal(a.state.players[1].hand, null);
      assert.equal(b.state.players[0].hand, null);
      assert.equal('deck' in a.state, false);
    }
    if (game === 'quiz') {
      assert.equal(a.state.question.answer, null);
      assert.equal('deck' in a.state, false);
    }
    if (game === 'drawing') {
      assert.equal((await ack(host.socket, 'room:add_bot')).success, false);
      assert.equal(b.state.choices.length, 0);
      assert.equal(b.state.word, null);
      assert.equal('deck' in b.state, false);
    }
    if (game === 'brisca') {
      assert.equal('stock' in a.state, false);
      assert.ok(a.state.players.every((p) => !('hand' in p)));
      assert.equal(a.state.hand.length, 3);
      assert.equal(b.state.hand.length, 3);
      assert.ok(!a.state.hand.some((c) => b.state.hand.includes(c)));
      assert.equal(a.state.stockCount, 34);
    }
    if (game === 'mahjong') {
      for (const view of [a.state, b.state]) {
        assert.equal('wall' in view, false);
        assert.equal('responses' in view, false);
        assert.equal(view.wallCount, 83);
        assert.ok(
          view.players.every((p) => !('hand' in p) && !('blocked' in p) && p.revealedHand === null),
        );
      }
      assert.equal(a.state.hand.length, 14);
      assert.equal(b.state.hand.length, 13);
      assert.equal(b.state.drawn, null);
      assert.ok(!a.state.hand.some((t) => b.state.hand.includes(t)));
    }
    if (game === 'go') {
      assert.equal('history' in a.state, false);
      assert.equal('history' in b.state, false);
      assert.equal(a.state.legalMoves.length, 81);
    }
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
    for (const human of extra) {
      await ack(human.socket, 'room:leave');
      human.socket.disconnect();
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
  'Los juegos ampliados confirman al actor humano real sin decisiones estratégicas automáticas',
  { timeout: 80000 },
  async () => {
    // El catálogo ampliado usa más handshakes: respetamos la ventana de 120/minuto.
    await wait(Math.max(0, 61000 - (Date.now() - serverStartedAt)));
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
      'parchis',
      'oca',
      'go',
      'chinesecheckers',
      'mahjong',
      'brisca',
    ]) {
      const host = await connect(),
        guest = await connect(),
        room = await create(host, game);
      await ack(guest.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' });
      for (let n = 2; n < getGame(game).minPlayers; n++) await ack(host.socket, 'room:add_bot');
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
      const recovered = await ack(s.host.socket, 'game:reconnect', { roomCode: s.room.code });
      assert.equal(recovered.success, true);
      const pendingHuman = [s.host, s.guest].find(
        (p) => p.playerId === recovered.room.presence.playerId,
      );
      assert.ok(pendingHuman, `Presencia pendiente de un humano: ${s.game}`);
      const remainingHuman = pendingHuman === s.host ? s.guest : s.host;
      assert.deepEqual(
        recovered.state,
        s.initial,
        'No hay jugadas estratégicas automáticas por humanos',
      );
      assert.equal(
        (
          await ack(pendingHuman.socket, 'room:confirm_presence', {
            challengeId: recovered.room.presence.challengeId,
            stay: false,
          })
        ).success,
        true,
      );
      const remaining = await ack(remainingHuman.socket, 'game:reconnect', {
        roomCode: s.room.code,
      });
      assert.equal(remaining.success, true);
      assert.equal(
        remaining.room.players.some((p) => p.id === pendingHuman.playerId),
        false,
      );
      await ack(s.guest.socket, 'room:leave');
      s.host.socket.disconnect();
      s.guest.socket.disconnect();
    }
  },
);

test('Los handshakes concurrentes no superan treinta sesiones por IP y liberan las plazas', async () => {
  const attempts = await Promise.allSettled(Array.from({ length: 35 }, () => connect()));
  const accepted = attempts
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  try {
    assert.equal(accepted.length, 30);
    assert.equal(attempts.filter((result) => result.status === 'rejected').length, 5);
  } finally {
    for (const client of accepted) client.socket.disconnect();
  }
  await wait(100);
  const next = await connect();
  next.socket.disconnect();
});

test(
  'Últimos nueve juegos: plazos reales progresan sin superar treinta sesiones por IP',
  { timeout: 45000 },
  async () => {
    const sessions = [];
    for (const game of [
      'mus',
      'escoba',
      'cinquillo',
      'poker',
      'words',
      'quiz',
      'drawing',
      'mystery',
      'conquest',
    ]) {
      const host = await connect(),
        guest = await connect(),
        room = await create(host, game),
        extra = [];
      assert.equal(
        (await ack(guest.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' }))
          .success,
        true,
      );
      for (let n = 2; n < getGame(game).minPlayers; n++) {
        if (getGame(game).supportsBots === false) {
          const human = await connect();
          extra.push(human);
          await ack(human.socket, 'room:join', { roomCode: room.code, playerName: `Persona ${n}` });
        } else await ack(host.socket, 'room:add_bot');
      }
      await ack(host.socket, 'room:update_rules', { turnSeconds: 30 });
      let updates = 0;
      host.socket.on('game:state_update', () => updates++);
      assert.equal((await ack(host.socket, 'room:start_game')).success, true);
      sessions.push({ host, guest, extra, room, game, updates: () => updates });
    }
    await wait(31500);
    for (const session of sessions) {
      const recovered = await ack(session.host.socket, 'game:reconnect', {
        roomCode: session.room.code,
      });
      assert.equal(recovered.success, true);
      if (session.game === 'quiz') {
        assert.equal(recovered.room.presence, undefined);
        assert.ok(session.updates() > 0, 'Las preguntas mantienen su plazo propio');
      } else {
        const pendingHuman = [session.host, session.guest, ...session.extra].find(
          (p) => p.playerId === recovered.room.presence.playerId,
        );
        assert.ok(pendingHuman, session.game);
        assert.equal(
          (
            await ack(pendingHuman.socket, 'room:confirm_presence', {
              challengeId: recovered.room.presence.challengeId,
              stay: false,
            })
          ).success,
          true,
        );
      }
      for (const human of [session.host, session.guest, ...session.extra]) {
        await ack(human.socket, 'room:leave');
        human.socket.disconnect();
      }
    }
  },
);

test('Grupo multijuego: código pegado, permisos, expulsión y contextos antiguos por Socket.IO', async () => {
  const a = await connect(),
    b = await connect();
  const room = await create(a, 'colorclash');
  const pasted = room.code.toLowerCase().split('').join(' ');
  assert.equal(
    (await ack(b.socket, 'room:join', { roomCode: ` ${pasted} `, playerName: 'Bruno' })).success,
    true,
  );
  assert.equal((await ack(b.socket, 'room:change_game', { gameType: 'pig' })).success, false);
  assert.equal(
    (await ack(b.socket, 'room:remove_player', { playerId: a.playerId })).success,
    false,
  );
  assert.equal((await ack(a.socket, 'room:update_rules', { stackDrawCards: true })).success, true);
  const oldMatchId = a.socket.matchId;
  assert.equal((await ack(a.socket, 'room:change_game', { gameType: 'tictactoe' })).success, true);
  const currentMatchId = a.socket.matchId;
  assert.notEqual(currentMatchId, oldMatchId);
  for (const [event, data] of [
    ['room:change_game', { gameType: 'pig' }],
    ['room:update_rules', { rules: { turnSeconds: 30 } }],
    ['room:remove_player', { playerId: b.playerId }],
    ['room:start_game', {}],
    ['game:action', { action: { type: 'MAKE_MOVE', index: 0 } }],
  ])
    assert.equal((await ack(a.socket, event, { ...data, matchId: oldMatchId })).success, false);
  const recovered = await ack(b.socket, 'game:reconnect', { roomCode: room.code });
  assert.equal(recovered.room.code, room.code);
  assert.equal(recovered.room.gameType, 'tictactoe');
  assert.equal(recovered.room.players.length, 2);
  assert.equal(recovered.state, null);
  const removed = new Promise((resolve) => b.socket.once('room:removed', resolve));
  assert.equal((await ack(a.socket, 'room:remove_player', { playerId: b.playerId })).success, true);
  assert.match(await removed, /retirado/);
  assert.equal((await ack(b.socket, 'game:reconnect', { roomCode: room.code })).success, false);
  assert.equal((await ack(b.socket, 'room:add_bot')).success, false);
  // Entrar de nuevo exige una acción explícita, nunca restaura una reserva antigua.
  assert.equal(
    (await ack(b.socket, 'room:join', { roomCode: room.code, playerName: 'Bruno' })).success,
    true,
  );
  assert.equal((await ack(a.socket, 'room:start_game')).success, true);
  const statePromise = new Promise((resolve) => b.socket.once('game:state_update', resolve));
  assert.equal((await ack(a.socket, 'game:action', { type: 'MAKE_MOVE', index: 0 })).success, true);
  const state = await statePromise;
  assert.equal(state.matchId, a.socket.matchId);
  assert.equal(state.gameType, 'tictactoe');
  assert.equal((await ack(a.socket, 'room:change_game', { gameType: 'pig' })).success, false);
  assert.equal(
    (await ack(a.socket, 'room:remove_player', { playerId: b.playerId })).success,
    false,
  );
});
