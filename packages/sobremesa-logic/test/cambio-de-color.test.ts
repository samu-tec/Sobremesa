import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CambioDeColorEngine,
  createDeck,
  nextColorPlayer,
  type Card,
  type CardValue,
  type CardColor,
  type CambioDeColorState,
} from '../src/index.js';

function fixture(count = 4, stacking = true, direction: 1 | -1 = 1) {
  const engine = new CambioDeColorEngine(7, stacking);
  const state = engine.initGame(
    Array.from({ length: count }, (_, i) => ({ id: `p${i}`, isBot: true })),
  );
  const pool = createDeck();
  const take = (value: CardValue, color: CardColor = 'wild') => {
    const index = pool.findIndex((c) => c.value === value && c.color === color);
    assert.ok(index >= 0);
    return pool.splice(index, 1)[0];
  };
  state.discardPile = [take('5', 'red')];
  state.activeColor = 'red';
  state.players.forEach((p, i) => {
    p.cards = [take('1', (['red', 'blue', 'green', 'yellow'] as const)[i])];
  });
  state.drawPile = pool;
  state.turnDirection = direction;
  return { engine, state, take };
}
const action = (card: Card) => ({
  type: 'PLAY_CARD' as const,
  cardId: card.id,
  ...(card.color === 'wild' ? { chosenColor: 'green' as const } : {}),
});
function conserved(state: CambioDeColorState) {
  const cards = [...state.drawPile, ...state.discardPile, ...state.players.flatMap((p) => p.cards)];
  assert.equal(cards.length, 108);
  assert.equal(new Set(cards.map((c) => c.id)).size, 108);
}
for (const count of [2, 3, 4])
  for (const direction of [1, -1] as const)
    for (const first of ['draw2', 'wild_draw4'] as const)
      for (const second of ['draw2', 'wild_draw4'] as const)
        test(`Cambio de Color: ${count} jugadores, sentido ${direction}, ${first} → ${second}`, () => {
          const { engine, state, take } = fixture(count, true, direction);
          const firstCard = take(first, first === 'draw2' ? 'red' : 'wild');
          const nextId = nextColorPlayer(
            state.players.map((p) => p.playerId),
            'p0',
            direction,
          );
          const secondCard = take(second, second === 'draw2' ? 'blue' : 'wild');
          state.players[0].cards.push(firstCard);
          state.players.find((p) => p.playerId === nextId)!.cards.push(secondCard);
          const before = structuredClone(state);
          let next = engine.applyAction(state, 'p0', action(firstCard));
          assert.deepEqual(state, before);
          assert.equal(next.pendingDraw, first === 'draw2' ? 2 : 4);
          assert.equal(next.currentTurnPlayerId, nextId);
          const normal = next.players.find((p) => p.playerId === nextId)!.cards[0];
          assert.equal(engine.validateAction(next, nextId, action(normal)), false);
          assert.equal(engine.validateAction(next, nextId, { type: 'PASS_TURN' }), false);
          assert.equal(engine.validateAction(next, 'outsider', action(secondCard)), false);
          assert.equal(
            engine.validateAction(next, nextId, action(secondCard)),
            true,
            'La cadena ignora el color',
          );
          next = engine.applyAction(next, nextId, action(secondCard));
          const penalty = (first === 'draw2' ? 2 : 4) + (second === 'draw2' ? 2 : 4);
          assert.equal(next.pendingDraw, penalty);
          const victim = next.currentTurnPlayerId;
          const previousHand = [...next.players.find((p) => p.playerId === victim)!.cards];
          const size = previousHand.length;
          const expectedTurn = nextColorPlayer(
            next.players.map((p) => p.playerId),
            victim,
            direction,
          );
          next = engine.applyAction(next, victim, { type: 'DRAW_CARD' });
          assert.equal(
            next.players.find((p) => p.playerId === victim)!.cards.length,
            size + penalty,
          );
          assert.deepEqual(
            next.players.find((p) => p.playerId === victim)!.cards.slice(0, size),
            previousHand,
          );
          assert.equal(next.pendingDraw, 0);
          assert.equal(next.currentTurnPlayerId, expectedTurn);
          assert.equal(next.hasDrawnThisTurn, false);
          assert.equal(
            engine.applyAction(next, victim, { type: 'DRAW_CARD' }),
            next,
            'Un segundo envío no repite el cobro',
          );
          conserved(next);
        });

