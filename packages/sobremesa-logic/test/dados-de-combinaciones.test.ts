import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DadosDeCombinacionesEngine,
  combinationScore,
  combinationTotal,
  SCORE_CATEGORIES,
} from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
test('Dados de combinaciones: puntuaciones, bonus, comodín y dado guardado', () => {
  assert.equal(combinationScore([2, 2, 2, 3, 3], 'fullHouse'), 25);
  assert.equal(combinationScore([1, 2, 3, 4, 4], 'smallStraight'), 30);
  assert.equal(combinationScore([2, 3, 4, 5, 6], 'largeStraight'), 40);
  assert.equal(combinationScore([6, 6, 6, 6, 6], 'fiveKind'), 50);
  assert.equal(combinationScore([1, 1, 1, 1, 1], 'fullHouse'), 0);
  const e = new DadosDeCombinacionesEngine();
  let s = e.initGame(players.slice(0, 2));
  s = e.applyAction(s, 'p0', { type: 'ROLL', keep: [] });
  const first = s.dice[0];
  s = e.applyAction(s, 'p0', { type: 'ROLL', keep: [0] });
  assert.equal(s.dice[0], first);
  assert.equal(e.validateAction(s, 'p0', { type: 'ROLL', keep: [0, 0] }), false);
  s.players[0].scores.fiveKind = 50;
  s.dice = [6, 6, 6, 6, 6];
  s.rolls = 3;
  assert.equal(e.validateAction(s, 'p0', { type: 'SCORE', category: 'fullHouse' }), false);
  s = e.applyAction(s, 'p0', { type: 'SCORE', category: 'sixes' });
  assert.equal(s.players[0].bonus, 100);
  assert.equal(s.players[0].scores.sixes, 30);
  s.currentTurnPlayerId = 'p0';
  s.dice = [6, 6, 6, 6, 6];
  s.rolls = 1;
  assert.equal(e.getSanitizedState(s, 'p0').available.fullHouse, 25);
  s = e.applyAction(s, 'p0', { type: 'SCORE', category: 'fullHouse' });
  assert.equal(s.players[0].bonus, 200);
  assert.equal(s.players[0].scores.fullHouse, 25);
  assert.equal(
    combinationTotal({
      id: 'x',
      isBot: false,
      scores: Object.fromEntries(SCORE_CATEGORIES.slice(0, 6).map((k, i) => [k, (i + 1) * 3])),
      bonus: 0,
    }),
    98,
  );
});
