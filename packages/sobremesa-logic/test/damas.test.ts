import test from 'node:test';
import assert from 'node:assert/strict';
import { DamasEngine } from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
test('Damas: captura obligatoria, cadena de saltos y coronación termina turno', () => {
  const e = new DamasEngine();
  let s = e.initGame(players.slice(0, 2));
  s.board = Array(64).fill(null);
  s.board[42] = { owner: 'p0', king: false };
  s.board[35] = { owner: 'p1', king: false };
  s.board[21] = { owner: 'p1', king: false };
  s.board[62] = { owner: 'p0', king: false };
  assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', from: 62, to: 53 }), false);
  s = e.applyAction(s, 'p0', { type: 'MOVE', from: 42, to: 28 });
  assert.equal(s.forcedFrom, 28);
  assert.equal(s.currentTurnPlayerId, 'p0');
  s = e.applyAction(s, 'p0', { type: 'MOVE', from: 28, to: 14 });
  assert.equal(s.winner, 'p0');
  s = e.initGame(players.slice(0, 2));
  s.board = Array(64).fill(null);
  s.board[17] = { owner: 'p0', king: false };
  s.board[10] = { owner: 'p1', king: false };
  s.board[12] = { owner: 'p1', king: false };
  s = e.applyAction(s, 'p0', { type: 'MOVE', from: 17, to: 3 });
  assert.equal(s.board[3]?.king, true);
  assert.equal(s.forcedFrom, null);
  assert.equal(s.currentTurnPlayerId, 'p1');
});