test('Cambio de Color: regla desactivada conserva robo inmediato, salto y victoria inmediata', () => {
  for (const value of ['draw2', 'wild_draw4'] as const) {
    const { engine, state, take } = fixture(3, false);
    const card = take(value, value === 'draw2' ? 'red' : 'wild');
    state.players[0].cards.push(card);
    const size = state.players[1].cards.length;
    const next = engine.applyAction(state, 'p0', action(card));
    assert.equal(next.pendingDraw, 0);
    assert.equal(next.players[1].cards.length, size + (value === 'draw2' ? 2 : 4));
    assert.equal(next.currentTurnPlayerId, 'p2');
    conserved(next);
  }
  const engine = new CambioDeColorEngine();
  assert.equal(
    engine.initGame([
      { id: 'a', isBot: false },
      { id: 'b', isBot: true },
    ]).stackDrawCards,
    false,
  );
});

test('Cambio de Color: +4, +2, +4 acumulan diez; reciclaje completo y mazo insuficiente', () => {
  const { engine, state, take } = fixture();
  const cards = [take('wild_draw4'), take('draw2', 'blue'), take('wild_draw4')];
  cards.forEach((card, i) => state.players[i].cards.push(card));
  let next = state;
  cards.forEach((card, i) => {
    next = engine.applyAction(next, `p${i}`, action(card));
  });
  assert.equal(next.pendingDraw, 10);
  // Put the stock below the top discard, preserving all 108 unique cards.
  next.discardPile.splice(0, 0, ...next.drawPile.splice(0));
  const top = next.discardPile.at(-1)!;
  const before = structuredClone(next);
  const resolved = engine.applyAction(next, 'p3', { type: 'DRAW_CARD' });
  assert.deepEqual(next, before);
  assert.equal(resolved.players[3].cards.length, 11);
  assert.deepEqual(resolved.discardPile.at(-1), top);
  assert.equal(resolved.pendingDraw, 0);
  conserved(resolved);
  const empty = structuredClone(before);
  empty.players[0].cards.push(...empty.discardPile.splice(0, empty.discardPile.length - 1));
  const exhausted = engine.applyAction(empty, 'p3', { type: 'DRAW_CARD' });
  assert.equal(exhausted.players[3].cards.length, 1);
  assert.equal(exhausted.pendingDraw, 0);
  assert.equal(exhausted.currentTurnPlayerId, 'p0');
  conserved(exhausted);
});

test('Cambio de Color: última penalización termina sin cobros posteriores, con y sin cadena', () => {
  for (const stack of [true, false])
    for (const value of ['draw2', 'wild_draw4'] as const) {
      const { engine, state, take } = fixture(3, stack);
      state.drawPile.push(...state.players[0].cards.splice(0));
      const card = take(value, value === 'draw2' ? 'red' : 'wild');
      state.players[0].cards = [card];
      state.pendingDraw = stack ? 6 : 0;
      const next = engine.applyAction(state, 'p0', action(card));
      assert.equal(next.winner, 'p0');
      assert.equal(next.pendingDraw, 0);
      assert.equal(next.players[1].cards.length, 1);
      assert.equal(next.activeColor, value === 'draw2' ? 'red' : 'green');
      assert.equal(engine.applyAction(next, 'p1', { type: 'DRAW_CARD' }), next);
      conserved(next);
    }
});

