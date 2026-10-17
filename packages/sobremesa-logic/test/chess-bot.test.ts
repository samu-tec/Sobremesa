import test from 'node:test';
import assert from 'node:assert/strict';
import { AjedrezEngine } from '../src/games/ajedrez/engine.js';

test('La poda del bot conserva las 60 elecciones de la búsqueda completa con semilla fija', () => {
  // Recorded from the exhaustive two-ply bot before pruning, including captures,
  // check responses, en passant and ties. No wall-clock assertion on shared CI.
  const expected = (
    'c2c4 c7c5 g2g4 a7a5 h2h4 e7e5 h4h5 e5e4 a2a4 h7h6 b2b3 b7b6 e2e3 d7d6 f2f4 f7f6 ' +
    'd2d4 e4d3 f1d3 c8e6 d3g6 e8e7 e3e4 d8c7 d1d3 e6g4 f4f5 a8a7 b3b4 c5b4 d3g3 g4h5 ' +
    'h1h5 c7c4 c1d2 c4e4 e1f1 e4c4 f1e1 c4e4 g1e2 b6b5 a4b5 a5a4 d2b4 e4b4 b1c3 b4a5 ' +
    'g3e3 e7d8 e3e8 d8c7 e8f8 d6d5 f8g7 c7b6 g7h8 d5d4 h8g8 d4c3'
  ).split(' ');
  const original = Math.random;
  let seed = 42;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  try {
    const engine = new AjedrezEngine();
    let state = engine.initGame([
      { id: 'a', isBot: true },
      { id: 'b', isBot: true },
    ]);
    for (const move of expected) {
      const before = structuredClone(state);
      const id = state.currentTurnPlayerId;
      const action = engine.getBotAction(state, id);
      assert.equal(action?.type, 'MOVE');
      assert.deepEqual(state, before, 'Pensar no modifica la partida');
      assert.ok(action && action.type === 'MOVE');
      assert.equal(action.from + action.to + (action.promotion || ''), move);
      assert.equal(engine.validateAction(state, id, action), true);
      state = engine.applyAction(state, id, action);
    }
  } finally {
    Math.random = original;
  }
});
