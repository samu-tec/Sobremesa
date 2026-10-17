import test from 'node:test';
import assert from 'node:assert/strict';
import { ImpostorEngine } from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
test('Impostor: palabra y voto privados, intento final y victoria de equipo', () => {
  const e = new ImpostorEngine();
  let s = e.initGame(players.slice(0, 4));
  s.impostorId = 'p2';
  const v = e.getSanitizedState(s, 'p2');
  assert.equal(v.word, null);
  assert.equal('secret' in v, false);
  assert.equal('impostorId' in v, false);
  assert.ok(e.getSanitizedState(s, 'p0').word);
  assert.equal(e.validateAction(s, 'p0', { type: 'CLUE', word: s.secret.es }), false);
  while (s.phase === 'clue')
    s = e.applyAction(s, s.currentTurnPlayerId, { type: 'CLUE', word: 'pista' });
  s = e.applyAction(s, 'p0', { type: 'VOTE', target: 'p2' });
  assert.deepEqual(e.getSanitizedState(s, 'p1').votes, {});
  s = e.applyAction(s, 'p1', { type: 'VOTE', target: 'p2' });
  s = e.applyAction(s, 'p2', { type: 'VOTE', target: 'p1' });
  s = e.applyAction(s, 'p3', { type: 'VOTE', target: 'p2' });
  assert.equal(s.phase, 'guess');
  let wrong = e.applyAction(s, 'p2', { type: 'GUESS', word: 'incorrecta' });
  assert.deepEqual(wrong.winnerIds, ['p0', 'p1', 'p3']);
  assert.equal(e.getSanitizedState(wrong, 'p0').revealedImpostor, 'p2');
  s = e.applyAction(s, 'p2', { type: 'GUESS', word: s.secret.en });
  assert.equal(s.winner, 'p2');
  assert.equal(s.outcome, 'guessed');
});
