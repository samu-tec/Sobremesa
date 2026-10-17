import test from 'node:test';
import assert from 'node:assert/strict';
import { BatallaNavalEngine } from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
test('Batalla naval: flotas válidas, disparos privados, límites y victoria', () => {
  const e = new BatallaNavalEngine();
  let s = e.initGame(players.slice(0, 2));
  assert.equal(
    e.validateAction(s, 'p0', { type: 'PLACE', start: 9, horizontal: true, length: 5 }),
    false,
  );
  assert.equal(
    e.validateAction(s, 'p0', { type: 'PLACE', start: 99, horizontal: false, length: 2 }),
    false,
  );
  s = e.applyAction(s, 'p0', { type: 'RANDOMIZE' });
  assert.equal(new Set(s.players[0].ships.flatMap((s) => s.cells)).size, 17);
  const v = e.getSanitizedState(s, 'p1');
  assert.equal(v.ships.length, 0);
  assert.equal(v.revealedFleet, null);
  assert.equal('ships' in v.players[0], false);
  s = e.applyAction(s, 'p0', { type: 'READY' });
  s = e.applyAction(s, 'p1', { type: 'RANDOMIZE' });
  s = e.applyAction(s, 'p1', { type: 'READY' });
  assert.equal(s.phase, 'battle');
  const index = s.players[1].ships[0].cells[0];
  s = e.applyAction(s, 'p0', { type: 'FIRE', index });
  assert.equal(s.lastShot?.hit, true);
  assert.equal(e.getSanitizedState(s, 'p1').shots.length, 0);
  assert.equal(e.getSanitizedState(s, 'p1').incoming.length, 1);
  s.currentTurnPlayerId = 'p0';
  assert.equal(e.validateAction(s, 'p0', { type: 'FIRE', index }), false);
  s.players[0].shots = s.players[1].ships.flatMap((s) => s.cells).filter((i) => i !== index);
  s = e.applyAction(s, 'p0', { type: 'FIRE', index });
  assert.equal(s.winner, 'p0');
  assert.equal(e.getSanitizedState(s, 'p0').revealedFleet?.length, 5);
});
