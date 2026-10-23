import test from 'node:test';
import assert from 'node:assert/strict';
import { GoEngine } from '../src/index.js';
const players = [
  { id: 'b', isBot: true, name: 'Negras' },
  { id: 'w', isBot: true, name: 'Blancas' },
];
function fixture(black: number[], white: number[]) {
  const e = new GoEngine(),
    s = e.initGame(players);
  for (const i of black) s.board[i] = 1;
  for (const i of white) s.board[i] = 2;
  s.history = [s.board.join('')];
  return { e, s };
}
test('Go: ko impide la recaptura inmediata y admite una amenaza que crea una posición diferente', () => {
  const { e, s } = fixture([11, 19, 29], [12, 20, 30, 22]);
  let next = e.applyAction(s, 'b', { type: 'PLACE', index: 21 });
  assert.equal(next.board[20], 0);
  assert.equal(next.board[21], 1);
  assert.equal(e.validateAction(next, 'w', { type: 'PLACE', index: 20 }), false);
  next = e.applyAction(next, 'w', { type: 'PLACE', index: 0 });
  next = e.applyAction(next, 'b', { type: 'PLACE', index: 1 });
  assert.equal(e.validateAction(next, 'w', { type: 'PLACE', index: 20 }), true);
  next = e.applyAction(next, 'w', { type: 'PLACE', index: 20 });
  assert.equal(next.board[21], 0);
});
test('Go: desacuerdo reanuda sin eliminar piedras, sin borrar superko y restaurando el turno de juego', () => {
  const { e, s } = fixture([0, 1], [20]);
  let next = e.applyAction(s, 'b', { type: 'PASS' });
  next = e.applyAction(next, 'w', { type: 'PASS' });
  const history = [...next.history];
  next = e.applyAction(next, 'b', { type: 'MARK_DEAD', index: 0 });
  next = e.applyAction(next, 'b', { type: 'ACCEPT_SCORE' });
  next = e.applyAction(next, 'w', { type: 'RESUME' });
  assert.equal(next.phase, 'play');
  assert.equal(next.currentTurnPlayerId, 'b');
  assert.deepEqual(next.dead, []);
  assert.equal(next.board[0], 1);
  assert.equal(next.board[1], 1);
  assert.deepEqual(next.history, history);
});
test('Go: historia interna no se emite; vista y acciones legales no permiten mutar el estado', () => {
  const e = new GoEngine(),
    s = e.initGame(players),
    view = e.getSanitizedState(s, 'b');
  assert.equal('history' in view, false);
  assert.equal(view.legalMoves.length, 81);
  view.board[0] = 2;
  view.players[0].name = 'cambio';
  view.legalMoves.length = 0;
  assert.equal(s.board[0], 0);
  assert.equal(s.players[0].name, 'Negras');
});
