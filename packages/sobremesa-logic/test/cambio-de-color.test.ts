import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CambioDeColorEngine,
  createDeck,
  type Card,
  type CardValue,
  type CardColor,
  type CambioDeColorState,
} from '../src/index.js';

function fixture(count = 4, stacking = true, direction: 1 | -1 = 1, jumpIn = false) {
  const engine = new CambioDeColorEngine(7, stacking);
  engine.setRules({ startingCards: 7, stackDrawCards: stacking, jumpIn });
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

test('Cambio de Color: Jump-In exige una carta idéntica y reanuda el turno desde quien entra', () => {
  const { engine, state, take } = fixture(4, true, 1, true);
  const played = take('6', 'red');
  const identical = take('6', 'red');
  state.players[0].cards.push(played);
  state.players[2].cards.push(identical);
  const first = engine.applyAction(state, 'p0', action(played));
  assert.equal(first.currentTurnPlayerId, 'p1');
  assert.equal(first.jumpInWindow, true);
  assert.equal(engine.validateAction(first, 'p1', action(first.players[1].cards[0])), false);
  assert.equal(engine.validateAction(first, 'p2', action(identical)), true);
  const jumped = engine.applyAction(first, 'p2', action(identical));
  assert.equal(jumped.currentTurnPlayerId, 'p3');
  assert.equal(jumped.discardPile.at(-1)?.id, identical.id);
  assert.equal(jumped.jumpInWindow, true);
  const settled = engine.finishJumpInWindow(jumped);
  assert.equal(settled.jumpInWindow, false);
  assert.equal(settled.currentTurnPlayerId, 'p3');
  conserved(settled);
});

test('Cambio de Color: Jump-In cancela el efecto anterior y resuelve la segunda acción', () => {
  for (const value of ['skip', 'reverse', 'draw2', 'wild_draw4'] as const) {
    const { engine, state, take } = fixture(4, false, 1, true);
    const color = value === 'wild_draw4' ? 'wild' : 'red';
    const firstCard = take(value, color);
    const secondCard = take(value, color);
    state.players[0].cards.push(firstCard);
    state.players[2].cards.push(secondCard);
    const before = state.players[1].cards.length;
    const first = engine.applyAction(state, 'p0', action(firstCard));
    assert.equal(first.pendingCardAction, value);
    const jumped = engine.applyAction(first, 'p2', action(secondCard));
    assert.equal(jumped.pendingCardAction, value);
    assert.equal(jumped.pendingDraw, value === 'draw2' ? 2 : value === 'wild_draw4' ? 4 : 0);
    assert.equal(jumped.players[1].cards.length, before);
    assert.equal(jumped.turnDirection, 1);
    assert.equal(jumped.currentTurnPlayerId, value === 'reverse' ? 'p1' : 'p3');
    const settled = engine.finishJumpInWindow(jumped);
    if (value === 'skip') assert.equal(settled.currentTurnPlayerId, 'p0');
    if (value === 'reverse') {
      assert.equal(settled.turnDirection, -1);
      assert.equal(settled.currentTurnPlayerId, 'p1');
    }
    if (value === 'draw2' || value === 'wild_draw4') {
      assert.equal(settled.players[3].cards.length, before + (value === 'draw2' ? 2 : 4));
      assert.equal(settled.currentTurnPlayerId, 'p0');
      assert.equal(settled.pendingDraw, 0);
    }
    conserved(jumped);
  }
});

test('Cambio de Color: abandono durante Jump-In transfiere el efecto sin atascar el turno', () => {
  const { engine, state, take } = fixture(4, false, 1, true);
  const plusTwo = take('draw2', 'red');
  state.players[0].cards.push(plusTwo);
  const opened = engine.applyAction(state, 'p0', action(plusTwo));
  const left = engine.forfeitPlayer(opened, 'p1');
  assert.equal(left.jumpInWindow, false);
  assert.equal(left.pendingCardAction, null);
  assert.equal(left.pendingDraw, 2);
  assert.equal(left.currentTurnPlayerId, 'p2');
  assert.equal(engine.validateAction(left, 'p2', { type: 'DRAW_CARD' }), true);
  const paid = engine.applyAction(left, 'p2', { type: 'DRAW_CARD' });
  assert.equal(paid.players.find((p) => p.playerId === 'p2')?.cards.length, 3);
  assert.equal(paid.currentTurnPlayerId, 'p3');

  const reverseFixture = fixture(4, true, 1, true);
  const reverse = reverseFixture.take('reverse', 'red');
  reverseFixture.state.players[0].cards.push(reverse);
  const reversal = reverseFixture.engine.applyAction(reverseFixture.state, 'p0', action(reverse));
  const afterLeaving = reverseFixture.engine.forfeitPlayer(reversal, reversal.currentTurnPlayerId);
  assert.equal(afterLeaving.jumpInWindow, false);
  assert.equal(afterLeaving.turnDirection, -1);
  assert.equal(afterLeaving.currentTurnPlayerId, 'p2');
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