for (const count of [2, 3, 4])
  for (const direction of [1, -1] as const)
    test(`Cambio de Color: cambio de sentido y salto con ${count} personas, sentido ${direction}`, () => {
      const { engine, state, take } = fixture(count, true, direction);
      const reverse = take('reverse', 'red');
      state.players[0].cards.push(reverse);
      const next = engine.applyAction(state, 'p0', action(reverse));
      assert.equal(next.turnDirection, -direction);
      assert.equal(
        next.currentTurnPlayerId,
        count === 2
          ? 'p0'
          : nextColorPlayer(
              next.players.map((p) => p.playerId),
              'p0',
              direction === 1 ? -1 : 1,
            ),
      );
      const skip = take('skip', 'red');
      state.players[0].cards.push(skip);
      const skipped = engine.applyAction(state, 'p0', action(skip));
      assert.equal(
        skipped.currentTurnPlayerId,
        nextColorPlayer(
          state.players.map((p) => p.playerId),
          'p0',
          direction,
          2,
        ),
      );
    });

test('Cambio de Color: bots responden a penalizaciones mixtas o aceptan el total', () => {
  const { engine, state, take } = fixture(3);
  state.pendingDraw = 4;
  const card = take('draw2', 'blue');
  state.players[0].cards.push(card);
  assert.deepEqual(engine.getBotAction(state, 'p0'), action(card));
  const next = engine.applyAction(state, 'p0', action(card));
  assert.deepEqual(engine.getBotAction(next, 'p1'), { type: 'DRAW_CARD' });
  assert.equal(engine.getBotAction(next, 'p0'), null);
});

for (const count of [2, 3, 4])
  for (const direction of [1, -1] as const)
    test(`Cambio de Color: abandono durante una cadena con ${count} jugadores y sentido ${direction}`, () => {
      const { engine, state } = fixture(count, true, direction);
      state.pendingDraw = 6;
      const before = structuredClone(state);
      const target = nextColorPlayer(
        state.players.map((p) => p.playerId),
        'p0',
        direction,
      );
      const next = engine.forfeitPlayer(state, 'p0');
      assert.deepEqual(state, before);
      assert.equal(next.currentTurnPlayerId, target);
      assert.equal(next.pendingDraw, count === 2 ? 0 : 6);
      assert.equal(next.winner, count === 2 ? target : null);
      assert.deepEqual(
        engine.getSanitizedState(next, target).playerOrder,
        next.players.map((p) => p.playerId),
      );
      if (count > 2) {
        const other = next.players.find((p) => p.playerId !== target)!.playerId;
        assert.equal(engine.forfeitPlayer(next, other).pendingDraw, count === 3 ? 0 : 6);
      }
      conserved(next);
    });

test('Cambio de Color: proyección privada independiente y orden del motor para cada destinatario', () => {
  const { engine, state } = fixture(4);
  state.pendingDraw = 8;
  state.players.reverse();
  for (const player of state.players) {
    const projected = engine.getSanitizedState(state, player.playerId);
    assert.deepEqual(projected.playerOrder, ['p3', 'p2', 'p1', 'p0']);
    assert.equal(projected.pendingDraw, 8);
    assert.ok(projected.opponents.every((p) => !('cards' in p)));
    assert.equal('drawPile' in projected, false);
    projected.myHand[0].value = '9';
    projected.playerOrder.reverse();
    assert.notDeepEqual(projected.myHand, player.cards);
    assert.deepEqual(
      state.players.map((p) => p.playerId),
      ['p3', 'p2', 'p1', 'p0'],
    );
  }
});

for (const count of [2, 3, 4])
  test(`Cambio de Color: diez partidas completas con acumulación y ${count} bots`, () => {
    const engine = new CambioDeColorEngine(7, true);
    for (let game = 0; game < 10; game++) {
      let state = engine.initGame(
        Array.from({ length: count }, (_, i) => ({ id: `p${i}`, isBot: true })),
      );
      for (let step = 0; step < 5000 && !state.winner; step++) {
        const id = state.currentTurnPlayerId;
        const chosen = engine.getBotAction(state, id);
        assert.ok(chosen);
        assert.equal(engine.validateAction(state, id, chosen), true);
        state = engine.applyAction(state, id, chosen);
        conserved(state);
      }
      assert.ok(state.winner);
      assert.equal(state.pendingDraw, 0);
    }
  });
