import test from 'node:test';
import assert from 'node:assert/strict';
import { AjedrezEngine, type AjedrezState, type AjedrezAction } from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
function chessMove(
  e: AjedrezEngine,
  s: AjedrezState,
  from: string,
  to: string,
  promotion?: string,
) {
  const a: AjedrezAction = { type: 'MOVE', from, to, ...(promotion ? { promotion } : {}) };
  assert.ok(e.validateAction(s, s.currentTurnPlayerId, a), `${from}-${to}`);
  return e.applyAction(s, s.currentTurnPlayerId, a);
}
test('Ajedrez: jaque mate, enroque, captura al paso, promoción y repetición', () => {
  const e = new AjedrezEngine();
  let s = e.initGame(players.slice(0, 2));
  for (const [from, to] of [
    ['f2', 'f3'],
    ['e7', 'e5'],
    ['g2', 'g4'],
    ['d8', 'h4'],
  ])
    s = chessMove(e, s, from, to);
  assert.equal(s.winner, 'p1');
  s = e.initGame(players.slice(0, 2));
  for (const [from, to] of [
    ['e2', 'e4'],
    ['a7', 'a6'],
    ['g1', 'f3'],
    ['a6', 'a5'],
    ['f1', 'e2'],
    ['b7', 'b6'],
    ['e1', 'g1'],
  ])
    s = chessMove(e, s, from, to);
  const view = e.getSanitizedState(s, 'p0');
  assert.equal(view.board.find((p) => p?.square === 'f1')?.type, 'r');
  s = e.initGame(players.slice(0, 2));
  for (const [from, to] of [
    ['e2', 'e4'],
    ['a7', 'a6'],
    ['e4', 'e5'],
    ['d7', 'd5'],
    ['e5', 'd6'],
  ])
    s = chessMove(e, s, from, to);
  assert.equal(
    e.getSanitizedState(s, 'p0').board.find((p) => p?.square === 'd5'),
    undefined,
  );
  s = e.initGame(players.slice(0, 2));
  for (const [from, to] of [
    ['a2', 'a4'],
    ['h7', 'h5'],
    ['a4', 'a5'],
    ['h5', 'h4'],
    ['a5', 'a6'],
    ['h4', 'h3'],
    ['a6', 'b7'],
    ['h3', 'g2'],
  ])
    s = chessMove(e, s, from, to);
  assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', from: 'b7', to: 'a8' }), false);
  s = chessMove(e, s, 'b7', 'a8', 'n');
  assert.equal(e.getSanitizedState(s, 'p0').board.find((p) => p?.square === 'a8')?.type, 'n');
  s = e.initGame(players.slice(0, 2));
  for (let i = 0; i < 2; i++)
    for (const [from, to] of [
      ['g1', 'f3'],
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
    ])
      s = chessMove(e, s, from, to);
  assert.equal(s.isDraw, true);
});
