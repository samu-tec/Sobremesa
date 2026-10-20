import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WordsEngine,
  analyzeWordsMove,
  normalizeWord,
  QuizEngine,
  DrawingEngine,
  MysteryEngine,
  type QuizQuestion,
  type DrawWord,
  type WordPlacement,
} from '../src/index.js';
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isBot: false }));
function seed(value: number) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
const lexicon = {
  es: new Set(['SOL', 'OLA', 'SAL', 'LAS', 'OS', 'LA', 'AS', 'AL', 'LOS', 'LO', 'SO', 'SA']),
  en: new Set(['SUN', 'US', 'ON', 'NO', 'SON', 'SO', 'OS']),
};
const tiles = (row: number, col: number, indices: number[]): WordPlacement[] =>
  indices.map((rackIndex, i) => ({ row, col: col + i, rackIndex }));
test('Palabras: centro, continuidad, conexiones, atriles privados y diccionario del servidor', () => {
  const e = new WordsEngine(seed(1), lexicon),
    s = e.initGame(players(2));
  s.players[0].hand = ['S', 'O', 'L'];
  const action = { type: 'PLACE' as const, tiles: tiles(5, 4, [0, 1, 2]) };
  assert.equal(e.validateAction(s, 'p0', action), true);
  assert.equal(e.validateAction(s, 'p1', action), false);
  assert.equal(e.validateAction(s, 'p0', { ...action, tiles: tiles(0, 0, [0, 1, 2]) }), false);
  assert.equal(
    e.validateAction(s, 'p0', {
      ...action,
      tiles: [
        { row: 5, col: 4, rackIndex: 0 },
        { row: 5, col: 6, rackIndex: 2 },
      ],
    }),
    false,
  );
  const next = e.applyAction(s, 'p0', action);
  assert.equal(next.players[0].score, 5);
  assert.equal(s.board[60], null);
  assert.equal(next.board[60], 'O');
  const v = e.getSanitizedState(next, 'p1');
  assert.equal('bag' in v, false);
  assert.ok(v.players.every((p) => !('hand' in p)));
  assert.equal(v.hand.length, 7);
  s.players[0].hand = ['X', 'X'];
  assert.equal(e.validateAction(s, 'p0', { type: 'PLACE', tiles: tiles(5, 5, [0, 1]) }), false);
  assert.equal(e.validateAction(s, 'p0', { type: 'PLACE', tiles: null as never }), false);
  assert.equal(normalizeWord('cañón'), 'CAÑON');
});
test('Palabras: puntúa ambas intersecciones y rechaza diagonales o índices repetidos', () => {
  const board = Array.from({ length: 121 }, () => null as string | null);
  board[5 * 11 + 4] = 'S';
  board[5 * 11 + 6] = 'L';
  board[4 * 11 + 5] = 'L';
  board[6 * 11 + 5] = 'S';
  const move = analyzeWordsMove({ board }, ['O'], [{ row: 5, col: 5, rackIndex: 0 }]);
  assert.ok(move);
  assert.deepEqual(move.words.map((w) => w.word).sort(), ['LOS', 'SOL']);
  assert.equal(move.score, 10);
  assert.equal(
    analyzeWordsMove(
      { board },
      ['A', 'S'],
      [
        { row: 5, col: 5, rackIndex: 0 },
        { row: 7, col: 7, rackIndex: 1 },
      ],
    ),
    null,
  );
  assert.equal(
    analyzeWordsMove(
      { board },
      ['A'],
      [
        { row: 5, col: 5, rackIndex: 0 },
        { row: 5, col: 7, rackIndex: 0 },
      ],
    ),
    null,
  );
});
test('Palabras: cambios sin devolver fichas antes de robar y final por dos vueltas sin colocar', () => {
  const e = new WordsEngine(seed(2), lexicon);
  let s = e.initGame(players(3));
  const count = s.bag.length + s.players.reduce((n, p) => n + p.hand.length, 0),
    before = structuredClone(s);
  assert.equal(e.validateAction(s, 'p0', { type: 'EXCHANGE', indices: [0, 0] }), false);
  s = e.applyAction(s, 'p0', { type: 'EXCHANGE', indices: [0, 1] });
  assert.equal(s.players[0].hand.length, 7);
  assert.deepEqual(before.players[1].hand, s.players[1].hand);
  for (let i = 0; i < 5; i++) s = e.applyAction(s, s.currentTurnPlayerId, { type: 'PASS' });
  assert.ok(s.winner);
  assert.equal(s.bag.length + s.players.reduce((n, p) => n + p.hand.length, 0), count);
  assert.ok(s.players.every((p) => p.score <= 0));
});
test('Palabras: agotar la bolsa concede los restos al atril vacío y comparte empates', () => {
  const e = new WordsEngine(seed(3), lexicon),
    s = e.initGame(players(2));
  s.bag = [];
  s.players[0].hand = ['S', 'O', 'L'];
  s.players[1].hand = ['Z'];
  const next = e.applyAction(s, 'p0', { type: 'PLACE', tiles: tiles(5, 4, [0, 1, 2]) });
  assert.equal(next.winner, 'p0');
  assert.deepEqual(
    next.players.map((p) => p.score),
    [10, -5],
  );
  const tied = e.initGame(players(2));
  tied.players.forEach((p) => (p.hand = ['A']));
  let v = tied;
  for (let i = 0; i < 4; i++) v = e.applyAction(v, v.currentTurnPlayerId, { type: 'PASS' });
  assert.deepEqual(v.winnerIds, ['p0', 'p1']);
});
const bank: QuizQuestion[] = Array.from({ length: 72 }, (_, i) => ({
  id: `q${i}`,
  category: i % 2 ? 'Ciencia' : 'Lógica',
  prompt: { es: `Pregunta propia ${i}`, en: `Own question ${i}` },
  choices: { es: ['Uno', 'Dos', 'Tres', 'Cuatro'], en: ['One', 'Two', 'Three', 'Four'] },
  answer: 0,
}));
test('Preguntas: opciones barajadas, solución secreta, puntuación y respuesta inmutable', () => {
  const e = new QuizEngine(seed(4), bank),
    s = e.initGame(players(2)),
    v = e.getSanitizedState(s, 'p1');
  assert.equal(v.question.answer, null);
  assert.equal('deck' in v, false);
  assert.equal(e.validateAction(s, 'p1', { type: 'ANSWER', index: 0 }), false);
  assert.equal(e.validateAction(s, 'p0', { type: 'ANSWER', index: 4 }), false);
  const next = e.applyAction(s, 'p0', { type: 'ANSWER', index: s.question.answer });
  assert.equal(next.players[0].score, 10);
  assert.equal(next.phase, 'review');
  assert.equal(e.getSanitizedState(next, 'p1').question.answer, s.question.answer);
  assert.equal(s.players[0].score, 0);
  assert.equal(e.validateAction(next, 'p0', { type: 'ANSWER', index: 0 }), false);
});
test('Preguntas: tres y ocho turnos por persona, sin repetición, fin y empates', () => {
  for (const n of [2, 8]) {
    const e = new QuizEngine(seed(n), bank);
    e.setRules({ questionsPerPlayer: n === 8 ? 8 : 3 });
    let s = e.initGame(players(n));
    const seen = new Set<string>();
    while (!s.winner) {
      if (s.phase === 'question') {
        assert.equal(seen.has(s.question.id), false);
        seen.add(s.question.id);
        s = e.applyAction(s, s.currentTurnPlayerId, { type: 'SKIP' });
      } else s = e.applyAction(s, s.currentTurnPlayerId, { type: 'NEXT' });
    }
    assert.equal(seen.size, n * (n === 8 ? 8 : 3));
    assert.equal(s.winnerIds.length, n);
  }
});
test('Preguntas: abandono salta turnos y los bots no consultan la respuesta', () => {
  const e = new QuizEngine(seed(5), bank),
    s = e.initGame(players(3)),
    changed = structuredClone(s);
  changed.question.answer = (changed.question.answer + 1) % 4;
  const e2 = new QuizEngine(seed(5), bank);
  e2.initGame(players(3));
  assert.deepEqual(e.getBotAction(s, 'p0'), e2.getBotAction(changed, 'p0'));
  const next = e.forfeitPlayer(s, 'p0');
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.equal(next.players[0].left, true);
  assert.equal(e.forfeitPlayer(next, 'outsider'), next);
});
const drawBank: DrawWord[] = Array.from({ length: 90 }, (_, i) => ({
  es: `concepto ${i}`,
  en: `concept ${i}`,
}));
test('Dibujo: conceptos privados, papel del dibujante, mensajes acotados y límites de trazos', () => {
  let now = 1000;
  const e = new DrawingEngine(seed(6), drawBank, () => now),
    s = e.initGame(players(3));
  assert.throws(() => e.initGame(players(3).map((p) => ({ ...p, isBot: true }))));
  assert.equal(e.getSanitizedState(s, 'p1').choices.length, 0);
  assert.equal(e.getSanitizedState(s, 'p0').choices.length, 3);
  let next = e.applyAction(s, 'p0', { type: 'CHOOSE', index: 0 });
  assert.equal(e.getSanitizedState(next, 'p1').word, null);
  assert.equal(e.getSanitizedState(next, 'p0').word!.es, next.secret!.es);
  assert.equal('deck' in e.getSanitizedState(next, 'p1'), false);
  const stroke = {
    points: [
      [100, 100],
      [200, 200],
    ] as [number, number][],
    color: 0,
    width: 5,
  };
  assert.equal(e.validateAction(next, 'p1', { type: 'STROKE', stroke }), false);
  assert.equal(
    e.validateAction(next, 'p0', {
      type: 'STROKE',
      stroke: { ...stroke, points: Array.from({ length: 49 }, () => [0, 0]) },
    }),
    false,
  );
  assert.equal(
    e.validateAction(next, 'p0', { type: 'STROKE', stroke: { ...stroke, points: [[NaN, 0]] } }),
    false,
  );
  next = e.applyAction(next, 'p0', { type: 'STROKE', stroke });
  assert.equal(next.strokes.length, 1);
  assert.equal(e.validateAction(next, 'p0', { type: 'STROKE', stroke }), false);
  now += 250;
  assert.equal(e.validateAction(next, 'p0', { type: 'STROKE', stroke }), true);
  next.strokes = Array.from({ length: 120 }, () => stroke);
  assert.equal(e.validateAction(next, 'p0', { type: 'STROKE', stroke }), false);
  const cleared = e.applyAction(next, 'p0', { type: 'CLEAR' });
  assert.equal(cleared.strokes.length, 0);
});
test('Dibujo: aciertos ocultos, intentos limitados, puntuación y adelanto al acertar todos', () => {
  let now = 1000;
  const e = new DrawingEngine(seed(7), drawBank, () => now);
  let s = e.applyAction(e.initGame(players(3)), 'p0', { type: 'CHOOSE', index: 1 });
  const word = s.secret!.en;
  s = e.applyAction(s, 'p1', { type: 'GUESS', text: word });
  assert.equal(s.guesses[0].text, null);
  assert.equal(s.players[1].score, 100);
  assert.equal(s.players[0].score, 40);
  assert.equal(e.validateAction(s, 'p1', { type: 'GUESS', text: word }), false);
  assert.equal(e.getSanitizedState(s, 'p2').word, null);
  s = e.applyAction(s, 'p2', { type: 'GUESS', text: 'incorrecta' });
  assert.equal(e.validateAction(s, 'p2', { type: 'GUESS', text: word }), false);
  now += 1000;
  s = e.applyAction(s, 'p2', { type: 'GUESS', text: word });
  assert.equal(s.phase, 'review');
  assert.equal(s.players[2].score, 90);
  assert.equal(s.players[0].score, 80);
  assert.equal(e.getSanitizedState(s, 'p2').word!.en, word);
  s = e.applyAction(s, 'p0', { type: 'NEXT' });
  assert.equal(s.currentTurnPlayerId, 'p1');
  assert.equal(s.strokes.length, 0);
  assert.equal(e.getSanitizedState(s, 'p0').word, null);
});
test('Dibujo: todas las rondas terminan, reconexión y cierre privado cuando faltan personas', () => {
  const e = new DrawingEngine(seed(8), drawBank);
  e.setRules({ drawCycles: 2 });
  let s = e.initGame(players(3)),
    rounds = 0;
  while (!s.winner) {
    s = e.applyAction(s, s.currentTurnPlayerId, { type: 'CHOOSE', index: 0 });
    const word = s.secret!.es;
    for (const p of s.players.filter((p) => p.id !== s.currentTurnPlayerId))
      s = e.applyAction(s, p.id, { type: 'GUESS', text: word });
    assert.equal(s.phase, 'review');
    s = e.applyAction(s, s.currentTurnPlayerId, { type: 'NEXT' });
    rounds++;
  }
  assert.equal(rounds, 6);
  const active = e.applyAction(e.initGame(players(3)), 'p0', { type: 'CHOOSE', index: 0 }),
    end = e.forfeitPlayer(active, 'p1');
  assert.equal(end.isDraw, true);
  assert.equal(e.getSanitizedState(end, 'p2').word, null);
  assert.equal(e.getBotAction(active, 'p0'), null);
});
test('Misterio: solución de tres categorías, reparto único y refutación privada a un único destinatario', () => {
  const e = new MysteryEngine(seed(9)),
    s = e.initGame(players(3)),
    all = [...s.solution, ...s.players.flatMap((p) => p.hand)];
  assert.equal(new Set(all).size, 18);
  s.solution.forEach((c, i) => assert.ok(c >= i * 6 && c < i * 6 + 6));
  const clue = s.players[1].hand[0],
    cards = [...s.solution] as [number, number, number];
  cards[Math.floor(clue / 6)] = clue;
  const next = e.applyAction(s, 'p0', { type: 'HYPOTHESIS', cards });
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.equal(next.phase, 'refute');
  assert.equal(e.getSanitizedState(next, 'p2').showable.length, 0);
  assert.equal(e.getSanitizedState(next, 'p0').solution, null);
  const shown = e.applyAction(next, 'p1', { type: 'SHOW', card: clue });
  assert.equal(e.getSanitizedState(shown, 'p0').proofs[0].card, clue);
  assert.equal(e.getSanitizedState(shown, 'p2').proofs.length, 0);
  assert.ok(e.getSanitizedState(shown, 'p0').players.every((p) => !('hand' in p)));
  assert.equal(shown.currentTurnPlayerId, 'p0');
  assert.equal(e.validateAction(shown, 'p0', { type: 'HYPOTHESIS', cards }), false);
});
test('Misterio: acusación verificable, eliminación sin quitar refutaciones y todos fallan', () => {
  const e = new MysteryEngine(seed(10)),
    s = e.initGame(players(3)),
    wrong = [...s.solution] as [number, number, number];
  wrong[0] = (wrong[0] + 1) % 6;
  const failed = e.applyAction(s, 'p0', { type: 'ACCUSE', cards: wrong });
  assert.equal(failed.players[0].eliminated, true);
  assert.equal(failed.currentTurnPlayerId, 'p1');
  assert.equal(failed.winner, null);
  const solved = e.applyAction(failed, 'p1', { type: 'ACCUSE', cards: s.solution });
  assert.equal(solved.winner, 'p1');
  assert.deepEqual(e.getSanitizedState(solved, 'p2').solution, s.solution);
  let all = s;
  for (let i = 0; i < 3; i++)
    all = e.applyAction(all, all.currentTurnPlayerId, { type: 'ACCUSE', cards: wrong });
  assert.equal(all.isDraw, true);
  assert.equal(all.winner, null);
});
test('Misterio: bots resuelven casos completos con sus pistas y el abandono no revela manos', () => {
  for (const n of [3, 6])
    for (let run = 1; run <= 5; run++) {
      const e = new MysteryEngine(seed(run));
      let s = e.initGame(players(n)),
        steps = 0;
      while (!s.winner && steps++ < 10000) {
        const action = e.getBotAction(s, s.currentTurnPlayerId);
        assert.ok(action);
        assert.ok(e.validateAction(s, s.currentTurnPlayerId, action));
        s = e.applyAction(s, s.currentTurnPlayerId, action);
      }
      assert.ok(s.winner);
      assert.ok(s.lastAccusation!.correct);
      assert.ok(Object.values(s.proofs).every((p) => p.length <= 15));
    }
  const e = new MysteryEngine(seed(11)),
    s = e.initGame(players(3)),
    end = e.forfeitPlayer(s, 'p1');
  assert.equal(end.isDraw, true);
  assert.ok(e.getSanitizedState(end, 'p2').players.every((p) => !('hand' in p)));
});
