import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MahjongEngine,
  mahjongIsWinning,
  mahjongScore,
  mahjongType,
  type MahjongState,
  type MahjongAction,
  type MahjongMeld,
} from '../src/index.js';
const ps = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, isBot: true }));
function tileIds(types: number[]) {
  const cs = Array<number>(34).fill(0);
  return types.map((t) => t * 4 + cs[t]++);
}
function fixture(
  hands: number[][],
  melds: { player: number; kind: MahjongMeld['kind']; types: number[]; concealed?: boolean }[] = [],
) {
  const e = new MahjongEngine(() => 0.2),
    s = e.initGame(ps),
    used = new Set<number>();
  const allocate = (types: number[]) =>
    types.map((t) => {
      const id = [0, 1, 2, 3].map((n) => t * 4 + n).find((id) => !used.has(id));
      assert.notEqual(id, undefined, `Más de cuatro copias del tipo ${t}`);
      used.add(id!);
      return id!;
    });
  for (let i = 0; i < 4; i++) {
    s.players[i].hand = allocate(hands[i] ?? []);
    s.players[i].melds = [];
  }
  for (const m of melds)
    s.players[m.player].melds.push({
      kind: m.kind,
      tiles: allocate(m.types),
      concealed: m.concealed ?? false,
      from: m.concealed ? null : 'p3',
    });
  s.wall = Array.from({ length: 136 }, (_, i) => i).filter((i) => !used.has(i));
  s.drawn = s.players[0].hand.at(-1) ?? null;
  s.discards = 2;
  return { e, s };
}
function answer(e: MahjongEngine, s: MahjongState, action: MahjongAction) {
  assert.equal(e.validateAction(s, s.currentTurnPlayerId, action), true);
  return e.applyAction(s, s.currentTurnPlayerId, action);
}
function passAll(e: MahjongEngine, s: MahjongState) {
  for (let n = 0; n < 3; n++) s = answer(e, s, { type: 'PASS' });
  return s;
}
const context = {
  selfDraw: false,
  replacement: false,
  lastTile: false,
  robbing: false,
  first: false,
  seat: 1,
};

