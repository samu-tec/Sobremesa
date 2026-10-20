import test from 'node:test';
import assert from 'node:assert/strict';
import { ChineseEngine, CHINESE_HOLES, chinesePaths, type ChineseAction } from '../src/index.js';
const players = (n = 2) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isBot: true }));
const hole = (q: number, r: number) => CHINESE_HOLES.findIndex((h) => h.q === q && h.r === r);
function fixture() {
  const e = new ChineseEngine(),
    s = e.initGame(players());
  s.board.fill(null);
  s.board[hole(0, 0)] = { owner: 'p0', number: 1 };
  return { e, s };
}
test('Damas chinas: estrella de 121 huecos, diez fichas y posiciones válidas', () => {
  assert.equal(CHINESE_HOLES.length, 121);
  assert.equal(new Set(CHINESE_HOLES.map((h) => `${h.q},${h.r}`)).size, 121);
  for (let arm = 0; arm < 6; arm++)
    assert.equal(CHINESE_HOLES.filter((h) => h.arm === arm).length, 10);
  for (const n of [2, 3, 4, 6]) {
    const s = new ChineseEngine().initGame(players(n));
    for (const p of s.players) {
      assert.equal(s.board.filter((v) => v?.owner === p.id).length, 10);
      assert.ok(s.board.every((v, i) => v?.owner !== p.id || CHINESE_HOLES[i].arm === p.arm));
    }
    assert.equal(s.board.filter(Boolean).length, n * 10);
  }
  const e = new ChineseEngine();
  for (const n of [0, 1, 5, 7]) assert.throws(() => e.initGame(players(n)));
  assert.throws(() => e.initGame([players()[0], players()[0]]));
});
test('Damas chinas: pasos en seis direcciones y estado inmutable', () => {
  const { e, s } = fixture(),
    before = structuredClone(s);
  const moves = chinesePaths(s, 'p0');
  assert.equal(moves.length, 6);
  for (const path of moves) assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', path }), true);
  const next = e.applyAction(s, 'p0', { type: 'MOVE', path: moves[0] });
  assert.equal(next.board[hole(0, 0)], null);
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.deepEqual(s, before);
});
test('Damas chinas: saltos encadenados sobre cualquier color, sin capturas y con parada opcional', () => {
  const { e, s } = fixture();
  s.board[hole(1, 0)] = { owner: 'p1', number: 1 };
  s.board[hole(3, 0)] = { owner: 'p0', number: 2 };
  const short = [hole(0, 0), hole(2, 0)],
    long = [...short, hole(4, 0)];
  for (const path of [short, long]) {
    assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', path }), true);
    assert.ok(chinesePaths(s, 'p0').some((p) => p.join() === path.join()));
  }
  const next = e.applyAction(s, 'p0', { type: 'MOVE', path: long });
  assert.equal(next.board.filter(Boolean).length, 3);
  assert.deepEqual(next.board[hole(1, 0)], s.board[hole(1, 0)]);
  assert.deepEqual(next.lastPath, long);
});
test('Damas chinas: rechaza trayectos mixtos, cíclicos, ocupados, vacíos y datos malformados', () => {
  const { e, s } = fixture();
  s.board[hole(1, 0)] = { owner: 'p1', number: 1 };
  const bad: unknown[] = [
    null,
    [],
    {},
    { type: 'MOVE' },
    { type: 'MOVE', path: '0,1' },
    { type: 'MOVE', path: [hole(0, 0)] },
    { type: 'PASS' },
    ...[
      [hole(0, 0), hole(1, 0)],
      [hole(0, 0), hole(0, 2)],
      [hole(0, 0), hole(2, 0), hole(3, 0)],
      [hole(0, 0), hole(2, 0), hole(0, 0)],
      [hole(0, 0), 121],
      [hole(0, 0), 1.5],
      [hole(0, 0), NaN],
      [hole(0, 0), '1'],
    ].map((path) => ({ type: 'MOVE', path })),
  ];
  for (const a of bad) {
    assert.equal(e.validateAction(s, 'p0', a as ChineseAction), false);
    assert.equal(e.applyAction(s, 'p0', a as ChineseAction), s);
  }
  assert.equal(e.validateAction(s, 'stranger', { type: 'PASS' }), false);
  assert.equal(e.validateAction(s, 'p1', { type: 'MOVE', path: [hole(1, 0), hole(2, 0)] }), false);
  assert.equal(e.getBotAction(s, 'p1'), null);
});
test('Damas chinas: una ficha en destino puede moverse dentro pero no salir', () => {
  const { e, s } = fixture();
  s.board.fill(null);
  s.board[hole(-2, 5)] = { owner: 'p0', number: 1 };
  assert.equal(
    e.validateAction(s, 'p0', { type: 'MOVE', path: [hole(-2, 5), hole(-2, 4)] }),
    false,
  );
  assert.equal(e.validateAction(s, 'p0', { type: 'MOVE', path: [hole(-2, 5), hole(-2, 6)] }), true);
  assert.ok(chinesePaths(s, 'p0').every((p) => CHINESE_HOLES[p.at(-1)!].arm === 3));
});
test('Damas chinas: solo gana al completar las diez fichas', () => {
  const { e, s } = fixture();
  s.board.fill(null);
  const goal = CHINESE_HOLES.flatMap((h, i) => (h.arm === 3 ? [i] : [])),
    missing = hole(-2, 5);
  goal
    .filter((i) => i !== missing)
    .forEach((i, n) => {
      s.board[i] = { owner: 'p0', number: n + 1 };
    });
  s.board[hole(-2, 4)] = { owner: 'p0', number: 10 };
  const next = e.applyAction(s, 'p0', { type: 'MOVE', path: [hole(-2, 4), missing] });
  assert.equal(next.winner, 'p0');
  assert.equal(e.checkWinner(next), 'p0');
  assert.equal(e.getBotAction(next, 'p0'), null);
  assert.equal(e.forfeitPlayer(next, 'p0'), next);
});
test('Damas chinas: pasar solo sin movimientos y bloqueo completo termina en tablas', () => {
  const { e, s } = fixture();
  s.board.fill(null);
  assert.equal(e.validateAction(s, 'p0', { type: 'PASS' }), true);
  const next = e.applyAction(e.applyAction(s, 'p0', { type: 'PASS' }), 'p1', { type: 'PASS' });
  assert.equal(next.isDraw, true);
});
test('Damas chinas: triple repetición conserva el turno en la identidad de la posición', () => {
  const { e, s } = fixture();
  s.board[hole(0, 3)] = { owner: 'p1', number: 1 };
  let current = s;
  for (let n = 0; n < 2; n++)
    for (const [id, from, to] of [
      ['p0', hole(0, 0), hole(1, 0)],
      ['p1', hole(0, 3), hole(1, 3)],
      ['p0', hole(1, 0), hole(0, 0)],
      ['p1', hole(1, 3), hole(0, 3)],
    ] as const)
      current = e.applyAction(current, id, { type: 'MOVE', path: [from, to] });
  // La posición inicial del fixture reemplaza el reparto de apertura.
  assert.equal(current.isDraw, false);
  for (const [id, from, to] of [
    ['p0', hole(0, 0), hole(1, 0)],
    ['p1', hole(0, 3), hole(1, 3)],
  ] as const)
    current = e.applyAction(current, id, { type: 'MOVE', path: [from, to] });
  assert.equal(current.isDraw, true);
});
test('Damas chinas: abandono retira solo las fichas propias y no altera salas ni vistas', () => {
  const e = new ChineseEngine(),
    s = e.initGame(players(4));
  assert.equal(e.forfeitPlayer(s, 'other'), s);
  let next = e.forfeitPlayer(s, 'p0');
  assert.equal(next.board.filter(Boolean).length, 30);
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.equal(next.winner, null);
  assert.equal(e.forfeitPlayer(next, 'p0'), next);
  next = e.forfeitPlayer(e.forfeitPlayer(next, 'p2'), 'p3');
  assert.equal(next.winner, 'p1');
  const view = e.getSanitizedState(s, 'p0');
  assert.equal('history' in view, false);
  view.board.fill(null);
  view.players[0].arm = 5;
  assert.equal(s.board.filter(Boolean).length, 40);
  assert.equal(s.players[0].arm, 0);
});
for (const n of [2, 3, 4, 6])
  test(`Damas chinas: partida completa de ${n} bots y conservación de fichas`, () => {
    let seed = 47;
    const e = new ChineseEngine(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    });
    let s = e.initGame(players(n)),
      turns = 0;
    while (!s.winner && !s.isDraw && turns++ < 3000) {
      const id = s.currentTurnPlayerId,
        a = e.getBotAction(s, id);
      assert.ok(a);
      assert.equal(e.validateAction(s, id, a), true);
      s = e.applyAction(s, id, a);
      assert.equal(s.board.filter(Boolean).length, n * 10);
    }
    assert.ok(s.winner || s.isDraw, `Partida bloqueada tras ${turns} turnos`);
    if (s.winner)
      assert.equal(
        s.board.filter(
          (p, i) =>
            p?.owner === s.winner &&
            CHINESE_HOLES[i].arm === (s.players.find((p) => p.id === s.winner)!.arm + 3) % 6,
        ).length,
        10,
      );
  });
