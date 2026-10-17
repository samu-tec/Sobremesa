import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { io } from 'socket.io-client';
import { PROTOCOL_VERSION } from '../packages/sobremesa-logic/dist/index.js';

const url = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:13000';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname), 'Solo localhost');
const clients = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ack = (socket, event, ...data) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit(event, ...data, (error, result) => (error ? reject(error) : resolve(result))),
  );
async function connect(token = randomBytes(32).toString('hex'), extra = {}) {
  const socket = io(url, {
    auth: { sessionToken: token, protocolVersion: PROTOCOL_VERSION },
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
    ...extra,
  });
  clients.push(socket);
  const ready = await new Promise((resolve, reject) => {
    socket.once('session:ready', resolve);
    socket.once('connect_error', reject);
  });
  return { socket, token, ...ready };
}
try {
  const health = await fetch(`${url}/health`);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const license = await fetch(`${url}/license.txt`);
  assert.equal(license.status, 200);
  assert.match(await license.text(), /Samuel Ciocan[\s\S]*Todos los derechos reservados/);
  const notices = await fetch(`${url}/third-party-notices.txt`);
  assert.equal(notices.status, 200);
  assert.match(await notices.text(), /lucide-react[\s\S]*react-dom[\s\S]*socket.io-client/);
  assert.match(response.headers.get('content-security-policy'), /ws:\/\/127\.0\.0\.1:13000/);
  const html = await response.text();
  const resources = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.(?:js|css))"/g)];
  assert.ok(resources.some(([, path]) => path.endsWith('.js')));
  assert.ok(resources.some(([, path]) => path.endsWith('.css')));
  for (const [, path] of resources) {
    const asset = await fetch(url + path);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    assert.match(
      asset.headers.get('content-type'),
      path.endsWith('.css') ? /text\/css/ : /javascript/,
    );
  }
  assert.equal((await (await fetch(`${url}/api/stats`)).json()).supportedGames.length, 15);
  const poll = await fetch(`${url}/socket.io/?EIO=4&transport=polling`);
  assert.equal(poll.headers.get('cache-control'), 'no-store');
  await assert.rejects(connect(undefined, { extraHeaders: { Origin: 'https://evil.example' } }));
  await assert.rejects(
    connect(undefined, { auth: { sessionToken: 'bad', protocolVersion: PROTOCOL_VERSION } }),
  );
  const host = await connect(),
    guest = await connect();
  const room = await ack(host.socket, 'room:create', { playerName: 'Ana', gameType: 'tictactoe' });
  assert.equal(room.success, true);
  assert.equal(
    (await ack(guest.socket, 'room:join', { playerName: 'Bruno', roomCode: room.room.code }))
      .success,
    true,
  );
  assert.equal((await ack(guest.socket, 'room:start_game')).success, false);
  assert.equal((await ack(host.socket, 'room:update_rules', { turnSeconds: -1 })).success, false);
  assert.equal((await ack(host.socket, 'room:start_game')).success, true);
  assert.equal(
    (await ack(host.socket, 'game:action', { type: 'MAKE_MOVE', index: 0 })).success,
    true,
  );
  guest.socket.disconnect();
  const resumed = await connect(guest.token);
  const recovered = await ack(resumed.socket, 'game:reconnect', { roomCode: room.room.code });
  assert.equal(recovered.state.board[0], 'X');
  assert.equal(resumed.playerId, guest.playerId);
  for (const [client, index] of [
    [resumed, 3],
    [host, 1],
    [resumed, 4],
    [host, 2],
  ])
    assert.equal(
      (await ack(client.socket, 'game:action', { type: 'MAKE_MOVE', index })).success,
      true,
    );
  assert.equal(
    (await ack(host.socket, 'game:reconnect', { roomCode: room.room.code })).state.winner,
    host.playerId,
  );
  await ack(host.socket, 'room:leave');
  await ack(resumed.socket, 'room:leave');
  const bots = await ack(host.socket, 'room:create', { playerName: 'Ana', gameType: 'tictactoe' });
  await ack(host.socket, 'room:add_bot');
  await ack(host.socket, 'room:start_game');
  await ack(host.socket, 'game:action', { type: 'MAKE_MOVE', index: 0 });
  await delay(1000);
  const botState = await ack(host.socket, 'game:reconnect', { roomCode: bots.room.code });
  assert.equal(botState.state.board.filter(Boolean).length, 2);
  await ack(host.socket, 'room:leave');
  console.log(
    'Docker HTTP, assets, CSP, polling, WebSocket, permisos, dos jugadores, reconexión y bots: OK',
  );
} finally {
  for (const socket of clients) socket.disconnect();
}
