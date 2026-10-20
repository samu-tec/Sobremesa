import test from 'node:test';
import assert from 'node:assert/strict';
import { GoEngine, goAreaScore, type GoState, type GoStone } from '../src/index.js';
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
test('Go: captura simultánea de grupos, libertades y colocación que captura antes de comprobar suicidio', () => {
  const { e, s } = fixture([2, 10, 18], [1, 9]);
  const before = structuredClone(s);
  assert.equal(e.validateAction(s, 'b', { type: 'PLACE', index: 0 }), true);
  const next = e.applyAction(s, 'b', { type: 'PLACE', index: 0 });
  assert.equal(next.board[0], 1);
  assert.equal(next.board[1], 0);
  assert.equal(next.board[9], 0);
  assert.deepEqual(next.captured, [2, 0]);
  assert.deepEqual(s, before);
  const group = fixture([0, 3, 10], [1, 2]);
  const taken = group.e.applyAction(group.s, 'b', { type: 'PLACE', index: 11 });
  assert.equal(taken.captured[0], 2);
  assert.equal(taken.board[1], 0);
  assert.equal(taken.board[2], 0);
});
test('Go: suicidio y casillas ocupadas son inválidos y no alteran el estado', () => {
  const { e, s } = fixture([], [1, 9, 11, 19]);
  for (const index of [10, 1, -1, 81, 1.5, NaN, Infinity, '3', null]) {
    const a = { type: 'PLACE', index } as never;
    assert.equal(e.validateAction(s, 'b', a), false);
    assert.equal(e.applyAction(s, 'b', a), s);
  }
  assert.equal(e.validateAction(s, 'w', { type: 'PLACE', index: 0 }), false);
  assert.equal(e.getBotAction(s, 'w'), null);
  for (const a of [
    null,
    [],
    {},
    { type: 'UNKNOWN' },
    { type: 'ACCEPT_SCORE' },
    { type: 'MARK_DEAD', index: 1 },
  ])
    assert.equal(e.validateAction(s, 'b', a as never), false);
});
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
test('Go: área, territorio neutral, komi y retirada propuesta de muertos', () => {
  const board: GoStone[] = [1, 1, 0, 1, 0, 2, 0, 2, 2];
  const mixed = goAreaScore(board, 3);
  assert.equal(mixed.black, 3);
  assert.equal(mixed.white, 10.5);
  assert.equal(mixed.neutral, 3);
  const surround: GoStone[] = [1, 1, 1, 1, 2, 1, 1, 1, 1];
  const marked = goAreaScore(surround, 3, [4]);
  assert.equal(marked.black, 9);
  assert.equal(marked.white, 7.5);
  assert.equal(marked.blackTerritory, 1);
  assert.equal(surround[4], 2);
  assert.equal(goAreaScore(Array(9).fill(0), 3).neutral, 9);
});
test('Go: dos pases abren revisión, el grupo se marca entero y una modificación invalida confirmaciones', () => {
  const { e, s } = fixture([0, 1], [20]);
  let next = e.applyAction(s, 'b', { type: 'PASS' });
  next = e.applyAction(next, 'w', { type: 'PASS' });
  assert.equal(next.phase, 'score');
  assert.equal(next.winner, null);
  assert.equal(e.validateAction(next, 'w', { type: 'MARK_DEAD', index: 0 }), false);
  next = e.applyAction(next, 'b', { type: 'MARK_DEAD', index: 0 });
  assert.deepEqual(next.dead, [0, 1]);
  next = e.applyAction(next, 'b', { type: 'ACCEPT_SCORE' });
  assert.deepEqual(next.accepted, ['b']);
  next = e.applyAction(next, 'w', { type: 'MARK_DEAD', index: 1 });
  assert.deepEqual(next.dead, []);
  assert.deepEqual(next.accepted, []);
  next = e.applyAction(next, 'w', { type: 'ACCEPT_SCORE' });
  assert.equal(next.winner, null);
  next = e.applyAction(next, 'b', { type: 'ACCEPT_SCORE' });
  assert.equal(next.phase, 'finished');
  assert.ok(next.winner);
  assert.equal(e.getBotAction(next, 'b'), null);
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
test('Go: rendirse fuera de turno y abandonar son válidos solo para participantes y antes del final', () => {
  const e = new GoEngine(),
    s = e.initGame(players);
  assert.equal(e.forfeitPlayer(s, 'other'), s);
  assert.equal(e.validateAction(s, 'other', { type: 'RESIGN' }), false);
  const next = e.applyAction(s, 'w', { type: 'RESIGN' });
  assert.equal(next.winner, 'b');
  assert.equal(e.forfeitPlayer(next, 'b'), next);
  assert.equal(e.applyAction(next, 'b', { type: 'PLACE', index: 0 }), next);
});
for (const size of [9, 13, 19])
  test(`Go: tablero ${size}, bots legales, superko y partida completa con acuerdo de área`, () => {
    let seed = size;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const e = new GoEngine(random);
    e.setRules({ boardSize: size });
    let s: GoState = e.initGame(players);
    assert.equal(s.board.length, size * size);
    for (let turn = 0; turn < 5000 && !s.winner; turn++) {
      const id = s.currentTurnPlayerId,
        a = e.getBotAction(s, id);
      assert.ok(a);
      assert.ok(e.validateAction(s, id, a));
      const previous = s,
        clone = structuredClone(s);
      s = e.applyAction(s, id, a);
      assert.deepEqual(previous, clone);
      assert.equal(new Set(s.history).size, s.history.length);
    }
    assert.ok(s.winner, 'Los bots deben completar la partida');
    assert.equal(s.phase, 'finished');
    assert.ok(s.score);
    assert.equal(e.getBotAction(s, s.currentTurnPlayerId), null);
  });
