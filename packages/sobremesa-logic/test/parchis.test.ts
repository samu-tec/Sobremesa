import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ParchisEngine,
  PARCHIS_STARTS,
  PARCHIS_SAFE,
  PARCHIS_GOAL,
  parchisSquare,
  parchisLegalPawns,
  type ParchisState,
} from '../src/index.js';
const people = Array.from({ length: 4 }, (_, i) => ({
  id: `p${i}`,
  isBot: true,
  name: `Persona ${i}`,
}));
const engine = (roll = 5) => new ParchisEngine(() => (roll - 0.5) / 6);
const moving = (steps = 3, count = 2) => {
  const s = engine().initGame(people.slice(0, count));
  s.phase = 'move';
  s.steps = steps;
  s.lastRoll = steps;
  return s;
};
function rivalAt(s: ParchisState, square: number, pawn = 0, player = 1) {
  const p = s.players[player];
  const progress = (square - PARCHIS_STARTS[p.color] + 68) % 68;
  assert.ok(progress < 64);
  p.pawns[pawn] = progress;
}
test('Parchís: participantes, colores opuestos, acciones malformadas, turnos e inmutabilidad', () => {
  const e = engine(),
    s = e.initGame(people.slice(0, 2));
  assert.deepEqual(
    s.players.map((p) => p.color),
    [0, 2],
  );
  assert.throws(() => e.initGame([people[0], people[0]]));
  for (const invalid of [
    null,
    [],
    {},
    { type: 'UNKNOWN' },
    { type: 'MOVE', pawn: 0 },
    { type: 'MOVE', pawn: '0' },
  ]) {
    assert.equal(e.validateAction(s, 'p0', invalid as never), false);
    assert.equal(e.applyAction(s, 'p0', invalid as never), s);
  }
  assert.equal(e.validateAction(s, 'p1', { type: 'ROLL' }), false);
  assert.equal(e.validateAction(s, 'outsider', { type: 'ROLL' }), false);
  const before = structuredClone(s),
    next = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.deepEqual(s, before);
  assert.equal(next.phase, 'move');
  for (const bad of [-1, 4, 1.2, NaN, Infinity, '0', null])
    assert.equal(e.validateAction(next, 'p0', { type: 'MOVE', pawn: bad as number }), false);
  const publicState = e.getSanitizedState(next, 'p0');
  publicState.players[0].pawns[0] = 71;
  assert.equal(next.players[0].pawns[0], -1);
});
test('Parchís: salida obligatoria con cinco, salida bloqueada y captura de la última rival', () => {
  const e = engine(),
    s = moving(5);
  s.players[0].pawns[0] = 10;
  assert.deepEqual(parchisLegalPawns(s), [1, 2, 3]);
  const exited = e.applyAction(s, 'p0', { type: 'MOVE', pawn: 1 });
  assert.equal(exited.players[0].pawns[1], 0);
  assert.equal(exited.currentTurnPlayerId, 'p1');
  s.players[0].pawns = [0, 0, 10, -1];
  assert.ok(!parchisLegalPawns(s).includes(3));
  s.players[0].pawns = [10, -1, -1, -1];
  rivalAt(s, 4, 0);
  rivalAt(s, 4, 1);
  s.players[1].arrivals = [1, 2, 0, 0];
  const captured = e.applyAction(s, 'p0', { type: 'MOVE', pawn: 1 });
  assert.equal(captured.players[1].pawns[1], -1);
  assert.notEqual(captured.players[1].pawns[0], -1);
  assert.equal(captured.bonus, true);
  assert.equal(captured.steps, 20);
  const single = moving(5);
  rivalAt(single, 4);
  const shared = e.applyAction(single, 'p0', { type: 'MOVE', pawn: 0 });
  assert.notEqual(shared.players[1].pawns[0], -1);
});
test('Parchís: capturas, seguros, barreras y dos colores sin barrera', () => {
  const e = engine(),
    s = moving(3, 3);
  s.players[0].pawns[0] = 1;
  rivalAt(s, 8); // ficha amarilla: casilla 6 -> casilla 9.
  let next = e.applyAction(s, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.players[1].pawns[0], -1);
  assert.equal(next.steps, 20);
  assert.equal(next.bonus, true);
  const safe = moving(7);
  safe.players[0].pawns[0] = 0;
  rivalAt(safe, 11);
  next = e.applyAction(safe, 'p0', { type: 'MOVE', pawn: 0 });
  assert.notEqual(next.players[1].pawns[0], -1);
  const wall = moving(4);
  wall.players[0].pawns[0] = 0;
  rivalAt(wall, 6, 0);
  rivalAt(wall, 6, 1);
  assert.deepEqual(parchisLegalPawns(wall), []);
  const mixed = moving(4, 3);
  mixed.players[0].pawns[0] = 5;
  rivalAt(mixed, 11, 0, 1);
  rivalAt(mixed, 11, 0, 2);
  assert.ok(parchisLegalPawns(mixed).includes(0));
  mixed.steps = 2;
  assert.equal(parchisLegalPawns(mixed).includes(0), false, 'No caben tres fichas en el destino');
});
test('Parchís: seis cuenta siete, obliga a abrir barrera y tres seises penalizan sin afectar al pasillo', () => {
  const e = engine(6),
    s = e.initGame(people.slice(0, 2));
  s.players[0].pawns = [0, 0, 20, 30];
  const rolled = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.equal(rolled.steps, 7);
  assert.deepEqual(parchisLegalPawns(rolled), [0, 1]);
  let next = e.applyAction(rolled, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.phase, 'roll');
  assert.equal(next.currentTurnPlayerId, 'p0');
  next = e.applyAction(next, 'p0', { type: 'ROLL' });
  next = e.applyAction(next, 'p0', { type: 'MOVE', pawn: 0 });
  next = e.applyAction(next, 'p0', { type: 'ROLL' });
  assert.equal(next.players[0].pawns[0], -1);
  assert.equal(next.currentTurnPlayerId, 'p1');
  const corridor = e.initGame(people.slice(0, 2));
  corridor.sixes = 2;
  corridor.lastMoved = 0;
  corridor.players[0].pawns[0] = 65;
  const spared = e.applyAction(corridor, 'p0', { type: 'ROLL' });
  assert.equal(spared.players[0].pawns[0], 65);
});
test('Parchís: meta exacta, premio de diez, encadenamiento y victoria', () => {
  const e = engine(),
    s = moving(2);
  s.players[0].pawns = [70, 69, 20, -1];
  assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', pawn: 0 }), false);
  let next = e.applyAction(s, 'p0', { type: 'MOVE', pawn: 1 });
  assert.equal(next.players[0].pawns[1], 71);
  assert.equal(next.steps, 10);
  assert.deepEqual(parchisLegalPawns(next), [2]);
  next = e.applyAction(next, 'p0', { type: 'MOVE', pawn: 2 });
  assert.equal(next.players[0].pawns[2], 30);
  const win = moving(1);
  win.players[0].pawns = [71, 71, 71, 70];
  assert.equal(e.applyAction(win, 'p0', { type: 'MOVE', pawn: 3 }).winner, 'p0');
  const chain = moving(1);
  chain.players[0].pawns = [0, 61, -1, -1];
  rivalAt(chain, 5);
  next = e.applyAction(chain, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.steps, 20);
  next = e.applyAction(next, 'p0', { type: 'MOVE', pawn: 1 });
  assert.equal(next.players[0].pawns[1], 61, 'No se permite exceder la meta con un premio');
  const bonusFinish = moving(20);
  bonusFinish.bonus = true;
  bonusFinish.players[0].pawns = [51, 10, -1, -1];
  next = e.applyAction(bonusFinish, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.players[0].pawns[0], 71);
  assert.equal(next.steps, 10);
});
test('Parchís: se pierde un premio imposible y una tirada bloqueada progresa sin acción ficticia', () => {
  const e = engine(1),
    s = e.initGame(people.slice(0, 2));
  assert.equal(e.applyAction(s, 'p0', { type: 'ROLL' }).currentTurnPlayerId, 'p1');
  const bonus = moving(1);
  bonus.players[0].pawns = [70, 71, 71, 65];
  const next = e.applyAction(bonus, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.phase, 'roll');
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.equal(next.bonus, false);
});
test('Parchís: abandono elimina barreras, salta puestos y termina con una persona', () => {
  const e = engine(),
    s = e.initGame(people.slice(0, 3));
  s.players[1].pawns = [2, 2, 3, 4];
  assert.equal(e.forfeitPlayer(s, 'outsider'), s);
  let next = e.forfeitPlayer(s, 'p1');
  assert.equal(next.players[1].withdrawn, true);
  assert.deepEqual(next.players[1].pawns, [-1, -1, -1, -1]);
  assert.equal(e.forfeitPlayer(next, 'p1'), next);
  next = e.forfeitPlayer(next, 'p0');
  assert.equal(next.winner, 'p2');
  assert.equal(e.forfeitPlayer(next, 'p2'), next);
});
for (const count of [2, 3, 4])
  test(`Parchís: partidas completas y conservación de fichas con ${count} jugadores`, () => {
    let seed = count;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let game = 0; game < 4; game++) {
      const e = new ParchisEngine(random);
      let s = e.initGame(people.slice(0, count));
      for (let step = 0; step < 20000 && !s.winner; step++) {
        const before = structuredClone(s),
          id = s.currentTurnPlayerId,
          a = e.getBotAction(s, id);
        assert.ok(a);
        assert.ok(e.validateAction(s, id, a));
        s = e.applyAction(s, id, a);
        assert.deepEqual(before.players.length, count);
        assert.equal(before.revision + 1, s.revision);
        for (const p of s.players) {
          assert.equal(p.pawns.length, 4);
          assert.ok(p.pawns.every((n) => Number.isInteger(n) && n >= -1 && n <= PARCHIS_GOAL));
        }
        for (let square = 0; square < 68; square++)
          assert.ok(
            s.players.flatMap((p) => p.pawns.filter((n) => parchisSquare(p.color, n) === square))
              .length <= 2,
          );
      }
      assert.ok(s.winner, 'La partida debe terminar');
      assert.equal(e.getBotAction(s, s.currentTurnPlayerId), null);
    }
  });
