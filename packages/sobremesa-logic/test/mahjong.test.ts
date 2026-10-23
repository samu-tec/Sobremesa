import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MahjongEngine,
  type MahjongState,
  type MahjongAction,
  type MahjongMeld,
} from '../src/index.js';
const ps = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, isBot: true }));
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
