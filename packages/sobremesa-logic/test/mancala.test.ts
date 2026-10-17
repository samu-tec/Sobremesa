import test from 'node:test';
import assert from 'node:assert/strict';
import { MancalaEngine } from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
test('Mancala: captura, turno extra y recogida final conservan 48 semillas', () => {
  const e = new MancalaEngine();
  let s = e.initGame(players.slice(0, 2));
  s = e.applyAction(s, 'p0', { type: 'SOW', pit: 2 });
  assert.equal(s.extraTurn, true);
  assert.equal(s.currentTurnPlayerId, 'p0');
  s.pits = [0, 1, 0, 0, 0, 1, 20, 1, 1, 1, 5, 1, 1, 16];
  s = e.applyAction(s, 'p0', { type: 'SOW', pit: 1 });
  assert.equal(s.captured, 6);
  assert.equal(s.pits[6], 26);
  assert.equal(s.pits[10], 0);
});