test('Parchís: geometría lógica de salidas, seguros y pasillos', () => {
  assert.equal(PARCHIS_SAFE.length, 12);
  for (let color = 0; color < 4; color++) {
    assert.equal(parchisSquare(color, 0), PARCHIS_STARTS[color]);
    assert.equal(parchisSquare(color, 63), (PARCHIS_STARTS[color] + 63) % 68);
    for (const n of [-1, 64, 70, 71]) assert.equal(parchisSquare(color, n), null);
  }
});

test('Parchís: los premios encadenan capturas y las barreras también rigen en el pasillo', () => {
  const e = engine(),
    s = moving(1);
  s.players[0].pawns[0] = 0;
  rivalAt(s, 5, 0);
  rivalAt(s, 25, 1);
  let next = e.applyAction(s, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.steps, 20);
  next = e.applyAction(next, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.steps, 20);
  assert.equal(next.bonus, true);
  assert.deepEqual(next.players[1].pawns.slice(0, 2), [-1, -1]);
  next = e.applyAction(next, 'p0', { type: 'MOVE', pawn: 0 });
  assert.equal(next.players[0].pawns[0], 41);
  assert.equal(next.currentTurnPlayerId, 'p1');
  const corridor = moving(3);
  corridor.players[0].pawns = [63, 65, 65, -1];
  assert.equal(parchisLegalPawns(corridor).includes(0), false);
});
