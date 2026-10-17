import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RummyDeFichasEngine,
  validRummyDeFichasMeld,
  analyzeRummyDeFichasSet,
} from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
const tile = (id: number) =>
  id >= 104
    ? { id, value: 0, color: 4, joker: true }
    : { id, value: (id % 13) + 1, color: Math.floor(id / 13) % 4, joker: false };
test('Rummy de fichas: 106 fichas, grupos, escaleras, comodines y apertura de 30', () => {
  const e = new RummyDeFichasEngine();
  let s = e.initGame(players.slice(0, 3));
  assert.equal(s.players[0].hand.length, 14);
  assert.equal(s.pool.length, 64);
  assert.ok(validRummyDeFichasMeld([tile(0), tile(1), tile(2)]));
  assert.ok(validRummyDeFichasMeld([tile(4), tile(17), tile(30)]));
  assert.ok(validRummyDeFichasMeld([tile(8), tile(10), tile(104)]));
  assert.ok(validRummyDeFichasMeld([tile(12), tile(104), tile(105)]));
  assert.equal(analyzeRummyDeFichasSet([tile(8), tile(104), tile(105)])?.points, 30);
  assert.equal(validRummyDeFichasMeld([tile(0), tile(0), tile(0)]), false);
  assert.equal(validRummyDeFichasMeld([tile(11), tile(12), tile(0)]), false);
  assert.equal(validRummyDeFichasMeld([tile(4), tile(56), tile(17)]), false);
  s.players[0].hand = [tile(8), tile(9), tile(10), tile(51)];
  assert.equal(e.validateAction(s, 'p0', { type: 'PLAY_TABLE', sets: [[8, 9, 10]] }), true);
  s = e.applyAction(s, 'p0', { type: 'PLAY_TABLE', sets: [[8, 9, 10]] });
  assert.equal(s.players[0].opened, true);
  assert.equal(s.currentTurnPlayerId, 'p1');
  assert.equal(s.players[0].hand.length, 1);
  const v = e.getSanitizedState(s, 'p1');
  assert.equal('pool' in v, false);
  assert.equal('hand' in v.players[0], false);
  assert.equal(v.hand.length, 14);
  s.currentTurnPlayerId = 'p2';
  s.players[2].hand = [tile(0), tile(1), tile(2), tile(7)];
  assert.equal(
    e.validateAction(s, 'p2', {
      type: 'PLAY_TABLE',
      sets: [
        [8, 9, 10],
        [0, 1, 2],
      ],
    }),
    false,
  );
  assert.equal(e.validateAction(s, 'p2', { type: 'PLAY_TABLE', sets: [[7, 8, 9, 10]] }), false);
  s.players[2].hand = [tile(8 + 52), tile(9 + 52), tile(104), tile(3)];
  assert.equal(
    e.validateAction(s, 'p2', {
      type: 'PLAY_TABLE',
      sets: [
        [8, 9, 10],
        [60, 61, 104],
      ],
    }),
    true,
  );
});

test('Rummy de fichas: reorganización, dividir escaleras, liberar comodín y protección de mesa', () => {
  const e = new RummyDeFichasEngine();
  let s = e.initGame(players.slice(0, 2));
  s.players[0].opened = true;
  s.table = [[2, 3, 4, 5, 6, 7].map(tile)];
  s.players[0].hand = [tile(57), tile(45)];
  assert.equal(
    e.validateAction(s, 'p0', {
      type: 'PLAY_TABLE',
      sets: [
        [2, 3, 4, 5],
        [57, 6, 7],
      ],
    }),
    true,
  );
  assert.equal(
    e.validateAction(s, 'p0', {
      type: 'PLAY_TABLE',
      sets: [
        [2, 3, 4],
        [57, 6, 7],
      ],
    }),
    false,
  );
  assert.equal(
    e.validateAction(s, 'p0', {
      type: 'PLAY_TABLE',
      sets: [
        [2, 3, 4, 5],
        [57, 6, 7],
        [2, 3, 4],
      ],
    }),
    false,
  );
  s = e.applyAction(s, 'p0', {
    type: 'PLAY_TABLE',
    sets: [
      [2, 3, 4, 5],
      [57, 6, 7],
    ],
  });
  assert.equal(s.table.length, 2);
  assert.equal(s.players[0].hand.length, 1);
  s = e.initGame(players.slice(0, 2));
  s.players[0].opened = true;
  s.table = [[tile(8), tile(9), tile(104)]];
  s.players[0].hand = [tile(10), tile(20), tile(21), tile(1)];
  const move = {
    type: 'PLAY_TABLE' as const,
    sets: [
      [8, 9, 10],
      [20, 21, 104],
    ],
  };
  assert.ok(e.validateAction(s, 'p0', move));
  s = e.applyAction(s, 'p0', move);
  assert.equal(s.players[0].hand.length, 1);
  assert.ok(s.table[1].some((t) => t.id === 104));
  const bad = {
    type: 'PLAY_TABLE' as const,
    sets: [
      [8, 9, 10],
      [20, 21, 105],
    ],
  };
  s.currentTurnPlayerId = 'p0';
  assert.equal(e.validateAction(s, 'p0', bad), false);
});

test('Rummy de fichas: robo termina turno, pozo agotado, puntuación y abandono', () => {
  const e = new RummyDeFichasEngine();
  let s = e.initGame(players.slice(0, 2)),
    before = s.players[0].hand.length;
  s = e.applyAction(s, 'p0', { type: 'DRAW' });
  assert.equal(s.players[0].hand.length, before + 1);
  assert.equal(s.currentTurnPlayerId, 'p1');
  s.currentTurnPlayerId = 'p0';
  s.players[0].opened = true;
  s.table = [];
  s.players[0].hand = [tile(8), tile(9), tile(10)];
  s.players[1].hand = [tile(104), tile(2)];
  s = e.applyAction(s, 'p0', { type: 'PLAY_TABLE', sets: [[8, 9, 10]] });
  assert.equal(s.winner, 'p0');
  assert.equal(s.players[0].score, 33);
  assert.equal(s.players[1].score, -33);
  s = e.initGame(players.slice(0, 2));
  s.pool = [];
  s.players[0].hand = [tile(0)];
  s.players[1].hand = [tile(1)];
  s = e.applyAction(s, 'p0', { type: 'PASS' });
  s = e.applyAction(s, 'p1', { type: 'PASS' });
  assert.equal(s.winner, 'p0');
  assert.equal(s.players[0].score, 1);
  assert.equal(s.players[1].score, -1);
  s = e.initGame(players.slice(0, 2));
  s.pool = [];
  s.players[0].hand = [tile(0)];
  s.players[1].hand = [tile(52)];
  s = e.applyAction(s, 'p0', { type: 'PASS' });
  s = e.applyAction(s, 'p1', { type: 'PASS' });
  assert.equal(s.isDraw, true);
  s = e.initGame(players.slice(0, 3));
  const n = e.forfeitPlayer(s, 'p0');
  assert.equal(n.players.length, 2);
  assert.equal(n.pool.length, s.pool.length + 14);
  assert.equal(n.currentTurnPlayerId, 'p1');
});
