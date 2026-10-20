import test from 'node:test';
import assert from 'node:assert/strict';
import { OcaEngine, ocaSquareKind, OCA_GEESE, type OcaState } from '../src/index.js';
const players = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i}`,
  isBot: true,
  name: `Persona ${i}`,
}));
const make = (roll: number) => new OcaEngine(() => (roll - 0.5) / 6);
function from(square: number, roll = 1, count = 2) {
  const e = make(roll),
    s = e.initGame(players.slice(0, count));
  s.players[0].position = square;
  return { e, s };
}
test('Oca: participantes, acciones inválidas, turnos y proyecciones independientes', () => {
  const e = make(1),
    s = e.initGame(players.slice(0, 2));
  for (const count of [0, 1, 7])
    assert.throws(() =>
      e.initGame(Array.from({ length: count }, (_, i) => ({ id: String(i), isBot: false }))),
    );
  assert.throws(() => e.initGame([players[0], players[0]]));
  for (const a of [null, [], {}, { type: 'MOVE' }, { type: 0 }]) {
    assert.equal(e.validateAction(s, 'p0', a as never), false);
    assert.equal(e.applyAction(s, 'p0', a as never), s);
  }
  assert.equal(e.validateAction(s, 'p1', { type: 'ROLL' }), false);
  assert.equal(e.getBotAction(s, 'outsider'), null);
  const before = structuredClone(s),
    next = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.deepEqual(s, before);
  assert.equal(next.players[0].position, 1);
  assert.equal(next.currentTurnPlayerId, 'p1');
  const view = e.getSanitizedState(next, 'p0');
  view.players[0].position = 63;
  assert.equal(next.players[0].position, 1);
});
test('Oca: ocas, puentes y dados saltan una sola vez y conceden otra tirada', () => {
  for (const [start, roll, end] of [
    [4, 1, 9],
    [8, 1, 14],
    [5, 1, 12],
    [11, 1, 6],
    [25, 1, 53],
    [52, 1, 26],
  ]) {
    const { e, s } = from(start, roll),
      next = e.applyAction(s, 'p0', { type: 'ROLL' });
    assert.equal(next.players[0].position, end);
    assert.equal(next.currentTurnPlayerId, 'p0');
    assert.equal(next.winner, null);
  }
});
test('Oca: meta exacta, rebote, oca de regreso y salto desde 59 sin victoria automática', () => {
  let { e, s } = from(60, 3);
  assert.equal(e.applyAction(s, 'p0', { type: 'ROLL' }).winner, 'p0');
  ({ e, s } = from(61, 5));
  let next = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.equal(next.lastMove?.landed, 60);
  assert.equal(next.lastMove?.bounced, true);
  assert.equal(next.players[0].position, 60);
  assert.equal(next.winner, null);
  ({ e, s } = from(62, 5));
  next = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.equal(next.lastMove?.landed, 59);
  assert.equal(next.players[0].position, 54);
  assert.equal(next.currentTurnPlayerId, 'p0');
  ({ e, s } = from(58, 1));
  next = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.equal(next.players[0].position, 63);
  assert.equal(next.winner, null);
  assert.equal(next.currentTurnPlayerId, 'p0');
  next = e.applyAction(next, 'p0', { type: 'ROLL' });
  assert.equal(next.players[0].position, 62);
  assert.equal(next.winner, null);
});
test('Oca: posada y cárcel descuentan uno y dos turnos, laberinto y calavera retroceden', () => {
  for (const [square, skip] of [
    [19, 1],
    [52, 2],
    [31, 3],
  ]) {
    const { e, s } = from(square - 1),
      next = e.applyAction(s, 'p0', { type: 'ROLL' });
    assert.equal(next.players[0].skippedTurns, skip);
    assert.equal(next.currentTurnPlayerId, 'p1');
    let running = next;
    for (let wait = 0; wait < skip; wait++) {
      running.players[1].position = 0;
      running = e.applyAction(running, 'p1', { type: 'ROLL' });
      assert.equal(running.players[0].skippedTurns, skip - wait - 1);
      assert.ok(running.skipped.includes('p0'));
    }
    running.players[1].position = 0;
    running = e.applyAction(running, 'p1', { type: 'ROLL' });
    assert.equal(running.currentTurnPlayerId, 'p0');
  }
  for (const [start, end] of [
    [41, 30],
    [57, 0],
  ]) {
    const { e, s } = from(start);
    assert.equal(e.applyAction(s, 'p0', { type: 'ROLL' }).players[0].position, end);
  }
});
test('Oca: otra llegada al pozo libera a quienes esperaban y varias fichas comparten casilla', () => {
  const { e, s } = from(30, 1, 3);
  s.players[1].position = 31;
  s.players[1].skippedTurns = 3;
  let next = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.equal(next.players[0].skippedTurns, 3);
  assert.equal(next.players[1].skippedTurns, 0);
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.equal(next.players[0].position, next.players[1].position);
  next = e.applyAction(next, 'p1', { type: 'ROLL' });
  assert.equal(next.players[0].position, 31);
  assert.equal(next.players[1].position, 36);
});
test('Oca: todas las esperas se resuelven sin bloquear la partida y el abandono es idempotente', () => {
  const { e, s } = from(18, 1, 3);
  s.players[1].skippedTurns = 3;
  s.players[2].skippedTurns = 3;
  const next = e.applyAction(s, 'p0', { type: 'ROLL' });
  assert.ok(next.players.find((p) => p.id === next.currentTurnPlayerId)?.skippedTurns === 0);
  assert.ok(next.skipped.length > 0);
  assert.equal(e.forfeitPlayer(s, 'outsider'), s);
  let left = e.forfeitPlayer(s, 'p1');
  assert.equal(e.forfeitPlayer(left, 'p1'), left);
  left = e.forfeitPlayer(left, 'p0');
  assert.equal(left.winner, 'p2');
  assert.equal(e.forfeitPlayer(left, 'p2'), left);
});
for (const count of [2, 3, 4, 5, 6])
  test(`Oca: partidas completas y posiciones válidas con ${count} jugadores`, () => {
    let seed = count;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let game = 0; game < 8; game++) {
      const e = new OcaEngine(random);
      let s: OcaState = e.initGame(players.slice(0, count));
      for (let turn = 0; turn < 5000 && !s.winner; turn++) {
        const previous = s,
          clone = structuredClone(s),
          id = s.currentTurnPlayerId,
          a = e.getBotAction(s, id);
        assert.ok(a);
        assert.ok(e.validateAction(s, id, a));
        s = e.applyAction(s, id, a);
        assert.deepEqual(previous, clone);
        for (const p of s.players) {
          assert.ok(Number.isInteger(p.position) && p.position >= 0 && p.position <= 63);
          assert.ok(p.skippedTurns >= 0 && p.skippedTurns <= 3);
        }
        assert.equal(s.players.find((p) => p.id === s.currentTurnPlayerId)?.skippedTurns, 0);
      }
      assert.ok(s.winner);
      assert.equal(e.getBotAction(s, s.currentTurnPlayerId), null);
    }
  });
test('Oca: todas las casillas especiales tienen una clasificación única y estable', () => {
  assert.equal(OCA_GEESE.length, 13);
  assert.equal(ocaSquareKind(0), 'start');
  assert.equal(ocaSquareKind(63), 'goal');
  for (const n of OCA_GEESE) assert.equal(ocaSquareKind(n), 'goose');
  assert.equal(
    Array.from({ length: 64 }, (_, i) => ocaSquareKind(i)).filter((kind) => kind === 'ordinary')
      .length,
    40,
  );
});
