import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BriscaEngine,
  briscaPoints,
  briscaStrength,
  briscaTrickWinner,
  spanishCard,
  spanishDeck,
  SPANISH_RANKS,
  type BriscaState,
  type BriscaAction,
} from '../src/index.js';
const players = (n = 2) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isBot: true }));
const card = (suit: number, rank: number) => suit * 10 + SPANISH_RANKS.indexOf(rank as never);
function act(e: BriscaEngine, s: BriscaState, a: BriscaAction) {
  assert.equal(e.validateAction(s, s.currentTurnPlayerId, a), true);
  return e.applyAction(s, s.currentTurnPlayerId, a);
}
function seed(value: number) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
function exchangeFixture(n = 2) {
  const e = new BriscaEngine(seed(3)),
    s = e.initGame(players(n));
  s.phase = 'collect';
  s.trumpSuit = 'oros';
  s.trumpCard = card(0, 1);
  s.players[0].hand = [card(0, 7), card(0, 2)];
  s.currentTurnPlayerId = 'p0';
  s.stock = spanishDeck()
    .filter((c) => ![s.trumpCard, ...s.players[0].hand].includes(c))
    .slice(0, 9);
  return { e, s };
}
test('Brisca: cuarenta cartas, ciento veinte puntos, jerarquía y cuatro palos propios', () => {
  const deck = spanishDeck();
  assert.equal(new Set(deck).size, 40);
  assert.equal(
    deck.reduce((sum, c) => sum + briscaPoints(c), 0),
    120,
  );
  for (let suit = 0; suit < 4; suit++)
    for (const [i, rank] of [2, 4, 5, 6, 7, 10, 11, 12, 3, 1].entries())
      assert.equal(briscaStrength(card(suit, rank)), i);
  assert.deepEqual(spanishCard(card(2, 11)), { id: 28, suit: 'espadas', rank: 11 });
});
test('Brisca: solo dos o cuatro participantes, reparto y equipos alternos', () => {
  const e = new BriscaEngine(seed(3));
  for (const n of [2, 4]) {
    const s = e.initGame(players(n));
    assert.equal(s.stock.length, 39 - n * 3);
    assert.ok(s.players.every((p) => p.hand.length === 3));
    assert.deepEqual(
      s.players.map((p) => p.team),
      n === 2 ? [0, 1] : [0, 1, 0, 1],
    );
    assert.equal(s.currentTurnPlayerId, 'p0');
    assert.equal(new Set([...s.stock, s.trumpCard!, ...s.players.flatMap((p) => p.hand)]).size, 40);
  }
  for (const n of [0, 1, 3, 5]) assert.throws(() => e.initGame(players(n)));
  assert.throws(() => e.initGame([players()[0], players()[0]]));
});
test('Brisca: manda el palo de salida salvo triunfo y se compara por fuerza, no por número', () => {
  const p = (id: string, suit: number, rank: number) => ({ playerId: id, card: card(suit, rank) });
  assert.equal(briscaTrickWinner([p('a', 1, 3), p('b', 1, 12)], 'oros'), 'a');
  assert.equal(briscaTrickWinner([p('a', 1, 2), p('b', 2, 1)], 'oros'), 'a');
  assert.equal(briscaTrickWinner([p('a', 1, 1), p('b', 0, 2)], 'oros'), 'b');
  assert.equal(
    briscaTrickWinner([p('a', 0, 3), p('b', 0, 1), p('c', 0, 12), p('d', 2, 1)], 'oros'),
    'b',
  );
});
test('Brisca: cualquier carta propia es legal, fuera del palo y con el mazo agotado', () => {
  const e = new BriscaEngine(seed(9)),
    s = e.initGame(players());
  s.trick = [{ playerId: 'p1', card: 39 }];
  s.stock = [];
  s.trumpCard = null;
  for (const c of s.players[0].hand)
    assert.equal(e.validateAction(s, 'p0', { type: 'PLAY', card: c }), true);
  assert.equal(e.validateAction(s, 'p1', { type: 'PLAY', card: s.players[1].hand[0] }), false);
});
test('Brisca: resolver una baza es inmutable, suma puntos y abre una recogida', () => {
  const e = new BriscaEngine(seed(5)),
    s = e.initGame(players()),
    before = structuredClone(s);
  let next = act(e, s, { type: 'PLAY', card: s.players[0].hand[0] });
  assert.equal(next.currentTurnPlayerId, 'p1');
  next = act(e, next, { type: 'PLAY', card: next.players[1].hand[0] });
  assert.equal(next.phase, 'collect');
  assert.equal(next.lastTrick.length, 2);
  assert.equal(next.trick.length, 0);
  const winner = next.players.find((p) => p.id === next.lastTrickWinner)!;
  assert.equal(winner.captured.length, 2);
  assert.equal(
    winner.score,
    next.lastTrick.reduce((sum, p) => sum + briscaPoints(p.card), 0),
  );
  assert.deepEqual(s, before);
  const first = next.stock[0],
    second = next.stock[1],
    id = next.currentTurnPlayerId;
  next = act(e, next, { type: 'COLLECT' });
  assert.ok(next.players.find((p) => p.id === id)!.hand.includes(first));
  assert.ok(next.players.find((p) => p.id !== id)!.hand.includes(second));
  assert.equal(next.currentTurnPlayerId, id);
  assert.equal(next.phase, 'play');
});
test('Brisca: siete y dos cambian el triunfo antes del robo, nunca cartas del compañero', () => {
  const { e, s } = exchangeFixture(4);
  let next = act(e, s, { type: 'EXCHANGE', card: card(0, 7) });
  assert.equal(next.trumpCard, card(0, 7));
  assert.ok(next.players[0].hand.includes(card(0, 1)));
  assert.equal(next.players[0].hand.includes(card(0, 7)), false);
  next = act(e, next, { type: 'EXCHANGE', card: card(0, 2) });
  assert.equal(next.trumpCard, card(0, 2));
  assert.ok(next.players[0].hand.includes(card(0, 7)));
  assert.equal(e.getSanitizedState(next, 'p0').exchangeCard, null);
  assert.equal(e.validateAction(s, 'p2', { type: 'EXCHANGE', card: card(0, 7) }), false);
  const off = structuredClone(s);
  off.exchangeAllowed = false;
  assert.equal(e.validateAction(off, 'p0', { type: 'EXCHANGE', card: card(0, 7) }), false);
});
test('Brisca: no se cambia en el último robo y la pinta se roba al final en orden de ganador', () => {
  for (const n of [2, 4]) {
    const { e, s } = exchangeFixture(n);
    s.stock = Array.from({ length: n - 1 }, (_, i) => 10 + i);
    assert.equal(e.getSanitizedState(s, 'p0').exchangeCard, null);
    assert.equal(e.validateAction(s, 'p0', { type: 'EXCHANGE', card: card(0, 7) }), false);
    const face = s.trumpCard,
      next = act(e, s, { type: 'COLLECT' });
    assert.equal(next.stock.length, 0);
    assert.equal(next.trumpCard, null);
    assert.ok(next.players.at(-1)!.hand.includes(face!));
    assert.equal(e.getSanitizedState(next, 'p0').stockCount, 0);
  }
});
test('Brisca: empate a sesenta anula el reparto y el nuevo dador rota la mano', () => {
  const e = new BriscaEngine(seed(6)),
    s = e.initGame(players());
  s.stock = [];
  s.trumpCard = null;
  s.trumpSuit = 'oros';
  s.players[0].hand = [card(3, 2)];
  s.players[1].hand = [card(3, 4)];
  s.players[0].captured = spanishDeck().filter(
    (c) => c >= 20 && ![card(3, 2), card(3, 4)].includes(c),
  );
  s.players[0].score = 60;
  s.players[1].captured = [
    card(0, 1),
    card(0, 3),
    card(0, 12),
    card(0, 11),
    card(0, 10),
    card(1, 1),
    card(1, 3),
    card(1, 12),
    card(1, 11),
    card(1, 10),
  ];
  s.players[1].score = 60;
  let next = act(e, s, { type: 'PLAY', card: s.players[0].hand[0] });
  next = act(e, next, { type: 'PLAY', card: next.players[1].hand[0] });
  assert.equal(next.phase, 'round_end');
  assert.equal(next.winner, null);
  assert.deepEqual(next.wins, [0, 0]);
  assert.equal(next.roundWinner, null);
  next = act(e, next, { type: 'NEXT_ROUND' });
  assert.equal(next.round, 2);
  assert.equal(next.dealer, 0);
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.ok(next.players.every((p) => p.score === 0 && p.hand.length === 3));
});
test('Brisca: manos y mazo privados, compañero sin acceso e independencia de vistas', () => {
  const e = new BriscaEngine(() => 0.4),
    s = e.initGame(players(4)),
    view = e.getSanitizedState(s, 'p0');
  assert.equal('stock' in view, false);
  assert.ok(view.players.every((p) => !('hand' in p)));
  assert.ok(!view.hand.some((c) => s.players[2].hand.includes(c)));
  assert.deepEqual(e.getSanitizedState(s, 'other').hand, []);
  const changed = structuredClone(s),
    cards = changed.stock.splice(0, 3);
  changed.stock.push(...changed.players[2].hand);
  changed.players[2].hand = cards;
  assert.deepEqual(e.getBotAction(s, 'p0'), e.getBotAction(changed, 'p0'));
  view.hand.length = 0;
  view.players[0].captured.push(10);
  assert.equal(s.players[0].hand.length, 3);
  assert.equal(s.players[0].captured.length, 0);
});
test('Brisca: datos malformados, turnos, cartas ajenas y abandono por equipos', () => {
  const e = new BriscaEngine(),
    s = e.initGame(players(4));
  for (const a of [
    null,
    [],
    {},
    { type: 'UNKNOWN' },
    { type: 'COLLECT' },
    { type: 'NEXT_ROUND' },
    { type: 'PLAY', card: 40 },
    { type: 'PLAY', card: -1 },
    { type: 'PLAY', card: 1.5 },
    { type: 'PLAY', card: '1' },
    { type: 'PLAY', card: NaN },
    { type: 'EXCHANGE', card: 0 },
    { type: 'PLAY', card: s.players[1].hand[0] },
  ]) {
    assert.equal(e.validateAction(s, 'p0', a as never), false);
    assert.equal(e.applyAction(s, 'p0', a as never), s);
  }
  assert.equal(e.getBotAction(s, 'p1'), null);
  assert.equal(e.forfeitPlayer(s, 'other'), s);
  const ended = e.forfeitPlayer(s, 'p2');
  assert.deepEqual(ended.winnerIds, ['p1', 'p3']);
  assert.equal(ended.winner, 'p1');
  assert.equal(e.forfeitPlayer(ended, 'p0'), ended);
  assert.equal(e.getBotAction(ended, 'p1'), null);
  assert.ok(e.getSanitizedState(ended, 'p1').players.every((p) => !('hand' in p)));
});
for (const n of [2, 4])
  test(`Brisca: partidas completas de ${n} bots, objetivos y conservación`, () => {
    for (const target of [1, 3, 5])
      for (const exchange of [true, false]) {
        const e = new BriscaEngine(seed(n * target + (exchange ? 1 : 2)));
        e.setRules({ targetWins: target, trumpExchange: exchange });
        let s = e.initGame(players(n)),
          steps = 0;
        while (!s.winner && steps++ < 2000) {
          const id = s.currentTurnPlayerId,
            a = e.getBotAction(s, id);
          assert.ok(a);
          assert.equal(e.validateAction(s, id, a), true);
          s = e.applyAction(s, id, a);
          const all = [
            ...s.stock,
            ...s.players.flatMap((p) => [...p.hand, ...p.captured]),
            ...s.trick.map((p) => p.card),
            ...(s.trumpCard === null ? [] : [s.trumpCard]),
          ];
          assert.equal(all.length, 40);
          assert.equal(new Set(all).size, 40);
        }
        assert.ok(s.winner);
        assert.equal(Math.max(...s.wins), target);
        assert.equal(
          s.players.reduce((sum, p) => sum + p.score, 0),
          120,
        );
        assert.equal(s.winnerIds.length, n === 4 ? 2 : 1);
        assert.ok(
          s.winnerIds.every(
            (id) =>
              s.players.find((p) => p.id === id)!.team ===
              s.players.find((p) => p.id === s.winner)!.team,
          ),
        );
      }
  });
