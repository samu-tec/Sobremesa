import test from 'node:test';
import assert from 'node:assert/strict';
import { BackgammonEngine } from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
test('Backgammon: prioridad de barra, dado mayor, máximo de movimientos y salida', () => {
  const e = new BackgammonEngine();
  let s = e.initGame(players.slice(0, 2));
  s.currentTurnPlayerId = 'p0';
  s.phase = 'move';
  s.points = Array(24).fill(0);
  s.points[0] = 1;
  s.points[23] = -15;
  s.off = [14, 0];
  s.bar = [0, 0];
  s.dice = [1, 6];
  assert.deepEqual(
    e.getSanitizedState(s, 'p0').legalMoves.map((a) => a.die),
    [6],
  );
  assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', from: 0, die: 1 }), false);
  s = e.applyAction(s, 'p0', { type: 'MOVE', from: 0, die: 6 });
  assert.equal(s.winner, 'p0');
  assert.equal(s.multiplier, 2);
  s = e.initGame(players.slice(0, 2));
  s.currentTurnPlayerId = 'p0';
  s.phase = 'move';
  s.dice = [1, 2];
  s.bar = [1, 0];
  s.points[23] = -2;
  s.points[22] = 0;
  const legal = e.getSanitizedState(s, 'p0').legalMoves;
  assert.ok(legal.length);
  assert.ok(legal.every((a) => a.from === -1 && a.die === 2));
  s.points = Array(24).fill(0);
  s.bar = [0, 0];
  s.off = [13, 0];
  s.points[2] = 2;
  s.points[0] = -2;
  s.dice = [1, 2];
  const max = e.getSanitizedState(s, 'p0').legalMoves;
  assert.ok(max.every((a) => a.die === 1));
});