test('Mahjong: cuatro jugadores, reparto 14/13, muro de 83 e identidades únicas', () => {
  const e = new MahjongEngine(),
    s = e.initGame(ps);
  assert.deepEqual(
    s.players.map((p) => p.hand.length),
    [14, 13, 13, 13],
  );
  assert.equal(s.wall.length, 83);
  const all = [...s.wall, ...s.players.flatMap((p) => p.hand)];
  assert.equal(new Set(all).size, 136);
  for (let t = 0; t < 34; t++) assert.equal(all.filter((v) => mahjongType(v) === t).length, 4);
  for (const n of [0, 2, 3, 5])
    assert.throws(() =>
      e.initGame(Array.from({ length: n }, (_, i) => ({ id: String(i), isBot: false }))),
    );
  assert.throws(() => e.initGame([ps[0], ps[0], ps[2], ps[3]]));
});
test('Mahjong: descomposición completa, palos separados, honores y trece huérfanos', () => {
  assert.equal(
    mahjongIsWinning(tileIds([0, 1, 2, 9, 10, 11, 18, 19, 20, 22, 22, 22, 28, 28])),
    true,
  );
  assert.equal(mahjongIsWinning(tileIds([0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 4, 4])), true);
  assert.equal(
    mahjongIsWinning(tileIds([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 33])),
    true,
  );
  assert.equal(mahjongIsWinning(tileIds([0, 0, 1, 1, 3, 3, 5, 5, 7, 7, 9, 9, 11, 11])), false);
  assert.equal(
    mahjongIsWinning(tileIds([7, 8, 9, 10, 11, 12, 18, 19, 20, 22, 22, 22, 28, 28])),
    false,
  );
  assert.equal(
    mahjongIsWinning(tileIds([27, 28, 29, 0, 1, 2, 9, 10, 11, 18, 19, 20, 30, 30])),
    false,
  );
  assert.equal(mahjongIsWinning(tileIds([0, 1, 2, 9, 10, 11, 28, 28]), 2), true);
  assert.equal(mahjongIsWinning(tileIds([0, 1, 2, 9, 10, 11, 28]), 2), false);
});
test('Mahjong: fan de tríos, vientos, robo, reposición y límites sin flores', () => {
  const plain = tileIds([0, 1, 2, 9, 10, 11, 18, 19, 20, 22, 22, 22, 28, 28]);
  assert.equal(mahjongScore(plain, [], context)!.fan, 0);
  assert.equal(
    mahjongScore(plain, [], { ...context, selfDraw: true, replacement: true, lastTile: true })!.fan,
    3,
  );
  const winds = tileIds([0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 28, 28]);
  assert.equal(mahjongScore(winds, [], { ...context, seat: 0 })!.fan, 2);
  const pungs = tileIds([0, 0, 0, 9, 9, 9, 18, 18, 18, 22, 22, 22, 28, 28]);
  assert.equal(mahjongScore(pungs, [], context)!.fan, 3);
  assert.equal(mahjongScore(pungs, [], { ...context, selfDraw: true })!.fan, 4);
  for (const types of [
    [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 33],
    [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 4],
    [27, 27, 27, 28, 28, 28, 29, 29, 29, 31, 31, 31, 33, 33],
  ]) {
    const score = mahjongScore(tileIds(types), [], context)!;
    assert.equal(score.fan, 4);
    assert.equal(score.base, 16);
    assert.equal(score.patterns.length, 1);
  }
});
test('Mahjong: descartar, esperar tres respuestas y robar sin mutar el estado previo', () => {
  const e = new MahjongEngine(() => 0.35),
    s = e.initGame(ps),
    before = structuredClone(s),
    tile = s.players[0].hand[0];
  let next = answer(e, s, { type: 'DISCARD', tile });
  assert.equal(next.phase, 'claim');
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.equal(next.players[0].hand.length, 13);
  assert.deepEqual(s, before);
  next = passAll(e, next);
  assert.equal(next.phase, 'draw');
  assert.equal(next.currentTurnPlayerId, 'p1');
  const drawn = next.wall[0];
  next = answer(e, next, { type: 'DRAW' });
  assert.equal(next.drawn, drawn);
  assert.equal(next.players[1].hand.length, 14);
  assert.equal(next.phase, 'discard');
  assert.equal(e.validateAction(next, 'p1', { type: 'DRAW' }), false);
});
test('Mahjong: Mahjong supera trío y escalera y las respuestas pendientes no se publican', () => {
  const { e, s } = fixture([
    [4],
    [3, 5, 6, 7, 8, 12, 13, 14, 15, 16, 17, 28, 29],
    [4, 4, 0, 3, 6, 9, 12, 15, 18, 21, 24, 30, 31],
    [0, 1, 2, 9, 10, 11, 18, 19, 20, 27, 27, 27, 4],
  ]);
  let next = answer(e, s, { type: 'DISCARD', tile: s.players[0].hand[0] });
  next = answer(e, next, { type: 'CLAIM', kind: 'chow', tiles: next.players[1].hand.slice(0, 2) });
  const view = e.getSanitizedState(next, 'p2');
  assert.deepEqual(view.respondedIds, ['p1']);
  assert.equal('responses' in view, false);
  assert.deepEqual(view.players[1].melds, []);
  next = answer(e, next, { type: 'CLAIM', kind: 'pung', tiles: next.players[2].hand.slice(0, 2) });
  assert.equal(next.winner, null);
  next = answer(e, next, { type: 'WIN' });
  assert.equal(next.winner, 'p3');
  assert.equal(next.players[1].melds.length, 0);
  assert.equal(next.players[2].melds.length, 0);
  assert.equal(next.players[3].hand.length, 14);
  assert.equal(
    Object.values(next.result!.payments).reduce((a, b) => a + b, 0),
    0,
  );
});
test('Mahjong: un trío supera una escalera y obliga a descartar sin robo ni kong', () => {
  const { e, s } = fixture([[4], [3, 5], [4, 4, 0, 3, 6, 9, 12, 15, 18, 21, 24, 30, 31], []]);
  let next = answer(e, s, { type: 'DISCARD', tile: s.players[0].hand[0] });
  next = answer(e, next, { type: 'CLAIM', kind: 'chow', tiles: next.players[1].hand });
  next = answer(e, next, { type: 'CLAIM', kind: 'pung', tiles: next.players[2].hand.slice(0, 2) });
  next = answer(e, next, { type: 'PASS' });
  assert.equal(next.currentTurnPlayerId, 'p2');
  assert.equal(next.phase, 'discard');
  assert.equal(next.players[2].melds[0].kind, 'pung');
  assert.equal(next.players[2].hand.length, 11);
  assert.equal(next.hasDrawn, false);
  assert.equal(e.validateAction(next, 'p2', { type: 'WIN' }), false);
  assert.equal(e.validateAction(next, 'p2', { type: 'DRAW' }), false);
});
test('Mahjong: solo el siguiente asiento reclama escalera, sin cruzar palos ni usar honores', () => {
  const { e, s } = fixture([[8], [7, 9], [7, 9], []]);
  let next = answer(e, s, { type: 'DISCARD', tile: s.players[0].hand[0] });
  assert.equal(
    e.validateAction(next, 'p1', { type: 'CLAIM', kind: 'chow', tiles: next.players[1].hand }),
    false,
  );
  next = answer(e, next, { type: 'PASS' });
  assert.equal(
    e.validateAction(next, 'p2', { type: 'CLAIM', kind: 'chow', tiles: next.players[2].hand }),
    false,
  );
  const h = fixture([[28], [27, 29], [], []]);
  const honor = answer(h.e, h.s, { type: 'DISCARD', tile: h.s.players[0].hand[0] });
  assert.equal(
    h.e.validateAction(honor, 'p1', { type: 'CLAIM', kind: 'chow', tiles: honor.players[1].hand }),
    false,
  );
});
test('Mahjong: dos declaraciones ganadoras se resuelven por cercanía al descarte', () => {
  const ready = [0, 1, 2, 9, 10, 11, 18, 19, 20, 6, 7, 8, 4],
    { e, s } = fixture([[4], ready, ready, []]);
  let next = answer(e, s, { type: 'DISCARD', tile: s.players[0].hand[0] });
  next = answer(e, next, { type: 'WIN' });
  next = answer(e, next, { type: 'WIN' });
  next = answer(e, next, { type: 'PASS' });
  assert.equal(next.winner, 'p1');
});
test('Mahjong: kong expuesto roba del final del muro y conserva cuatro fichas en la combinación', () => {
  const { e, s } = fixture([[4], [4, 4, 4, 0, 2, 6, 8, 12, 14, 16, 21, 23, 25], [], []]),
    replacement = s.wall.at(-1)!;
  let next = answer(e, s, { type: 'DISCARD', tile: s.players[0].hand[0] });
  next = answer(e, next, { type: 'CLAIM', kind: 'kong', tiles: next.players[1].hand.slice(0, 3) });
  next = answer(e, next, { type: 'PASS' });
  next = answer(e, next, { type: 'PASS' });
  assert.equal(next.currentTurnPlayerId, 'p1');
  assert.equal(next.players[1].melds[0].tiles.length, 4);
  assert.equal(next.drawn, replacement);
  assert.equal(next.wall.length, s.wall.length - 1);
  assert.equal(next.replacement, true);
  assert.equal(next.players[1].hand.length, 11);
});
test('Mahjong: kong oculto permanece privado y no se declara sin reposición', () => {
  const { e, s } = fixture([[4, 4, 4, 4, 0, 2, 6, 8, 12, 14, 16, 21, 23, 25], [], [], []]),
    action = { type: 'KONG', tile: s.players[0].hand[0], added: false } as const;
  const empty = structuredClone(s);
  empty.wall = [];
  assert.equal(e.validateAction(empty, 'p0', action), false);
  const next = answer(e, s, action);
  assert.deepEqual(e.getSanitizedState(next, 'p1').players[0].melds[0].tiles, [
    null,
    null,
    null,
    null,
  ]);
  assert.equal(
    e.getSanitizedState(next, 'p0').players[0].melds[0].tiles.every((t) => typeof t === 'number'),
    true,
  );
  assert.equal(next.hasDrawn, true);
  const cancelled = e.forfeitPlayer(next, 'p2');
  assert.deepEqual(e.getSanitizedState(cancelled, 'p1').players[0].melds[0].tiles, [
    null,
    null,
    null,
    null,
  ]);
  assert.ok(e.getSanitizedState(cancelled, 'p1').players.every((p) => p.revealedHand === null));
});
test('Mahjong: robar un kong añadido gana antes de la reposición y mantiene el trío original', () => {
  const { e, s } = fixture(
    [
      [4, 0, 2, 6, 8, 12, 14, 16, 21, 23, 25],
      [3, 5, 9, 10, 11, 18, 19, 20, 27, 27, 27, 28, 28],
      [],
      [],
    ],
    [{ player: 0, kind: 'pung', types: [4, 4, 4] }],
  );
  let next = answer(e, s, { type: 'KONG', tile: s.players[0].hand[0], added: true });
  assert.equal(next.pending!.kind, 'kong');
  next = answer(e, next, { type: 'WIN' });
  next = answer(e, next, { type: 'PASS' });
  next = answer(e, next, { type: 'PASS' });
  assert.equal(next.winner, 'p1');
  assert.equal(next.players[0].melds[0].kind, 'pung');
  assert.equal(next.wall.length, s.wall.length);
  assert.equal(next.players[0].hand.length, 10);
  assert.equal(next.result!.payments.p0, -next.result!.base * 2);
});
test('Mahjong: kong añadido sin reclamación se completa y roba la reposición', () => {
  const { e, s } = fixture(
    [[4, 0, 2, 6, 8, 12, 14, 16, 21, 23, 25], [], [], []],
    [{ player: 0, kind: 'pung', types: [4, 4, 4] }],
  );
  let next = answer(e, s, { type: 'KONG', tile: s.players[0].hand[0], added: true });
  next = passAll(e, next);
  assert.equal(next.players[0].melds[0].kind, 'kong');
  assert.equal(next.players[0].melds[0].tiles.length, 4);
  assert.equal(next.drawn, s.wall.at(-1));
  assert.equal(next.currentTurnPlayerId, 'p0');
});
test('Mahjong: mínimo de fan, pagos por robo propio y rechazo de victorias falsas', () => {
  const plain = [0, 1, 2, 9, 10, 11, 18, 19, 20, 22, 22, 22, 28, 28],
    { e, s } = fixture([plain, [], [], []]);
  s.minimumFan = 3;
  assert.equal(e.validateAction(s, 'p0', { type: 'WIN' }), false);
  s.minimumFan = 1;
  const next = answer(e, s, { type: 'WIN' });
  assert.equal(next.result!.fan, 1);
  assert.equal(next.result!.payments.p0, 12);
  assert.deepEqual(
    next.players.slice(1).map((p) => p.score),
    [-4, -4, -4],
  );
  const bad = fixture([[0, 1, 2], [], [], []]);
  assert.equal(bad.e.validateAction(bad.s, 'p0', { type: 'WIN' }), false);
  const configured = new MahjongEngine();
  configured.setRules({ minimumFan: 3 });
  assert.equal(configured.initGame(ps).minimumFan, 3);
});
test('Mahjong: pasar una victoria bloquea ese tipo hasta el siguiente robo', () => {
  const ready = [0, 1, 2, 9, 10, 11, 18, 19, 20, 6, 7, 8, 4],
    { e, s } = fixture([[4], ready, [], []]);
  let next = answer(e, s, { type: 'DISCARD', tile: s.players[0].hand[0] });
  assert.equal(e.validateAction(next, 'p1', { type: 'WIN' }), true);
  next = answer(e, next, { type: 'PASS' });
  assert.deepEqual(next.players[1].blocked, [4]);
  next = answer(e, next, { type: 'PASS' });
  next = answer(e, next, { type: 'PASS' });
  next = answer(e, next, { type: 'DRAW' });
  assert.deepEqual(next.players[1].blocked, []);
});
test('Mahjong: el último descarte admite victoria y tres pases terminan en tablas', () => {
  const ready = [0, 1, 2, 9, 10, 11, 18, 19, 20, 6, 7, 8, 4],
    { e, s } = fixture([[4], ready, [], []]);
  s.wall = [];
  let next = answer(e, s, { type: 'DISCARD', tile: s.players[0].hand[0] });
  assert.equal(e.validateAction(next, 'p1', { type: 'WIN' }), true);
  const won = answer(e, answer(e, answer(e, next, { type: 'WIN' }), { type: 'PASS' }), {
    type: 'PASS',
  });
  assert.equal(won.winner, 'p1');
  next = passAll(e, next);
  assert.equal(next.isDraw, true);
  assert.equal(next.result, null);
});
test('Mahjong: red malformada, turnos, duplicados y abandono son inocuos', () => {
  const e = new MahjongEngine(),
    s = e.initGame(ps);
  for (const a of [
    null,
    [],
    {},
    { type: 'UNKNOWN' },
    { type: 'DRAW' },
    { type: 'PASS' },
    { type: 'DISCARD', tile: 136 },
    { type: 'DISCARD', tile: '1' },
    { type: 'DISCARD', tile: NaN },
    { type: 'CLAIM', kind: 'chow', tiles: [] },
    { type: 'KONG', tile: 0, added: 'yes' },
  ]) {
    assert.equal(e.validateAction(s, 'p0', a as never), false);
    assert.equal(e.applyAction(s, 'p0', a as never), s);
  }
  assert.equal(e.getBotAction(s, 'p1'), null);
  assert.equal(e.validateAction(s, 'outsider', { type: 'WIN' }), false);
  assert.equal(e.forfeitPlayer(s, 'outsider'), s);
  const ended = e.forfeitPlayer(s, 'p2');
  assert.equal(ended.isDraw, true);
  assert.equal(ended.phase, 'finished');
  assert.equal(e.forfeitPlayer(ended, 'p1'), ended);
  assert.equal(e.getBotAction(ended, 'p0'), null);
  const f = fixture([[4], [4, 4], [], []]);
  const claim = answer(f.e, f.s, { type: 'DISCARD', tile: f.s.players[0].hand[0] });
  const card = claim.players[1].hand[0];
  assert.equal(
    f.e.validateAction(claim, 'p1', { type: 'CLAIM', kind: 'pung', tiles: [card, card] }),
    false,
  );
});
test('Mahjong: proyección privada, independencia de vistas y bot sin información ajena', () => {
  const e = new MahjongEngine(() => 0.4),
    s = e.initGame(ps),
    a = e.getSanitizedState(s, 'p0'),
    b = e.getSanitizedState(s, 'p1');
  assert.equal('wall' in a, false);
  assert.equal('blocked' in a.players[0], false);
  assert.equal('hand' in a.players[1], false);
  assert.equal(b.drawn, null);
  assert.deepEqual(
    a.players.map((p) => p.revealedHand),
    [null, null, null, null],
  );
  assert.ok(!a.hand.some((t) => b.hand.includes(t)));
  const changed = structuredClone(s);
  changed.wall.reverse();
  const hidden = changed.wall.splice(0, changed.players[1].hand.length);
  changed.wall.push(...changed.players[1].hand);
  changed.players[1].hand = hidden;
  assert.deepEqual(e.getBotAction(s, 'p0'), e.getBotAction(changed, 'p0'));
  a.hand.length = 0;
  a.players[0].handCount = 0;
  assert.equal(s.players[0].hand.length, 14);
  assert.equal(e.getSanitizedState(s, 'outsider').hand.length, 0);
});
test('Mahjong: veinte partidas completas con bots, mínimos 0/1/3 y conservación de 136 fichas', () => {
  for (let sample = 1; sample <= 20; sample++) {
    let seed = sample;
    const e = new MahjongEngine(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    });
    e.setRules({ minimumFan: [0, 1, 3][sample % 3] });
    let s = e.initGame(ps),
      turns = 0;
    while (!s.winner && !s.isDraw && turns++ < 1000) {
      const id = s.currentTurnPlayerId,
        a = e.getBotAction(s, id);
      assert.ok(a);
      assert.equal(e.validateAction(s, id, a), true);
      s = e.applyAction(s, id, a);
      const all = [
        ...s.wall,
        ...s.players.flatMap((p) => [...p.hand, ...p.melds.flatMap((m) => m.tiles)]),
        ...Object.values(s.rivers).flat(),
      ];
      assert.equal(all.length, 136);
      assert.equal(new Set(all).size, 136);
    }
    assert.ok(s.winner || s.isDraw);
    if (s.winner) {
      assert.ok(s.result!.fan >= s.minimumFan);
      assert.equal(
        s.players.reduce((v, p) => v + p.score, 0),
        0,
      );
    }
  }
});
