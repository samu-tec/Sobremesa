import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AjedrezEngine,
  DamasEngine,
  MancalaEngine,
  BackgammonEngine,
  RummyDeFichasEngine,
  DominoEngine,
  ImpostorEngine,
  BatallaNavalEngine,
  DadosDeCombinacionesEngine,
  validRummyDeFichasMeld,
  type IGameEngine,
} from '../src/index.js';
const players = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  isBot: true,
}));
for (const [name, make, count, limit] of [
  ['chess', () => new AjedrezEngine(), 2, 600, 2],
  ['checkers', () => new DamasEngine(), 2, 1500, 4],
  ['mancala', () => new MancalaEngine(), 2, 300, 8],
  ['backgammon', () => new BackgammonEngine(), 2, 3000, 5],
  ['rummy', () => new RummyDeFichasEngine(), 4, 2200, 6],
  ['dominoes', () => new DominoEngine(), 4, 600, 8],
  ['impostor', () => new ImpostorEngine(), 5, 30, 10],
  ['battleship', () => new BatallaNavalEngine(), 2, 210, 8],
  ['combinations', () => new DadosDeCombinacionesEngine(), 4, 220, 6],
] as const) {
  test(`${name}: partidas completas con bots, acciones válidas y estados inmutables`, () => {
    const engine: IGameEngine<any, any, any> = make();
    for (let n = 0; n < 1; n++) {
      let s = engine.initGame(players.slice(0, count)),
        turns = 0;
      while (!s.winner && !s.isDraw && turns < limit) {
        const id = s.currentTurnPlayerId,
          before = JSON.stringify(s),
          a = engine.getBotAction(s, id);
        assert.ok(a, `${name}: sin acción en ${JSON.stringify(s)}`);
        assert.ok(engine.validateAction(s, id, a), `${name}: acción ilegal ${JSON.stringify(a)}`);
        assert.equal(engine.validateAction(s, 'outsider', a), false);
        assert.equal(engine.validateAction(s, id, { type: 'UNKNOWN' }), false);
        const next = engine.applyAction(s, id, a);
        assert.equal(JSON.stringify(s), before, `${name}: estado mutado`);
        assert.notDeepEqual(next, s, `${name}: sin progreso`);
        s = next;
        turns++;
        if (name === 'mancala')
          assert.equal(
            s.pits.reduce((a: number, b: number) => a + b, 0),
            48,
          );
        if (name === 'backgammon')
          for (let side = 0; side < 2; side++)
            assert.equal(
              s.points.reduce(
                (n: number, v: number) => n + (v * (side === 0 ? 1 : -1) > 0 ? Math.abs(v) : 0),
                0,
              ) +
                s.bar[side] +
                s.off[side],
              15,
            );
        if (name === 'rummy') {
          const tiles = [...s.pool, ...s.table.flat(), ...s.players.flatMap((p: any) => p.hand)];
          assert.equal(tiles.length, 106);
          assert.equal(new Set(tiles.map((t: any) => t.id)).size, 106);
          for (const set of s.table) assert.ok(validRummyDeFichasMeld(set));
        }
        if (name === 'dominoes') {
          const tiles = [...s.stock, ...s.chain, ...s.players.flatMap((p: any) => p.hand)];
          assert.equal(tiles.length, 28);
          assert.equal(new Set(tiles.map((c: any) => c.id)).size, 28);
          for (let i = 1; i < s.chain.length; i++) assert.equal(s.chain[i - 1].b, s.chain[i].a);
        }
      }
      assert.ok(s.winner || s.isDraw, `${name}: no terminó tras ${turns} decisiones`);
      assert.equal(engine.getBotAction(s, s.currentTurnPlayerId), null);
      const a = engine.getBotAction(engine.initGame(players.slice(0, count)), players[0].id);
      if (a) assert.equal(engine.validateAction(s, s.currentTurnPlayerId, a), false);
    }
  });
}
