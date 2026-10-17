import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { requestOnConnection } from '../apps/sobremesa-client/src/services/request.ts';

const messages = { offline: 'offline', timeout: 'timeout' };
function connection() {
  return Object.assign(new EventEmitter(), { connected: true });
}
test('Un ACK de una conexión anterior no restaura una sala tras desconectar', async () => {
  const socket = connection();
  let acknowledge;
  const pending = requestOnConnection(
    socket,
    (done) => {
      acknowledge = done;
    },
    messages,
  );
  const rejected = assert.rejects(pending, /offline/);
  socket.connected = false;
  socket.emit('disconnect');
  socket.connected = true;
  acknowledge({ room: 'OLD' });
  await rejected;
  assert.equal(socket.listenerCount('disconnect'), 0);
  assert.deepEqual(await requestOnConnection(socket, (done) => done({ room: 'NEW' }), messages), {
    room: 'NEW',
  });
  assert.equal(socket.listenerCount('disconnect'), 0);
});
test('Timeout, envío fallido y socket desconectado liberan los listeners y no envían de nuevo', async () => {
  const socket = connection();
  let acknowledge;
  await assert.rejects(
    requestOnConnection(
      socket,
      (done) => {
        acknowledge = done;
      },
      messages,
      5,
    ),
    /timeout/,
  );
  acknowledge('late');
  assert.equal(socket.listenerCount('disconnect'), 0);
  await assert.rejects(
    requestOnConnection(
      socket,
      () => {
        throw new Error('send failed');
      },
      messages,
    ),
    /send failed/,
  );
  assert.equal(socket.listenerCount('disconnect'), 0);
  socket.connected = false;
  await assert.rejects(
    requestOnConnection(socket, () => assert.fail('must not send'), messages),
    /offline/,
  );
});
