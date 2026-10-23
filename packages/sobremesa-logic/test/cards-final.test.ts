import test from 'node:test';
import assert from 'node:assert/strict';
import { MusEngine, PokerEngine, type PokerState } from '../src/index.js';
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isBot: true }));
function seed(value: number) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
test('Mus: unanimidad de mus, descarte válido, corte y manos privadas', () => {
  const e = new MusEngine(seed(2));
  let s = e.initGame(players(4));
  for (let i = 0; i < 4; i++) s = e.applyAction(s, s.currentTurnPlayerId, { type: 'MUS' });
  assert.equal(s.phase, 'discard');
  assert.equal(e.validateAction(s, 'p0', { type: 'DISCARD', cards: [] }), false);
  const before = structuredClone(s),
    cards = s.players[0].hand.slice(0, 2);
  s = e.applyAction(s, 'p0', { type: 'DISCARD', cards });
  assert.deepEqual(before.players[0].hand.length, 4);
  assert.equal(s.players[0].hand.length, 4);
  assert.ok(cards.every((c) => !s.players[0].hand.includes(c)));
  const v = e.getSanitizedState(s, 'p1');
  assert.equal('stock' in v, false);
  assert.equal('discards' in v, false);
  assert.ok(v.players.every((p) => p.hand === null));
  assert.equal(v.hand.length, 4);
  const fresh = e.initGame(players(4)),
    cut = e.applyAction(fresh, 'p0', { type: 'CUT' });
  assert.equal(cut.phase, 'bet');
  assert.equal(cut.lance, 'grande');
});
function river(e: PokerEngine): PokerState {
  const s = e.initGame(players(3));
  s.phase = 'river';
  s.board = [0, 15, 30, 45, 8];
  s.players.forEach((p, i) => {
    p.hand = [
      [12, 25],
      [11, 24],
      [10, 23],
    ][i];
    p.folded = false;
    p.bet = [50, 100, 200][i];
    p.committed = p.bet;
    p.score = i === 2 ? 1 : 0;
  });
  s.currentBet = 200;
  s.pending = ['p2'];
  s.currentTurnPlayerId = 'p2';
  return s;
}
test('Póker: botes secundarios, límites de elegibilidad y devolución de importe sin igualar', () => {
  const e = new PokerEngine(seed(1)),
    s = river(e),
    next = e.applyAction(s, 'p2', { type: 'CHECK' });
  assert.deepEqual(
    next.players.map((p) => p.score),
    [150, 100, 101],
  );
  assert.deepEqual(
    next.pots.map((p) => p.amount),
    [150, 100, 100],
  );
  assert.equal(next.pots[2].returned, true);
  assert.deepEqual(next.pots[0].winnerIds, ['p0']);
  assert.deepEqual(next.pots[1].winnerIds, ['p1']);
  assert.equal(
    next.players.reduce((sum, p) => sum + p.score, 0),
    351,
  );
  assert.equal(s.players[0].score, 0);
});
test('Póker: las subidas all-in incompletas solo reabren al acumular una subida completa', () => {
  const e = new PokerEngine(seed(3)),
    s = e.initGame(players(4));
  s.phase = 'flop';
  s.currentBet = 100;
  s.minRaise = 100;
  s.bigBlind = 20;
  s.currentTurnPlayerId = 'p2';
  s.pending = ['p2', 'p3'];
  s.players.forEach((p, i) => {
    p.folded = false;
    p.bet = 100;
    p.committed = 100;
    p.score = i === 2 ? 50 : i === 3 ? 100 : 1000;
    p.actedAt = i < 2 ? 100 : null;
  });
  const a = e.applyAction(s, 'p2', { type: 'RAISE', to: 150 });
  assert.equal(e.getSanitizedState({ ...a, currentTurnPlayerId: 'p0' }, 'p0').canRaise, false);
  assert.equal(
    e.validateAction({ ...a, currentTurnPlayerId: 'p0' }, 'p0', { type: 'RAISE', to: 250 }),
    false,
  );
  const b = e.applyAction(a, 'p3', { type: 'RAISE', to: 200 });
  assert.equal(b.currentTurnPlayerId, 'p0');
  assert.equal(e.getSanitizedState(b, 'p0').canRaise, true);
  assert.equal(e.validateAction(b, 'p0', { type: 'RAISE', to: 300 }), true);
});
test('Póker: ciegas heads-up, cartas privadas, retirada sin mostrar y eliminación real', () => {
  const e = new PokerEngine(seed(4)),
    s = e.initGame(players(2));
  assert.equal(s.smallBlindId, 'p0');
  assert.equal(s.bigBlindId, 'p1');
  assert.equal(s.currentTurnPlayerId, 'p0');
  const v = e.getSanitizedState(s, 'p0');
  assert.equal(v.players[1].hand, null);
  assert.equal('deck' in v, false);
  assert.equal('burned' in v, false);
  assert.equal('pending' in v, false);
  const folded = e.applyAction(s, 'p0', { type: 'FOLD' });
  assert.equal(folded.showHands, false);
  assert.equal(e.getSanitizedState(folded, 'p0').players[1].hand, null);
  const lost = e.forfeitPlayer(folded, 'p0');
  assert.equal(lost.winner, 'p1');
});
