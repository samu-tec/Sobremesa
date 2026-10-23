import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CuatroEnLineaEngine,
  CiudadFortunaEngine,
  TresEnRayaEngine,
  CambioDeColorEngine,
  type CiudadFortunaState,
} from '../src/index.js';
const players = [
  { id: 'a', isBot: true, name: 'Ana' },
  { id: 'b', isBot: true, name: 'Bruno' },
];
test('Cuatro en Línea: gravedad, victorias, turnos y límites', () => {
  const engine = new CuatroEnLineaEngine();
  let state = engine.initGame(players);
  for (const value of [-1, 7, 2.5, NaN, Infinity, '3'])
    assert.equal(
      engine.validateAction(state, 'a', { type: 'DROP', column: value as number }),
      false,
    );
  assert.equal(engine.validateAction(state, 'b', { type: 'DROP', column: 0 }), false);
  const first = engine.applyAction(state, 'a', { type: 'DROP', column: 0 });
  assert.equal(first.board[35], 'a');
  assert.equal(state.board[35], null);
  for (const columns of [
    [0, 6, 1, 6, 2, 5, 3],
    [0, 1, 0, 1, 0, 1, 0],
    [0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 5, 3, 3],
  ]) {
    state = engine.initGame(players);
    for (const column of columns) {
      const id = state.currentTurnPlayerId;
      assert.ok(engine.validateAction(state, id, { type: 'DROP', column }));
      state = engine.applyAction(state, id, { type: 'DROP', column });
    }
    assert.equal(state.winner, 'a');
    assert.equal(state.winningLine.length, 4);
    assert.equal(engine.validateAction(state, 'a', { type: 'DROP', column: 4 }), false);
  }
  state = engine.initGame(players);
  for (let i = 0; i < 6; i++)
    state = engine.applyAction(state, state.currentTurnPlayerId, { type: 'DROP', column: 0 });
  assert.equal(
    engine.validateAction(state, state.currentTurnPlayerId, { type: 'DROP', column: 0 }),
    false,
  );
});
test('El bot de Cuatro en Línea gana y bloquea amenazas', () => {
  const engine = new CuatroEnLineaEngine();
  let state = engine.initGame(players);
  state.board[35] = state.board[36] = state.board[37] = 'a';
  assert.deepEqual(engine.getBotAction(state, 'a'), { type: 'DROP', column: 3 });
  state = engine.initGame(players);
  state.board[35] = state.board[36] = state.board[37] = 'b';
  assert.deepEqual(engine.getBotAction(state, 'a'), { type: 'DROP', column: 3 });
});
test('El bot de Tres en Raya toma la victoria inmediata y bloquea una línea rival', () => {
  const engine = new TresEnRayaEngine();
  const state = engine.initGame(players);
  state.board = ['X', 'X', null, 'O', 'O', null, null, null, null];
  state.currentTurn = 'a';
  assert.deepEqual(engine.getBotAction(state, 'a'), { type: 'MAKE_MOVE', index: 2 });
  state.board = ['X', 'X', null, null, 'O', null, null, null, null];
  state.currentTurn = 'b';
  assert.deepEqual(engine.getBotAction(state, 'b'), { type: 'MAKE_MOVE', index: 2 });
});
test('Ciudad Fortuna: deuda antes de dobles, cárcel y abandono en subastas', () => {
  const engine = new CiudadFortunaEngine(),
    state = engine.initGame(players),
    debt: CiudadFortunaState = {
      ...state,
      players: state.players.map((p, i) => ({ ...p, cash: i === 0 ? -5 : 1500 })),
    };
  assert.equal(engine.validateAction(debt, 'a', { type: 'ROLL_DICE' }), false);
  assert.equal(engine.getBotAction(debt, 'a')?.type, 'DECLARE_BANKRUPTCY');
  const random = Math.random;
  try {
    Math.random = () => 0.18;
    const jail = { ...state, players: state.players.map((p, i) => ({ ...p, inJail: i === 0 })) };
    const next = engine.applyAction(jail, 'a', { type: 'ROLL_DICE' });
    assert.equal(next.players[0].inJail, false);
    assert.equal(next.isDouble, false);
    assert.notEqual(next.turnPhase, 'roll');
  } finally {
    Math.random = random;
  }
  let auction = engine.applyAction(
    {
      ...state,
      turnPhase: 'tile_action',
      pendingTileAction: { tileIndex: 1, actionType: 'buy_property' },
    },
    'a',
    { type: 'PASS_PROPERTY' },
  );
  auction = engine.forfeitPlayer(auction, 'b');
  assert.equal(auction.auction, null);
  assert.equal(auction.winner, 'a');
});
test('La carta robada sigue siendo privada después de pasar o abandonar el turno', () => {
  const engine = new CambioDeColorEngine();
  const state = engine.initGame([...players, { id: 'c', isBot: false }]);
  state.activeColor = 'red';
  state.discardPile = [{ id: 'top', color: 'red', value: '1' }];
  state.drawPile = [
    { id: 'unplayable', color: 'blue', value: '8' },
    { id: 'private', color: 'red', value: '7' },
  ];
  const drawn = engine.applyAction(state, 'a', { type: 'DRAW_CARD' });
  assert.equal(engine.getSanitizedState(drawn, 'a').drawnCardId, 'private');
  const passed = engine.applyAction(drawn, 'a', { type: 'PASS_TURN' });
  assert.equal(passed.currentTurnPlayerId, 'b');
  assert.equal(passed.drawnCardId, null);
  assert.equal(
    passed.players[0].cards.some((card) => card.id === 'private'),
    true,
  );
  for (const player of passed.players)
    assert.equal(engine.getSanitizedState(passed, player.playerId).drawnCardId, null);
  assert.equal(
    engine.getSanitizedState({ ...passed, drawnCardId: 'private' }, 'b').drawnCardId,
    null,
  );
  const unplayable = engine.applyAction(passed, 'b', { type: 'DRAW_CARD' });
  assert.equal(unplayable.currentTurnPlayerId, 'c');
  assert.equal(unplayable.drawnCardId, null);
  const departed = engine.forfeitPlayer(drawn, 'a');
  assert.equal(departed.currentTurnPlayerId, 'b');
  assert.equal(departed.drawnCardId, null);
  assert.equal(engine.getSanitizedState(departed, 'b').drawnCardId, null);
  const otherLeft = engine.forfeitPlayer(drawn, 'b');
  assert.equal(engine.getSanitizedState(otherLeft, 'a').drawnCardId, 'private');
  assert.equal(engine.getSanitizedState(otherLeft, 'c').drawnCardId, null);
  assert.equal(drawn.drawnCardId, 'private');
});
test('Ciudad Fortuna cobra los alquileres de calles, grupos, edificios, estaciones y servicios', () => {
  const engine = new CiudadFortunaEngine();
  const random = Math.random;
  try {
    Math.random = () => 0;
    for (const [start, indices, houses, expected] of [
      [39, [1], 0, 2],
      [39, [1, 3], 0, 4],
      [39, [1, 3], 2, 30],
      [3, [5, 15, 25, 35], 0, 200],
      [10, [12, 28], 0, 20],
    ] as [number, number[], number, number][]) {
      const state = engine.initGame(players);
      state.players[0].position = start;
      for (const index of indices)
        state.properties[index] = {
          ownerId: 'b',
          houses: index === 1 ? houses : 0,
          isMortgaged: false,
        };
      const next = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
      const salary = start === 39 ? 200 : 0;
      assert.equal(next.players[0].cash, 1500 + salary - expected);
      assert.equal(next.players[1].cash, 1500 + expected);
      state.properties[indices[0]].isMortgaged = true;
      const mortgaged = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
      assert.equal(mortgaged.players[0].cash, 1500 + salary);
      assert.equal(mortgaged.players[1].cash, 1500);
    }
  } finally {
    Math.random = random;
  }
});
test('Ciudad Fortuna paga Salida y manda a la cárcel tras tres dobles', () => {
  const engine = new CiudadFortunaEngine();
  engine.setRules({ doubleGoSalary: true });
  const random = Math.random;
  try {
    Math.random = () => 0;
    const state = engine.initGame(players);
    state.players[0].position = 38;
    const salary = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
    assert.equal(salary.players[0].cash, 1900);
    assert.equal(salary.players[0].position, 0);
    const third = engine.applyAction({ ...state, doublesRolledThisTurn: 2 }, 'a', {
      type: 'ROLL_DICE',
    });
    assert.equal(third.players[0].position, 10);
    assert.equal(third.players[0].inJail, true);
    assert.equal(third.turnPhase, 'end_turn');
    assert.equal(third.players[0].cash, 1500);
  } finally {
    Math.random = random;
  }
});
test('Ciudad Fortuna: salario doble por pasar y bonus independiente por dobles de uno', () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.34; // dados 3 y 3: pasa por Salida desde la casilla 37
    const passing = new CiudadFortunaEngine();
    passing.setRules({ doubleGoSalaryOnPass: true });
    const passState = passing.initGame(players);
    passState.players[0].position = 37;
    const passed = passing.applyAction(passState, 'a', { type: 'ROLL_DICE' });
    assert.equal(passed.players[0].position, 3);
    assert.equal(passed.players[0].cash, 1900);
    const defaultPassing = new CiudadFortunaEngine().initGame(players);
    defaultPassing.players[0].position = 37;
    assert.equal(
      new CiudadFortunaEngine().applyAction(defaultPassing, 'a', { type: 'ROLL_DICE' }).players[0]
        .cash,
      1700,
    );

    Math.random = () => 0;
    const snake = new CiudadFortunaEngine();
    snake.setRules({ snakeEyesBonus: true });
    const snakeState = snake.initGame(players);
    snakeState.players[0].position = 1;
    assert.equal(snake.applyAction(snakeState, 'a', { type: 'ROLL_DICE' }).players[0].cash, 2000);
    const withoutBonus = new CiudadFortunaEngine().initGame(players);
    withoutBonus.players[0].position = 1;
    assert.equal(
      new CiudadFortunaEngine().applyAction(withoutBonus, 'a', { type: 'ROLL_DICE' }).players[0]
        .cash,
      1500,
    );
  } finally {
    Math.random = originalRandom;
  }
});

