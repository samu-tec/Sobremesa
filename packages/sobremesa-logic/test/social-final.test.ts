import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QuizEngine,
  DrawingEngine,
  MysteryEngine,
  type QuizQuestion,
  type DrawWord,
} from '../src/index.js';
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isBot: false }));
function seed(value: number) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
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
const drawBank: DrawWord[] = Array.from({ length: 90 }, (_, i) => ({
  es: `concepto ${i}`,
  en: `concept ${i}`,
}));
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
