import { TicTacToeEngine } from '../src/games/tictactoe/engine.js';
import { ColorClashEngine } from '../src/games/colorclash/engine.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('--- Testing TicTacToeEngine ---');
const ttt = new TicTacToeEngine();
const tttState = ttt.initGame([
  { id: 'player1', isBot: false },
  { id: 'bot1', isBot: true },
]);

assert(tttState.players.length === 2, '2 players initialized');
assert(tttState.board.every(c => c === null), 'Empty board at start');
assert(ttt.validateAction(tttState, 'player1', { type: 'MAKE_MOVE', index: 0 }), 'Player 1 can move');
assert(!ttt.validateAction(tttState, 'bot1', { type: 'MAKE_MOVE', index: 0 }), 'Bot 1 cannot move out of turn');

// Player 1 moves to 0
const tttState1 = ttt.applyAction(tttState, 'player1', { type: 'MAKE_MOVE', index: 0 });
assert(tttState1.board[0] === 'X', 'Cell 0 marked as X');
assert(tttState1.currentTurn === 'bot1', 'Turn switched to bot1');

// Bot 1 makes a move via Minimax
const botMove = ttt.getBotAction(tttState1, 'bot1');
assert(botMove !== null && typeof botMove.index === 'number', `Bot calculated valid move: ${botMove?.index}`);
assert(tttState1.board[botMove!.index] === null, 'Bot chosen cell is empty');

// Check sanitization
const tttSanitized = ttt.getSanitizedState(tttState1, 'player1');
assert(tttSanitized.board[0] === 'X', 'Sanitized state matches');

console.log('\n--- Testing ColorClashEngine ---');
const cc = new ColorClashEngine();
const ccState = cc.initGame([
  { id: 'human1', isBot: false },
  { id: 'bot1', isBot: true },
  { id: 'bot2', isBot: true },
]);

assert(ccState.players.length === 3, '3 players initialized in Color Clash');
assert(ccState.players[0].cards.length === 7, 'Player 1 dealt 7 cards');
assert(ccState.players[1].cards.length === 7, 'Bot 1 dealt 7 cards');
assert(ccState.players[2].cards.length === 7, 'Bot 2 dealt 7 cards');
assert(ccState.discardPile.length === 1, 'Discard pile has 1 starter card');
assert(ccState.drawPile.length === 108 - (3 * 7 + 1), `Draw pile has ${108 - (3 * 7 + 1)} cards`);

// Test Server-Authoritative Sanitization
console.log('\n--- Testing Zero-Trust Data Sanitization ---');
const sanitizedForHuman1 = cc.getSanitizedState(ccState, 'human1');
assert(sanitizedForHuman1.myHand.length === 7, 'Human 1 sees their own 7 cards');
assert(sanitizedForHuman1.opponents.length === 2, 'Human 1 sees 2 opponents');
assert(sanitizedForHuman1.opponents[0].cardCount === 7, 'Opponent 1 shows card count 7');
assert((sanitizedForHuman1.opponents[0] as any).cards === undefined, 'Opponent cards are NOT leaked to client');
assert((sanitizedForHuman1 as any).drawPile === undefined, 'Draw pile array is NOT leaked to client');
assert(typeof sanitizedForHuman1.drawPileCount === 'number', 'Only draw pile count is exposed');

// Test Turn & Action logic
assert(ccState.currentTurnPlayerId === 'human1', 'First turn belongs to human1');
const botCannotPlay = cc.validateAction(ccState, 'bot1', { type: 'DRAW_CARD' });
assert(!botCannotPlay, 'Bot cannot draw out of turn');

// Human draws card
const ccStateAfterDraw = cc.applyAction(ccState, 'human1', { type: 'DRAW_CARD' });
assert(ccStateAfterDraw.players[0].cards.length === 8, 'Player now has 8 cards after drawing');

console.log('\nAll core engine and sanitization tests PASSED! 🚀');
