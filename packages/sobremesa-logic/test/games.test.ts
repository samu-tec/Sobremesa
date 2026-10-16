import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Connect4Engine,
  ReversiEngine,
  reversiFlips,
  PigEngine,
  MonopolyEngine,
  TicTacToeEngine,
  ColorClashEngine,
  GAME_CATALOG,
  matchesGame,
  type IGameEngine,
  type MonopolyState,
} from '../src/index.js';
const players = [
  { id: 'a', isBot: true, name: 'Ana' },
  { id: 'b', isBot: true, name: 'Bruno' },
];
test('Catálogo: seis juegos, alias y reglas propias', () => {
  assert.equal(GAME_CATALOG.length, 6);
  assert.equal(new Set(GAME_CATALOG.map((g) => g.id)).size, 6);
  for (const [query, id] of [
    ['monopoly', 'monopoly'],
    ['MONÓPOLI', 'monopoly'],
    ['uno', 'colorclash'],
    ['conecta 4', 'connect4'],
    ['othello', 'reversi'],
  ])
    assert.ok(GAME_CATALOG.some((g) => g.id === id && matchesGame(g, query)));
  for (const game of GAME_CATALOG) {
    assert.ok(game.rules.length >= 4);
    assert.ok(!/monopoly|uno|richup/i.test(game.name));
  }
});
test('Cuatro en Línea: gravedad, victorias, turnos y límites', () => {
  const engine = new Connect4Engine();
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
  const engine = new Connect4Engine();
  let state = engine.initGame(players);
  state.board[35] = state.board[36] = state.board[37] = 'a';
  assert.deepEqual(engine.getBotAction(state, 'a'), { type: 'DROP', column: 3 });
  state = engine.initGame(players);
  state.board[35] = state.board[36] = state.board[37] = 'b';
  assert.deepEqual(engine.getBotAction(state, 'a'), { type: 'DROP', column: 3 });
});
test('Reversi: apertura, captura, bordes e inmutabilidad', () => {
  const engine = new ReversiEngine(),
    state = engine.initGame(players);
  assert.deepEqual(state.legalMoves, [19, 26, 37, 44]);
  assert.deepEqual(reversiFlips(state.board, 'a', 19), [27]);
  assert.equal(engine.validateAction(state, 'a', { type: 'PLACE', index: 0 }), false);
  for (const index of [-1, 64, 2.5, NaN])
    assert.equal(engine.validateAction(state, 'a', { type: 'PLACE', index }), false);
  const next = engine.applyAction(state, 'a', { type: 'PLACE', index: 19 });
  assert.equal(next.board[27], 'a');
  assert.equal(state.board[27], 'b');
  assert.equal(next.currentTurnPlayerId, 'b');
  const board = Array(64).fill(null);
  board[7] = 'b';
  board[8] = 'a';
  assert.deepEqual(reversiFlips(board, 'a', 6), []);
});
test('Reversi termina cuando nadie puede mover', () => {
  const engine = new ReversiEngine(),
    state = engine.initGame(players);
  state.board = Array(64).fill('a');
  state.board[0] = null;
  state.board[1] = 'b';
  state.legalMoves = [0];
  const next = engine.applyAction(state, 'a', { type: 'PLACE', index: 0 });
  assert.equal(next.winner, 'a');
  assert.equal(next.legalMoves.length, 0);
});
test('Dados: guardar, perder solo el turno y llegar a cien', () => {
  const engine = new PigEngine(),
    state = engine.initGame(players);
  assert.equal(engine.validateAction(state, 'a', { type: 'HOLD' }), false);
  assert.equal(engine.validateAction(state, 'b', { type: 'ROLL' }), false);
  const held = engine.applyAction({ ...state, turnTotal: 21 }, 'a', { type: 'HOLD' });
  assert.equal(held.players[0].score, 21);
  assert.equal(held.turnTotal, 0);
  assert.equal(held.currentTurnPlayerId, 'b');
  assert.equal(state.players[0].score, 0);
  const random = Math.random;
  try {
    Math.random = () => 0;
    const rolled = engine.applyAction({ ...held, turnTotal: 17 }, 'b', { type: 'ROLL' });
    assert.equal(rolled.lastRoll, 1);
    assert.equal(rolled.turnTotal, 0);
    assert.equal(rolled.players[0].score, 21);
  } finally {
    Math.random = random;
  }
  const end = engine.applyAction({ ...state, turnTotal: 100 }, 'a', { type: 'HOLD' });
  assert.equal(end.winner, 'a');
  assert.equal(engine.validateAction(end, 'a', { type: 'ROLL' }), false);
});
test('Ciudad Fortuna: todos pueden pujar y gana la oferta más alta al cerrar', () => {
  const engine = new MonopolyEngine(),
    original = engine.initGame(players),
    s = {
      ...original,
      turnPhase: 'tile_action' as const,
      pendingTileAction: { tileIndex: 1, actionType: 'buy_property' as const },
    };
  let state = engine.applyAction(s, 'a', { type: 'PASS_PROPERTY' });
  assert.equal(state.auction?.highestBidderId, null);
  assert.equal(engine.validateAction(state, 'a', { type: 'BID', amount: 10 }), true);
  assert.equal(engine.validateAction(state, 'b', { type: 'BID', amount: 10 }), true);
  for (const amount of [-1, 0, 9, 10.5, 2000, NaN])
    assert.equal(engine.validateAction(state, 'b', { type: 'BID', amount }), false);
  state = engine.applyAction(state, 'b', { type: 'BID', amount: 20 });
  assert.equal(state.players[1].cash, 1500);
  assert.equal(state.auction?.highestBidderId, 'b');
  assert.equal(engine.validateAction(state, 'a', { type: 'BID', amount: 29 }), false);
  assert.equal(engine.validateAction(state, 'a', { type: 'BID', amount: 30 }), true);
  assert.equal(engine.validateAction(state, 'b', { type: 'BID', amount: 40 }), false);
  state = engine.applyAction(state, 'a', { type: 'BID', amount: 40 });
  assert.equal(state.auction?.highestBidderId, 'a');
  assert.equal(state.auction?.currentBid, 40);
  state = engine.finishAuction(state);
  assert.equal(state.auction, null);
  assert.equal(state.properties[1].ownerId, 'a');
  assert.equal(state.players[0].cash, 1460);
  assert.equal(state.turnPhase, 'end_turn');
  assert.equal(original.properties[1].ownerId, null);
  let vacant = engine.applyAction(s, 'a', { type: 'PASS_PROPERTY' });
  vacant = engine.applyAction(vacant, 'b', { type: 'PASS_AUCTION' });
  assert.equal(vacant.auction !== null, true);
  assert.equal(engine.validateAction(vacant, 'b', { type: 'BID', amount: 10 }), false);
  vacant = engine.applyAction(vacant, 'a', { type: 'PASS_AUCTION' });
  assert.equal(vacant.auction, null);
  assert.equal(vacant.properties[1].ownerId, null);
});
test('Ciudad Fortuna: deuda antes de dobles, cárcel y abandono en subastas', () => {
  const engine = new MonopolyEngine(),
    state = engine.initGame(players),
    debt: MonopolyState = {
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
test('Cartas: solo la recién robada se puede jugar; no se filtran mazos', () => {
  const engine = new ColorClashEngine(),
    state = engine.initGame(players);
  state.activeColor = 'red';
  state.discardPile = [{ id: 'top', color: 'red', value: '1' }];
  state.players[0].cards = [{ id: 'old', color: 'red', value: '4' }];
  state.drawPile = [{ id: 'new', color: 'red', value: '7' }];
  const next = engine.applyAction(state, 'a', { type: 'DRAW_CARD' });
  assert.equal(next.hasDrawnThisTurn, true);
  assert.equal(engine.validateAction(next, 'a', { type: 'PLAY_CARD', cardId: 'old' }), false);
  assert.equal(engine.validateAction(next, 'a', { type: 'PLAY_CARD', cardId: 'new' }), true);
  const mine = engine.getSanitizedState(next, 'a'),
    theirs = engine.getSanitizedState(next, 'b');
  assert.equal(mine.drawnCardId, 'new');
  assert.equal(theirs.drawnCardId, null);
  assert.equal('drawPile' in mine, false);
  assert.equal('cards' in mine.opponents[0], false);
});
for (const [name, Engine, count, max] of [
  ['Tres en Raya', TicTacToeEngine, 2, 9],
  ['Cuatro en Línea', Connect4Engine, 2, 42],
  ['Reversi', ReversiEngine, 2, 64],
  ['Dados al 100', PigEngine, 4, 2000],
  ['Cambio de Color', ColorClashEngine, 4, 5000],
  ['Ciudad Fortuna', MonopolyEngine, 3, 20000],
] as const) {
  test(`${name}: diez partidas completas sin acciones ilegales`, () => {
    const engine: IGameEngine<any, any, any> = new Engine();
    if (engine instanceof MonopolyEngine) engine.setRules({ maxRounds: 40 });
    for (let match = 0; match < 10; match++) {
      let state = engine.initGame(
        Array.from({ length: count }, (_, i) => ({ id: `p${i}`, isBot: true, name: `Bot ${i}` })),
      );
      let steps = 0;
      while (!engine.checkWinner(state) && !state.isDraw && steps < max) {
        const id =
            (state.auction &&
              state.players.find(
                (p) =>
                  p.isBot &&
                  !p.isBankrupt &&
                  p.id !== state.auction!.highestBidderId &&
                  !state.auction!.passedPlayerIds.includes(p.id),
              )?.id) ||
            state.activeTrade?.toPlayerId ||
            state.currentTurn ||
            state.currentTurnPlayerId,
          action = engine.getBotAction(state, id);
        assert.ok(
          action,
          `${name}: bot bloqueado: ${JSON.stringify({
            phase: state.turnPhase,
            pending: state.pendingTileAction,
            auction: state.auction,
            currentTurn: state.currentTurnPlayerId,
            players: state.players.map((player: any) => ({
              id: player.id,
              cash: player.cash,
              bankrupt: player.isBankrupt,
            })),
            steps,
            id,
          })}`,
        );
        assert.ok(engine.validateAction(state, id, action), `${name}: ${JSON.stringify(action)}`);
        const before = JSON.stringify(state),
          next = engine.applyAction(state, id, action);
        assert.equal(JSON.stringify(state), before, 'No debe mutar el estado anterior');
        state = next;
        if (state.logs) state.logs = state.logs.slice(0, 80);
        steps++;
      }
      assert.ok(
        engine.checkWinner(state) || state.isDraw,
        `${name}: no terminó tras ${max} acciones`,
      );
    }
  });
}
test('Las cartas de libertad salen del mazo hasta que se usan o se devuelve la mano', () => {
  const engine = new MonopolyEngine(),
    state = engine.initGame(players);
  const card = state.chanceDeck.find((c) => c.type === 'jail_free')!;
  state.chanceDeck = [card, ...state.chanceDeck.filter((c) => c !== card)];
  state.players[0].position = 5;
  const originalRandom = Math.random;
  let next: MonopolyState;
  try {
    Math.random = () => 0;
    next = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(next.players[0].getOutOfJailFreeCards, 1);
  assert.equal(
    next.chanceDeck.some((c) => c.id === card.id),
    false,
  );
  assert.equal(next.heldJailCards.length, 1);
  assert.equal(state.heldJailCards.length, 0);
  const jailed = {
    ...next,
    currentTurnPlayerId: 'a',
    turnPhase: 'roll' as const,
    hasRolled: false,
    players: next.players.map((p, i) => ({ ...p, inJail: i === 0 })),
  };
  const released = engine.applyAction(jailed, 'a', { type: 'USE_JAIL_CARD' });
  assert.equal(released.players[0].inJail, false);
  assert.equal(released.heldJailCards.length, 0);
  assert.ok(released.chanceDeck.some((c) => c.id === card.id));
  const forfeited = engine.forfeitPlayer(next, 'a');
  assert.equal(forfeited.heldJailCards.length, 0);
  assert.ok(forfeited.chanceDeck.some((c) => c.id === card.id));
  assert.equal(next.heldJailCards.length, 1);
});
test('El límite opcional de rondas decide por patrimonio y permite empatar', () => {
  const engine = new MonopolyEngine({ maxRounds: 40 }),
    state = engine.initGame(players);
  state.currentTurnPlayerId = 'b';
  state.turnPhase = 'end_turn';
  state.round = 40;
  const tied = engine.applyAction(state, 'b', { type: 'END_TURN' });
  assert.equal(tied.isDraw, true);
  assert.equal(tied.winner, null);
  assert.equal(tied.round, 40);
  const rich = {
    ...state,
    properties: { ...state.properties, 1: { ownerId: 'a', houses: 0, isMortgaged: false } },
  };
  const won = engine.applyAction(rich, 'b', { type: 'END_TURN' });
  assert.equal(won.winner, 'a');
  assert.equal(won.isDraw, false);
});
test('Ciudad Fortuna no termina por rondas cuando el límite está desactivado', () => {
  const engine = new MonopolyEngine(),
    state = engine.initGame(players);
  state.currentTurnPlayerId = 'b';
  state.turnPhase = 'end_turn';
  state.round = 40;
  const next = engine.applyAction(state, 'b', { type: 'END_TURN' });
  assert.equal(next.round, 41);
  assert.equal(next.isDraw, false);
  assert.equal(next.winner, null);
  assert.equal(next.customRules.maxRounds, null);
});
test('Ciudad Fortuna cobra los alquileres de calles, grupos, edificios, estaciones y servicios', () => {
  const engine = new MonopolyEngine();
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
  const engine = new MonopolyEngine();
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
test('Reversi pasa automáticamente al mismo jugador y resuelve el empate final', () => {
  const engine = new ReversiEngine();
  const pass = engine.initGame(players);
  pass.board = Array(64).fill('a');
  pass.board[0] = pass.board[8] = null;
  pass.board[1] = 'b';
  for (const i of [9, 18, 27, 36, 45, 54, 63]) pass.board[i] = 'b';
  const continued = engine.applyAction(pass, 'a', { type: 'PLACE', index: 0 });
  assert.equal(continued.winner, null);
  assert.equal(continued.currentTurnPlayerId, 'a');
  assert.deepEqual(continued.legalMoves, [8]);
  const draw = engine.initGame(players);
  draw.board = Array(64).fill('b');
  draw.board[0] = null;
  for (const i of [2, 8, 9, ...Array.from({ length: 27 }, (_, i) => i + 32)]) draw.board[i] = 'a';
  const finished = engine.applyAction(draw, 'a', { type: 'PLACE', index: 0 });
  assert.equal(finished.board.filter((v) => v === 'a').length, 32);
  assert.equal(finished.isDraw, true);
  assert.equal(finished.winner, null);
});

test('Las reglas de construcción y alquiler en prisión cambian las acciones y el cobro', () => {
  const engine = new MonopolyEngine({ evenBuilding: false, rentInJail: false });
  const state = engine.initGame(players);
  state.properties[1].ownerId = state.properties[3].ownerId = 'a';
  state.properties[1].houses = 1;
  assert.equal(engine.validateAction(state, 'a', { type: 'BUILD_HOUSE', tileIndex: 1 }), true);
  state.customRules.evenBuilding = true;
  assert.equal(engine.validateAction(state, 'a', { type: 'BUILD_HOUSE', tileIndex: 1 }), false);
  const original = Math.random;
  try {
    Math.random = () => 0;
    state.players[0].position = 39;
    state.players[1].inJail = true;
    state.properties[1] = { ownerId: 'b', houses: 0, isMortgaged: false };
    const withoutRent = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
    assert.equal(withoutRent.players[1].cash, 1500);
    assert.equal(withoutRent.players[0].cash, 1700);
    state.customRules.rentInJail = true;
    const withRent = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
    assert.equal(withRent.players[1].cash, 1502);
    assert.equal(withRent.players[0].cash, 1698);
  } finally {
    Math.random = original;
  }
});
test('El reparto configurable conserva las 108 cartas y no filtra las manos', () => {
  for (const n of [5, 7, 9]) {
    const engine = new ColorClashEngine(n);
    const state = engine.initGame(players);
    assert.deepEqual(
      state.players.map((p) => p.cards.length),
      [n, n],
    );
    assert.equal(state.drawPile.length + state.discardPile.length + n * 2, 108);
    const view = engine.getSanitizedState(state, 'a');
    assert.equal(view.myHand.length, n);
    assert.equal(view.opponents[0].cardCount, n);
    assert.equal('cards' in view.opponents[0], false);
  }
});
