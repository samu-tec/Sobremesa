import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../apps/server/dist/RoomManager.js';

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
    manager.updateRoomRules(code, 'a', { turnSeconds: 30 });
    manager.startGame(code, 'a');
    context.mock.timers.tick(30000);
    assert.ok(emitted.some((e) => e.event === 'game:state_update'));
    context.mock.timers.tick(31 * 60000);
    assert.equal(manager.getRoomsCount(), 0);
    assert.ok(emitted.some((e) => e.event === 'room:closed'));
  } finally {
    manager.dispose();
    context.mock.timers.reset();
  }
});
