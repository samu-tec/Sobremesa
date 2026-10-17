import test from 'node:test';
import assert from 'node:assert/strict';
import { DominoEngine } from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
test('Dominó: manos privadas, apertura obligatoria, orientación y bloqueo empatado', () => {
  const e = new DominoEngine();
  let s = e.initGame(players.slice(0, 4));
  let id = s.currentTurnPlayerId;
  const a = e.getBotAction(s, id)!;
  assert.equal(a.type, 'PLAY');
  s = e.applyAction(s, id, a);
  assert.equal(s.chain.length, 1);
  const view = e.getSanitizedState(s, 'p0');
  assert.equal('stock' in view, false);
  assert.equal('hand' in view.players[1], false);
  s.stock = [];
  s.chain = [{ id: 48, a: 6, b: 6 }];
  s.players.forEach((p, i) => (p.hand = [{ id: i, a: 0, b: 1 }]));
  for (let i = 0; i < 4; i++) {
    id = s.currentTurnPlayerId;
    s = e.applyAction(s, id, { type: 'PASS' });
  }
  assert.equal(s.phase, 'round_end');
  assert.equal(s.roundWinner, null);
});
