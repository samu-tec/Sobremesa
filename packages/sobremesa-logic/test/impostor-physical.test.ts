import test from 'node:test';
import assert from 'node:assert/strict';
import { ImpostorEngine, type ImpostorState } from '../src/index.js';
const players = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  isBot: false,
  name: `Persona ${i}`,
  isHost: i === 2,
}));
function seed(value: number) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
function game(voting = 1) {
  const e = new ImpostorEngine(seed(12));
  e.setRules({ impostorMode: 1, physicalVoting: voting, clueRounds: 1 });
  return { e, s: e.initGame(players) };
}
function clues(e: ImpostorEngine, s: ImpostorState) {
  for (let i = 0; i < s.players.length; i++) {
    assert.equal(e.validateAction(s, s.currentTurnPlayerId, { type: 'SPOKEN_CLUE' }), true);
    s = e.applyAction(s, s.currentTurnPlayerId, { type: 'SPOKEN_CLUE' });
  }
  return s;
}
test('Impostor: online conserva pistas escritas, votos digitales y rechazo de controles presenciales', () => {
  const e = new ImpostorEngine(seed(1)),
    s = e.initGame(players);
  assert.equal(s.mode, 'online');
  assert.equal(s.physicalVoting, false);
  assert.equal(e.validateAction(s, 'p0', { type: 'SPOKEN_CLUE' }), false);
  assert.equal(e.validateAction(s, 'p0', { type: 'CONFIRM_GUESS', correct: true }), false);
  assert.equal(e.validateAction(s, 'p0', { type: 'CLUE', word: 'misterio' }), true);
});
test('Impostor presencial: azar reproducible, papeles privados y categoría configurable', () => {
  const { e, s } = game(),
    other = game().s;
  assert.equal(s.impostorId, other.impostorId);
  assert.deepEqual(s.secret, other.secret);
  assert.equal(s.moderatorId, 'p2');
  for (const p of players) {
    const v = e.getSanitizedState(s, p.id);
    assert.equal('secret' in v, false);
    assert.equal('impostorId' in v, false);
    assert.equal(v.word === null, p.id === s.impostorId);
    assert.equal(v.revealedWord, null);
  }
  e.setRules({ impostorMode: 1, showCategory: false });
  assert.equal(e.getSanitizedState(e.initGame(players), 'p0').category, null);
  assert.throws(() => e.initGame(players.map((p) => ({ ...p, isBot: true }))));
  const impostors = new Set(
    Array.from(
      { length: 25 },
      (_, i) => new ImpostorEngine(seed(i + 1)).initGame(players).impostorId,
    ),
  );
  assert.ok(impostors.size > 1);
});
test('Impostor presencial: pistas habladas avanzan por asiento y no inventan texto', () => {
  const { e, s } = game();
  assert.equal(e.validateAction(s, 'p1', { type: 'SPOKEN_CLUE' }), false);
  assert.equal(e.validateAction(s, 'p0', { type: 'CLUE', word: 'misterio' }), false);
  const next = clues(e, s);
  assert.equal(s.clues.length, 0);
  assert.equal(next.phase, 'vote');
  assert.equal(next.currentTurnPlayerId, 'p2');
  assert.ok(next.clues.every((c) => c.spoken && c.word === ''));
  assert.equal(next.clues.length, 5);
  const skipped = e.applyAction(s, 'p0', { type: 'SKIP_CLUE' });
  assert.equal(skipped.clues[0].skipped, true);
});
test('Impostor presencial: solo anfitrión registra totales, límites y ausencia de votos individuales', () => {
  const { e, s } = game(),
    vote = clues(e, s),
    counts = players.map((p) => ({ playerId: p.id, count: p.id === s.impostorId ? 5 : 0 }));
  assert.equal(e.validateAction(vote, 'p0', { type: 'RECORD_VOTE', counts }), false);
  assert.equal(e.validateAction(vote, 'p2', { type: 'VOTE', target: 'p0' }), false);
  assert.equal(
    e.validateAction(vote, 'p2', {
      type: 'RECORD_VOTE',
      counts: counts.map((c) => ({ ...c, count: 5 })),
    }),
    false,
  );
  assert.equal(
    e.validateAction(vote, 'p2', {
      type: 'RECORD_VOTE',
      counts: [null, null, null, null, null] as never,
    }),
    false,
  );
  const next = e.applyAction(vote, 'p2', { type: 'RECORD_VOTE', counts });
  assert.equal(next.phase, 'guess');
  assert.equal(next.currentTurnPlayerId, 'p2');
  assert.deepEqual(next.votes, {});
  assert.deepEqual(e.getSanitizedState(next, 'p4').votes, {});
  assert.equal(next.physicalCounts![s.impostorId], 5);
});
test('Impostor presencial: desempate restringido, segundo empate y acusar a un inocente', () => {
  const { e, s } = game(),
    vote = clues(e, s),
    counts = players.map((p, i) => ({ playerId: p.id, count: i < 2 ? 2 : 0 }));
  let next = e.applyAction(vote, 'p2', { type: 'RECORD_VOTE', counts });
  assert.deepEqual(next.runoff, ['p0', 'p1']);
  assert.deepEqual(next.votes, {});
  assert.equal(
    e.validateAction(next, 'p2', {
      type: 'RECORD_VOTE',
      counts: players.map((p) => ({ playerId: p.id, count: p.id === 'p4' ? 1 : 0 })),
    }),
    false,
  );
  next = e.applyAction(next, 'p2', { type: 'RECORD_VOTE', counts });
  assert.equal(next.outcome, 'escaped');
  const innocent = players.find((p) => p.id !== s.impostorId)!.id,
    end = e.applyAction(vote, 'p2', {
      type: 'RECORD_VOTE',
      counts: players.map((p) => ({ playerId: p.id, count: p.id === innocent ? 5 : 0 })),
    });
  assert.equal(end.outcome, 'escaped');
});
test('Impostor presencial: último intento hablado autorizado y resultados coherentes', () => {
  const { e, s } = game(),
    vote = clues(e, s),
    guess = e.applyAction(vote, 'p2', {
      type: 'RECORD_VOTE',
      counts: players.map((p) => ({ playerId: p.id, count: p.id === s.impostorId ? 5 : 0 })),
    });
  assert.equal(e.validateAction(guess, 'p1', { type: 'CONFIRM_GUESS', correct: true }), false);
  assert.equal(
    e.validateAction(guess, 'p2', { type: 'CONFIRM_GUESS', correct: 'yes' as never }),
    false,
  );
  for (const correct of [true, false]) {
    const end = e.applyAction(guess, 'p2', { type: 'CONFIRM_GUESS', correct });
    assert.equal(end.outcome, correct ? 'guessed' : 'caught');
    assert.equal(end.winnerIds.length, correct ? 1 : 4);
    assert.ok(e.getSanitizedState(end, 'p1').revealedWord);
    assert.equal(end.guess, null);
  }
});
test('Impostor presencial: mantiene votación digital y moderación tras migración real del anfitrión', () => {
  const { e, s } = game(0);
  const vote = clues(e, s);
  assert.equal(vote.currentTurnPlayerId, 'p0');
  assert.equal(e.validateAction(vote, 'p2', { type: 'RECORD_VOTE', counts: [] }), false);
  const first = e.applyAction(vote, 'p0', { type: 'VOTE', target: 'p1' });
  assert.deepEqual(e.getSanitizedState(first, 'p2').votes, {});
  assert.deepEqual(e.getSanitizedState(first, 'p0').votes, { p0: 'p1' });
  const physical = game(),
    active = clues(physical.e, physical.s);
  active.impostorId = 'p1';
  const migrated = physical.e.forfeitPlayer(active, 'p2', 'p4');
  assert.equal(migrated.moderatorId, 'p4');
  assert.equal(migrated.currentTurnPlayerId, 'p4');
});
