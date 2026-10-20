import test from 'node:test';
import assert from 'node:assert/strict';
import { ConquestEngine, CONQUEST_EDGES, conquestConnected } from '../src/index.js';
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isBot: true }));
function seed(value: number) {
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
test('Conquista: mapa conexo de dieciocho posiciones, reparto equilibrado y refuerzos limitados', () => {
  const seen = new Set([0]);
  for (let i = 0; i < 18; i++)
    for (const [a, b] of CONQUEST_EDGES) {
      if (seen.has(a)) seen.add(b);
      if (seen.has(b)) seen.add(a);
    }
  assert.equal(seen.size, 18);
  for (const n of [2, 3, 4, 5, 6]) {
    const e = new ConquestEngine(seed(n)),
      s = e.initGame(players(n));
    const counts = s.players.map((p) => s.territories.filter((t) => t.owner === p.id).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
    assert.ok(s.territories.every((t) => t.armies === 2));
    assert.equal(e.validateAction(s, 'outsider', { type: 'END_TURN' }), false);
    assert.equal(
      e.validateAction(s, 'p0', { type: 'REINFORCE', territory: 0, amount: Infinity }),
      false,
    );
  }
});
test('Conquista: refuerzos obligatorios y límite de treinta sin renovar etapas', () => {
  const e = new ConquestEngine(seed(1)),
    s = e.initGame(players(2)),
    owned = s.territories.findIndex((t) => t.owner === 'p0');
  assert.equal(e.validateAction(s, 'p0', { type: 'END_TURN' }), false);
  s.territories[owned].armies = 29;
  assert.equal(
    e.validateAction(s, 'p0', { type: 'REINFORCE', territory: owned, amount: 2 }),
    false,
  );
  const next = e.applyAction(s, 'p0', { type: 'REINFORCE', territory: owned, amount: 1 });
  assert.equal(next.territories[owned].armies, 30);
  assert.equal(s.territories[owned].armies, 29);
  assert.equal(next.reinforcements, s.reinforcements - 1);
});
test('Conquista: combate ganador ocupa, derrota pierde una y empate no elimina al último defensor', () => {
  for (const [rolls, expected] of [
    [[0.99, 0], 'capture'],
    [[0, 0.99], 'defend'],
    [[0, 0], 'tie'],
  ] as const) {
    let i = 0;
    const e = new ConquestEngine(() => rolls[i++ % 2]),
      s = e.initGame(players(2));
    i = 0;
    s.phase = 'attack';
    s.territories[0] = { owner: 'p0', armies: 4 };
    s.territories[1] = { owner: 'p1', armies: 1 };
    const troops = expected === 'tie' ? 1 : 3,
      next = e.applyAction(s, 'p0', { type: 'ATTACK', from: 0, to: 1, troops });
    if (expected === 'capture') {
      assert.equal(next.territories[1].owner, 'p0');
      assert.equal(next.territories[1].armies, 3);
      assert.equal(next.territories[0].armies, 1);
    } else {
      assert.equal(next.territories[1].owner, 'p1');
      assert.equal(next.territories[1].armies, 1);
      assert.equal(next.territories[0].armies, 3);
    }
    assert.equal(e.validateAction(s, 'p0', { type: 'ATTACK', from: 0, to: 8, troops: 1 }), false);
  }
});
test('Conquista: traslado conectado, una sola vez y sin vaciar origen', () => {
  const e = new ConquestEngine(seed(2)),
    s = e.initGame(players(2));
  s.phase = 'fortify';
  s.territories.forEach((t) => (t.owner = 'p1'));
  for (const i of [0, 1, 2]) s.territories[i] = { owner: 'p0', armies: i === 0 ? 5 : 2 };
  assert.equal(conquestConnected(s, 0, 2, 'p0'), true);
  assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', from: 0, to: 2, amount: 5 }), false);
  const next = e.applyAction(s, 'p0', { type: 'MOVE', from: 0, to: 2, amount: 4 });
  assert.equal(next.territories[0].armies, 1);
  assert.equal(next.territories[2].armies, 6);
  assert.equal(e.validateAction(next, 'p0', { type: 'MOVE', from: 2, to: 0, amount: 1 }), false);
  s.territories[1].owner = 'p1';
  assert.equal(conquestConnected(s, 0, 2, 'p0'), false);
});
test('Conquista: doce territorios, límite de rondas con empate y abandono neutral', () => {
  const e = new ConquestEngine(seed(3)),
    s = e.initGame(players(2));
  s.phase = 'attack';
  s.territories.forEach((t, i) => (t.owner = i < 12 ? 'p0' : 'p1'));
  assert.equal(e.applyAction(s, 'p0', { type: 'END_TURN' }).winner, 'p0');
  const tied = e.initGame(players(2));
  tied.phase = 'attack';
  tied.round = 15;
  tied.currentTurnPlayerId = 'p1';
  tied.territories.forEach((t, i) => (t.owner = i % 2 ? 'p1' : 'p0'));
  tied.players.forEach((p) => (p.score = 18));
  const end = e.applyAction(tied, 'p1', { type: 'END_TURN' });
  assert.deepEqual(end.winnerIds, ['p0', 'p1']);
  const active = e.initGame(players(3)),
    abandoned = e.forfeitPlayer(active, 'p1');
  assert.equal(abandoned.players[1].left, true);
  assert.ok(abandoned.territories.some((t) => t.owner === null));
  assert.equal(abandoned.winner, null);
});
test('Conquista: bots de dos a seis completan partidas con acciones legales y límites intactos', () => {
  for (const n of [2, 3, 4, 5, 6])
    for (let run = 1; run <= 3; run++) {
      const e = new ConquestEngine(seed(run));
      let s = e.initGame(players(n)),
        steps = 0;
      while (!s.winner && steps++ < 6000) {
        const a = e.getBotAction(s, s.currentTurnPlayerId);
        assert.ok(a);
        assert.ok(e.validateAction(s, s.currentTurnPlayerId, a));
        s = e.applyAction(s, s.currentTurnPlayerId, a);
        assert.ok(
          s.territories.every((t) => Number.isInteger(t.armies) && t.armies >= 1 && t.armies <= 30),
        );
      }
      assert.ok(s.winner);
      assert.ok(s.round <= 15);
    }
});
