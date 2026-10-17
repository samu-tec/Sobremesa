import { CiudadFortunaEngine } from '../src/games/ciudad-fortuna/engine.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('--- Testing Ciudad Fortuna Engine ---');

const engine = new CiudadFortunaEngine({
  startingCash: 2000,
  salaryGO: 200,
  doubleGoSalary: true,
  freeParkingPool: true,
  auctionEnabled: false,
  jailFine: 50,
  maxJailTurns: 3,
});

const state0 = engine.initGame([
  { id: 'player1', isBot: false, name: 'Jugador 1' },
  { id: 'bot1', isBot: true, name: 'Bot 1' },
]);

assert(state0.players.length === 2, '2 players initialized');
assert(
  state0.players[0].name === 'Jugador 1' && state0.players[1].name === 'Bot 1',
  'Visible player names are not internal IDs',
);
assert(state0.players[0].cash === 2000, 'Custom starting cash of 2000 applied');
assert(state0.currentTurnPlayerId === 'player1', 'First turn is player1');
assert(state0.turnPhase === 'roll', 'Initial phase is roll');

// Player 1 rolls dice
const state1 = engine.applyAction(state0, 'player1', { type: 'ROLL_DICE' });
assert(
  state1.logs.some((log) => log.key.includes('tiró los dados')),
  'Dice rolled on server',
);
assert(state1.lastDice[0] >= 1 && state1.lastDice[0] <= 6, 'Die 1 is 1-6');
assert(state1.lastDice[1] >= 1 && state1.lastDice[1] <= 6, 'Die 2 is 1-6');

// Check buying property
console.log('\n--- Testing Property Buying & Rent Payment ---');
// Manually set player position on property 1 (Ronda de Valencia)
const testState = {
  ...state0,
  turnPhase: 'tile_action' as const,
  pendingTileAction: {
    tileIndex: 1,
    actionType: 'buy_property' as const,
    amount: 60,
  },
};

const boughtState = engine.applyAction(testState, 'player1', { type: 'BUY_PROPERTY' });
assert(boughtState.properties[1].ownerId === 'player1', 'Property 1 owned by player1');
assert(boughtState.players[0].cash === 2000 - 60, 'Player cash deducted by property price (60)');

// Test Rent calculation when bot lands on it
const botRentState = {
  ...boughtState,
  currentTurnPlayerId: 'bot1',
  players: boughtState.players.map((p) => (p.id === 'bot1' ? { ...p, position: 0 } : { ...p })),
};

// Force bot to land on tile 1
engine.applyAction(
  {
    ...botRentState,
    lastDice: [1, 0] as [number, number],
    lastDiceSum: 1,
    isDouble: false,
    hasRolled: true,
  },
  'bot1',
  { type: 'END_TURN' },
);

console.log('\n--- Testing House Building & Monopolies ---');
// Give player 1 all Brown properties (tiles 1 and 3)
const monopolyState = {
  ...boughtState,
  properties: {
    ...boughtState.properties,
    1: { ownerId: 'player1', houses: 0, isMortgaged: false },
    3: { ownerId: 'player1', houses: 0, isMortgaged: false },
  },
  turnPhase: 'end_turn' as const,
  currentTurnPlayerId: 'player1',
};

// Validate build house
assert(
  engine.validateAction(monopolyState, 'player1', { type: 'BUILD_HOUSE', tileIndex: 1 }),
  'Can build house on brown monopoly',
);
const builtState = engine.applyAction(monopolyState, 'player1', {
  type: 'BUILD_HOUSE',
  tileIndex: 1,
});
assert(builtState.properties[1].houses === 1, 'House 1 built on property 1');

// Even building rule: cannot build house 2 on tile 1 before tile 3 has house 1!
assert(
  !engine.validateAction(builtState, 'player1', { type: 'BUILD_HOUSE', tileIndex: 1 }),
  'Even building enforced: cannot build 2nd house without building on tile 3',
);
assert(
  engine.validateAction(builtState, 'player1', { type: 'BUILD_HOUSE', tileIndex: 3 }),
  'Can build house on tile 3',
);

console.log('\n--- Testing Jail & Bail Mechanics ---');
const jailState = {
  ...state0,
  players: state0.players.map((p) =>
    p.id === 'player1' ? { ...p, inJail: true, jailTurns: 0 } : p,
  ),
  turnPhase: 'roll' as const,
  currentTurnPlayerId: 'player1',
};

assert(
  engine.validateAction(jailState, 'player1', { type: 'PAY_JAIL_FINE' }),
  'Player can pay jail fine',
);
const bailedState = engine.applyAction(jailState, 'player1', { type: 'PAY_JAIL_FINE' });
assert(!bailedState.players[0].inJail, 'Player released from jail after paying fine');
assert(bailedState.freeParkingPool === 50, 'Jail fine deposited to Free Parking jackpot');

console.log('\n--- Testing Trading System ---');
const tradeState = {
  ...boughtState,
  currentTurnPlayerId: 'player1',
  turnPhase: 'end_turn' as const,
};

const proposedTradeState = engine.applyAction(tradeState, 'player1', {
  type: 'PROPOSE_TRADE',
  trade: {
    fromPlayerId: 'player1',
    toPlayerId: 'bot1',
    offeredCash: 100,
    offeredPropertyIndices: [1],
    requestedCash: 50,
    requestedPropertyIndices: [],
  },
});

assert(proposedTradeState.activeTrade !== null, 'Trade offer active');
const tradeAcceptedState = engine.applyAction(proposedTradeState, 'bot1', {
  type: 'RESPOND_TRADE',
  tradeId: proposedTradeState.activeTrade!.id,
  accept: true,
});

assert(
  tradeAcceptedState.properties[1].ownerId === 'bot1',
  'Property transferred to bot1 in trade',
);
assert(tradeAcceptedState.activeTrade === null, 'Trade cleared after completion');

console.log('\n--- Testing Bot AI Action ---');
const botAction = engine.getBotAction(
  {
    ...state0,
    currentTurnPlayerId: 'bot1',
    turnPhase: 'roll',
    hasRolled: false,
  },
  'bot1',
);
assert(botAction !== null && botAction.type === 'ROLL_DICE', 'Bot decides to roll dice');

console.log('\nAll Ciudad Fortuna engine tests PASSED! 🎩🏢');