test('Ciudad Fortuna permite vender una propiedad para saldar deudas mediante un intercambio', () => {
  const engine = new CiudadFortunaEngine();
  for (const debtor of ['a', 'b']) {
    const state = engine.initGame(players);
    state.players.find((p) => p.id === debtor)!.cash = -100;
    state.properties[1].ownerId = debtor;
    const trade = {
      fromPlayerId: 'a',
      toPlayerId: 'b',
      offeredCash: debtor === 'a' ? 0 : 100,
      requestedCash: debtor === 'a' ? 100 : 0,
      offeredPropertyIndices: debtor === 'a' ? [1] : [],
      requestedPropertyIndices: debtor === 'a' ? [] : [1],
    };
    assert.equal(engine.validateAction(state, 'a', { type: 'PROPOSE_TRADE', trade }), true);
    const proposed = engine.applyAction(state, 'a', { type: 'PROPOSE_TRADE', trade });
    const settled = engine.applyAction(proposed, 'b', {
      type: 'RESPOND_TRADE',
      tradeId: proposed.activeTrade!.id,
      accept: true,
    });
    assert.equal(settled.players.find((p) => p.id === debtor)!.cash, 0);
    assert.equal(settled.players.find((p) => p.id !== debtor)!.cash, 1400);
    assert.notEqual(settled.properties[1].ownerId, debtor);
    assert.equal(state.players.find((p) => p.id === debtor)!.cash, -100);
    assert.equal(state.properties[1].ownerId, debtor);
    const overspent = {
      ...trade,
      ...(debtor === 'a' ? { offeredCash: 1 } : { requestedCash: 1 }),
    };
    assert.equal(
      engine.validateAction(state, 'a', { type: 'PROPOSE_TRADE', trade: overspent }),
      false,
    );
  }
});

test('Un bot endeudado puede aceptar efectivo sin ofrecer dinero que no tiene', () => {
  const engine = new CiudadFortunaEngine();
  const state = engine.initGame(players);
  state.players[1].cash = -100;
  const proposed = engine.applyAction(state, 'a', {
    type: 'PROPOSE_TRADE',
    trade: {
      fromPlayerId: 'a',
      toPlayerId: 'b',
      offeredCash: 100,
      requestedCash: 0,
      offeredPropertyIndices: [],
      requestedPropertyIndices: [],
    },
  });
  const action = engine.getBotAction(proposed, 'b');
  assert.deepEqual(action, {
    type: 'RESPOND_TRADE',
    tradeId: proposed.activeTrade!.id,
    accept: true,
  });
  assert.equal(engine.validateAction(proposed, 'b', action!), true);
  assert.equal(engine.applyAction(proposed, 'b', action!).players[1].cash, 0);
});
