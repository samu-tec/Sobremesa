import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MusEngine,
  musHand,
  musRank,
  musBestPlayer,
  EscobaEngine,
  escobaCaptures,
  CinquilloEngine,
  cinquilloCanPlay,
  PokerEngine,
  pokerEvaluate,
  pokerCategory,
  type PokerState,
} from '../src/index.js';
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isBot: true }));
function seed(value: number) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
const card = (rank: number, suit = 0) =>
  suit * 10 + [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].indexOf(rank);
test('Mus: ocho reyes, ocho ases, duples, medias, juego y desempate a mano', () => {
  assert.equal(musRank(card(3)), 12);
  assert.equal(musRank(card(2)), 1);
  assert.deepEqual(musHand([card(3), card(12), card(3, 1), card(12, 1)]).pairs, [3, 12, 12]);
  assert.equal(musHand([card(1), card(2), card(1, 1), card(7)]).pairBonus, 2);
  assert.equal(musHand([card(12), card(11), card(10), card(1)]).sum, 31);
  const e = new MusEngine(seed(1)),
    s = e.initGame(players(4));
  s.players.forEach((p) => (p.hand = [card(12), card(11), card(10), card(1)]));
  s.mano = 2;
  assert.equal(
    musBestPlayer(
      s,
      'juego',
      s.players.map((p) => p.id),
    ),
    'p2',
  );
  assert.throws(() => e.initGame(players(3)));
  assert.throws(() => e.initGame([players(4)[0], ...players(3)]));
});
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
test('Mus: un rechazo espera a la pareja; deje, reenvido y órdago aceptado', () => {
  const e = new MusEngine(seed(8));
  let s = e.applyAction(e.initGame(players(4)), 'p0', { type: 'CUT' });
  s = e.applyAction(s, 'p0', { type: 'BID', amount: 2 });
  assert.equal(s.currentTurnPlayerId, 'p1');
  s = e.applyAction(s, 'p1', { type: 'FOLD' });
  assert.deepEqual(s.teamPoints, [0, 0]);
  assert.equal(s.currentTurnPlayerId, 'p3');
  s = e.applyAction(s, 'p3', { type: 'BID', amount: 5 });
  assert.equal(s.bet!.previous, 2);
  while (s.bet?.team === 1) s = e.applyAction(s, s.currentTurnPlayerId, { type: 'FOLD' });
  assert.equal(s.teamPoints[1], 2);
  assert.equal(s.lance, 'chica');
  s = e.applyAction(s, s.currentTurnPlayerId, { type: 'ORDAGO' });
  s = e.applyAction(s, s.currentTurnPlayerId, { type: 'ACCEPT' });
  assert.equal(s.phase, 'finished');
  assert.equal(s.showHands, true);
  assert.equal(s.winnerIds.length, 2);
  assert.ok(Math.max(...s.teamPoints) >= 40);
});
test('Mus: partidas completas conservan cuarenta cartas, turnos legales y victoria por pareja', () => {
  for (let run = 1; run <= 10; run++) {
    const e = new MusEngine(seed(run));
    let s = e.initGame(players(4)),
      steps = 0;
    while (!s.winner && steps++ < 15000) {
      const a = e.getBotAction(s, s.currentTurnPlayerId);
      assert.ok(a);
      assert.ok(e.validateAction(s, s.currentTurnPlayerId, a));
      s = e.applyAction(s, s.currentTurnPlayerId, a);
      const cards = [...s.stock, ...s.discards, ...s.players.flatMap((p) => p.hand)];
      assert.equal(cards.length, 40);
      assert.equal(new Set(cards).size, 40);
    }
    assert.ok(s.winner);
    assert.equal(s.winnerIds.length, 2);
  }
});
test('Escoba: todas las combinaciones suman quince y no permite descartar si hay captura', () => {
  assert.deepEqual(escobaCaptures(card(7), [card(1), card(7, 1), card(10), card(3)]), [
    [card(1), card(7, 1)],
    [card(10)],
  ]);
  const e = new EscobaEngine(seed(4)),
    s = e.initGame(players(2));
  s.players[0].hand = [card(7)];
  s.table = [card(10), card(2)];
  s.currentTurnPlayerId = 'p0';
  assert.equal(e.validateAction(s, 'p0', { type: 'PLAY', card: card(7), take: [] }), false);
  assert.equal(
    e.validateAction(s, 'p0', { type: 'PLAY', card: card(7), take: [card(10), card(10)] }),
    false,
  );
  assert.equal(e.validateAction(s, 'p0', { type: 'PLAY', card: card(7), take: [card(10)] }), true);
  const v = e.getSanitizedState(s, 'p1');
  assert.equal('stock' in v, false);
  assert.ok(v.players.every((p) => !('hand' in p)));
  assert.ok(!v.hand.includes(card(7)));
});
test('Escoba: una captura que vacía mesa suma escoba y el reparto automático no la duplica', () => {
  const e = new EscobaEngine(seed(5)),
    s = e.initGame(players(2));
  s.stock = [];
  s.table = [card(10)];
  s.players[0].hand = [card(7)];
  s.players[1].hand = [];
  s.currentTurnPlayerId = 'p0';
  s.players.forEach((p) => {
    p.sweeps = 0;
    p.captured = [];
  });
  const next = e.applyAction(s, 'p0', { type: 'PLAY', card: card(7), take: [card(10)] });
  assert.equal(next.players[0].sweeps, 1);
  assert.equal(s.players[0].sweeps, 0);
  assert.equal(next.roundScores[0].sweeps, 1);
});
test('Escoba: partidas de dos, tres y cuatro con recuento y cuarenta cartas sin duplicados', () => {
  for (const n of [2, 3, 4])
    for (let run = 1; run <= 3; run++) {
      const e = new EscobaEngine(seed(run));
      e.setRules({ targetScore: 11 });
      let s = e.initGame(players(n)),
        steps = 0;
      while (!s.winner && steps++ < 6000) {
        const a = e.getBotAction(s, s.currentTurnPlayerId);
        assert.ok(a);
        assert.ok(e.validateAction(s, s.currentTurnPlayerId, a));
        s = e.applyAction(s, s.currentTurnPlayerId, a);
        const cards = [
          ...s.stock,
          ...s.table,
          ...s.players.flatMap((p) => [...p.hand, ...p.captured]),
        ];
        assert.equal(cards.length, 40);
        assert.equal(new Set(cards).size, 40);
      }
      assert.ok(s.winner);
      assert.ok(s.players.find((p) => p.id === s.winner)!.score >= 11);
    }
});
test('Cinquillo: reparte cuarenta, abre cinco de oros y obliga a jugar antes de pasar', () => {
  const e = new CinquilloEngine(seed(9)),
    s = e.initGame(players(6)),
    p = s.players.find((p) => p.id === s.currentTurnPlayerId)!;
  assert.equal(s.players.flatMap((p) => p.hand).length, 40);
  assert.ok(p.hand.includes(4));
  assert.equal(e.validateAction(s, p.id, { type: 'PASS' }), false);
  assert.equal(cinquilloCanPlay(s, 14), false);
  const next = e.applyAction(s, p.id, { type: 'PLAY', card: 4 });
  assert.deepEqual(next.lanes[0], [4, 4]);
  assert.equal(cinquilloCanPlay(next, 14), true);
  assert.equal(cinquilloCanPlay(next, 5), true);
  assert.equal(cinquilloCanPlay(next, 6), false);
  const v = e.getSanitizedState(s, p.id);
  assert.equal(v.hand.length, p.hand.length);
  assert.ok(v.players.every((p) => !('hand' in p)));
  assert.equal(e.forfeitPlayer(s, 'outsider'), s);
});
test('Cinquillo: partidas completas de tres a seis, sin fugas ni cartas perdidas', () => {
  for (const n of [3, 4, 5, 6])
    for (let run = 1; run <= 5; run++) {
      const e = new CinquilloEngine(seed(run));
      let s = e.initGame(players(n)),
        steps = 0;
      while (!s.winner && steps++ < 800) {
        const a = e.getBotAction(s, s.currentTurnPlayerId);
        assert.ok(a);
        assert.ok(e.validateAction(s, s.currentTurnPlayerId, a));
        s = e.applyAction(s, s.currentTurnPlayerId, a);
        const placed = s.lanes.reduce((sum, l) => sum + (l ? l[1] - l[0] + 1 : 0), 0);
        assert.equal(placed + s.players.reduce((sum, p) => sum + p.hand.length, 0), 40);
      }
      assert.ok(s.winner);
      assert.equal(s.players.find((p) => p.id === s.winner)!.hand.length, 0);
    }
});
const french = (rank: number, suit = 0) => suit * 13 + rank - 2;
test('Póker: nueve categorías, rueda de as y desempates de las mejores cinco entre siete', () => {
  const hands = [
    [2, 5, 7, 9, 11].map((r, i) => french(r, i % 4)),
    [2, 2, 7, 9, 11].map((r, i) => french(r, i % 4)),
    [2, 2, 7, 7, 11].map((r, i) => french(r, i % 4)),
    [2, 2, 2, 9, 11].map((r, i) => french(r, i % 4)),
    [2, 3, 4, 5, 6].map((r, i) => french(r, i % 4)),
    [2, 5, 7, 9, 11].map((r) => french(r)),
    [2, 2, 2, 9, 9].map((r, i) => french(r, i % 4)),
    [2, 2, 2, 2, 11].map((r, i) => french(r, i % 4)),
    [10, 11, 12, 13, 14].map((r) => french(r)),
  ];
  hands.forEach((h, i) => assert.equal(pokerCategory(pokerEvaluate(h)), i));
  assert.ok(
    pokerEvaluate([14, 2, 3, 4, 5].map((r, i) => french(r, i % 4))) < pokerEvaluate(hands[4]),
  );
  assert.ok(
    pokerEvaluate([
      french(14),
      french(14, 1),
      french(14, 2),
      french(13),
      french(13, 1),
      french(13, 2),
      french(2),
    ]) >
      pokerEvaluate([
        french(13),
        french(13, 1),
        french(13, 2),
        french(14),
        french(14, 1),
        french(12),
        french(2),
      ]),
  );
  assert.throws(() => pokerEvaluate([0, 0, 1, 2, 3]));
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
test('Póker: empate de mesa y ficha impar por orden a la izquierda del botón', () => {
  const e = new PokerEngine(seed(2)),
    s = river(e);
  s.board = [8, 9, 10, 11, 12];
  s.players.forEach((p, i) => {
    p.hand = [13 + i * 2, 14 + i * 2];
    p.committed = 5;
    p.bet = 5;
    p.score = 10;
    p.folded = i === 2;
  });
  s.currentBet = 5;
  s.currentTurnPlayerId = 'p0';
  s.pending = ['p0'];
  const next = e.applyAction(s, 'p0', { type: 'CHECK' });
  assert.deepEqual(
    next.players.map((p) => p.score),
    [17, 18, 10],
  );
  assert.deepEqual(next.pots[0].winnerIds, ['p1', 'p0']);
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
test('Póker: torneos de dos, cuatro y ocho terminan conservando todas las fichas y cartas únicas', () => {
  for (const n of [2, 4, 8]) {
    const e = new PokerEngine(seed(n));
    let s = e.initGame(players(n)),
      steps = 0;
    while (!s.winner && steps++ < 30000) {
      const a = e.getBotAction(s, s.currentTurnPlayerId);
      assert.ok(a);
      assert.ok(e.validateAction(s, s.currentTurnPlayerId, a));
      s = e.applyAction(s, s.currentTurnPlayerId, a);
      assert.equal(
        s.players.reduce((sum, p) => sum + p.score + p.committed, 0),
        n * 1000,
      );
      const cards = [...s.deck, ...s.burned, ...s.board, ...s.players.flatMap((p) => p.hand)];
      assert.equal(cards.length, 52);
      assert.equal(new Set(cards).size, 52);
    }
    assert.ok(s.winner);
    assert.equal(s.players.find((p) => p.id === s.winner)!.score, n * 1000);
  }
});
