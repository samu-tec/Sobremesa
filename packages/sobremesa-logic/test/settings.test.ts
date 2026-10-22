import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RummyDeFichasEngine,
  DominoEngine,
  ImpostorEngine,
  MancalaEngine,
  DadosAl100Engine,
  DadosDeCombinacionesEngine,
  AjedrezEngine,
  DamasEngine,
  BatallaNavalEngine,
  GAME_SETTINGS,
  defaultGameSettings,
  validGameSetting,
  resolveGameSettings,
  combinationTotal,
  type IGameEngine,
} from '../src/index.js';
const players = Array.from({ length: 4 }, (_, i) => ({
  id: `p${i}`,
  isBot: true,
  name: `Player ${i}`,
}));
const tile = (id: number) => ({
  id,
  value: (id % 13) + 1,
  color: Math.floor(id / 13) % 4,
  joker: false,
});
const variants = [
  [
    'rummy',
    () => new RummyDeFichasEngine(),
    { openingPoints: 50, startingTiles: 10, useJokers: false },
    4,
    300,
  ],
  [
    'rummy',
    () => new RummyDeFichasEngine(),
    { openingPoints: 0, startingTiles: 16, useJokers: true },
    2,
    300,
  ],
  [
    'dominoes',
    () => new DominoEngine(),
    { targetScore: 50, maxRounds: 1, startingTiles: 5 },
    4,
    200,
  ],
  [
    'impostor',
    () => new ImpostorEngine(),
    { clueRounds: 1, showCategory: false, wordCategory: 2 },
    4,
    40,
  ],
  [
    'impostor',
    () => new ImpostorEngine(),
    { clueRounds: 3, showCategory: false, wordCategory: 0 },
    3,
    40,
  ],
  ['mancala', () => new MancalaEngine(), { seedsPerPit: 6 }, 2, 500],
  ['mancala', () => new MancalaEngine(), { seedsPerPit: 3 }, 2, 500],
  ['pig', () => new DadosAl100Engine(), { targetScore: 50 }, 3, 1000],
  [
    'combinations',
    () => new DadosDeCombinacionesEngine(),
    { maxRolls: 1, upperBonus: false },
    3,
    100,
  ],
  [
    'combinations',
    () => new DadosDeCombinacionesEngine(),
    { maxRolls: 2, upperBonus: true },
    2,
    100,
  ],
  ['battleship', () => new BatallaNavalEngine(), { hitKeepsTurn: true }, 2, 210],
  ['checkers', () => new DamasEngine(), { quietMoveLimit: 40 }, 2, 1500],
] as const;
for (const [game, make, rules, count, limit] of variants)
  test(`${game}: partida completa con ${JSON.stringify(rules)}`, () => {
    const engine: IGameEngine<any, any, any> = make();
    engine.setRules!(rules);
    let s = engine.initGame(players.slice(0, count));
    for (let turns = 0; !s.winner && !s.isDraw && turns < limit; turns++) {
      const before = JSON.stringify(s),
        id = s.currentTurnPlayerId,
        a = engine.getBotAction(s, id);
      assert.ok(a);
      assert.ok(engine.validateAction(s, id, a), JSON.stringify(a));
      s = engine.applyAction(s, id, a);
      assert.notEqual(JSON.stringify(s), before);
      if (game === 'mancala')
        assert.equal(
          s.pits.reduce((a: number, b: number) => a + b, 0),
          Number((rules as any).seedsPerPit) * 12,
        );
      if (game === 'rummy') {
        const all = [...s.pool, ...s.table.flat(), ...s.players.flatMap((p: any) => p.hand)];
        assert.equal(all.length, (rules as any).useJokers ? 106 : 104);
        assert.equal(new Set(all.map((t: any) => t.id)).size, all.length);
      }
    }
    assert.ok(s.winner || s.isDraw, `No terminó ${game}`);
  });
test('Rummy: apertura configurada, sin comodines y partida independiente', () => {
  const e = new RummyDeFichasEngine();
  e.setRules({ openingPoints: 50, startingTiles: 10, useJokers: false });
  const s = e.initGame(players.slice(0, 2));
  assert.equal(s.players[0].hand.length, 10);
  assert.equal(s.pool.length, 84);
  assert.equal(
    [...s.pool, ...s.players.flatMap((p) => p.hand)].some((t) => t.joker),
    false,
  );
  s.players[0].hand = [tile(8), tile(9), tile(10), tile(0)];
  assert.equal(e.validateAction(s, 'p0', { type: 'PLAY_TABLE', sets: [[8, 9, 10]] }), false);
  assert.equal(new RummyDeFichasEngine().initGame(players.slice(0, 2)).rules.openingPoints, 30);
});
test('Impostor: tema aplicado y categoría oculta sin filtrar el secreto', () => {
  const e = new ImpostorEngine();
  e.setRules({ clueRounds: 1, showCategory: false, wordCategory: 2 });
  let s = e.initGame(players.slice(0, 3));
  assert.equal(s.secret.category, 'Comida');
  for (const p of s.players) assert.equal(e.getSanitizedState(s, p.id).category, null);
  while (s.phase === 'clue')
    s = e.applyAction(s, s.currentTurnPlayerId, { type: 'CLUE', word: 'misterio' });
  assert.equal(s.clues.length, 3);
  assert.equal(s.phase, 'vote');
});
test('Ajedrez: reclamación y tablas automáticas por quinta repetición', () => {
  const e = new AjedrezEngine();
  e.setRules({ automaticDraws: false });
  let s = e.initGame(players.slice(0, 2));
  const moves = [
    ['g1', 'f3'],
    ['g8', 'f6'],
    ['f3', 'g1'],
    ['f6', 'g8'],
  ];
  for (let round = 0; round < 2; round++)
    for (const [from, to] of moves)
      s = e.applyAction(s, s.currentTurnPlayerId, { type: 'MOVE', from, to });
  assert.equal(s.isDraw, false);
  assert.equal(e.getSanitizedState(s, 'p0').canClaimDraw, true);
  assert.equal(e.validateAction(s, 'p1', { type: 'CLAIM_DRAW' }), false);
  assert.equal(e.applyAction(s, 'p0', { type: 'CLAIM_DRAW' }).isDraw, true);
  for (let round = 0; round < 2; round++)
    for (const [from, to] of moves)
      s = e.applyAction(s, s.currentTurnPlayerId, { type: 'MOVE', from, to });
  assert.equal(s.isDraw, true);
  s = e.initGame(players.slice(0, 2));
  s.fen = '7k/8/8/8/8/8/8/KR6 w - - 100 51';
  assert.equal(e.validateAction(s, 'p0', { type: 'CLAIM_DRAW' }), true);
  s.fen = '7k/8/8/8/8/8/8/KR6 w - - 149 76';
  s = e.applyAction(s, 'p0', { type: 'MOVE', from: 'b1', to: 'b2' });
  assert.equal(s.isDraw, true);
});
test('Dados: una sola tirada y bonificación superior desactivada', () => {
  const e = new DadosDeCombinacionesEngine();
  e.setRules({ maxRolls: 1, upperBonus: false });
  let s = e.initGame(players.slice(0, 2));
  s = e.applyAction(s, 'p0', { type: 'ROLL', keep: [] });
  assert.equal(e.validateAction(s, 'p0', { type: 'ROLL', keep: [] }), false);
  const p = {
    id: 'p',
    isBot: true,
    scores: { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 },
    bonus: 0,
  };
  assert.equal(combinationTotal(p), 98);
  assert.equal(combinationTotal(p, false), 63);
});
test('Batalla naval: acertar permite repetir solo con esa opción activada', () => {
  const e = new BatallaNavalEngine();
  e.setRules({ hitKeepsTurn: true });
  let s = e.initGame(players.slice(0, 2));
  for (const id of ['p0', 'p1']) {
    s = e.applyAction(s, id, { type: 'RANDOMIZE' });
    s = e.applyAction(s, id, { type: 'READY' });
  }
  const cell = s.players[1].ships[0].cells[0];
  s = e.applyAction(s, 'p0', { type: 'FIRE', index: cell });
  assert.equal(s.currentTurnPlayerId, 'p0');
  const miss = Array.from({ length: 100 }, (_, i) => i).find(
    (i) => !s.players[1].ships.some((ship) => ship.cells.includes(i)),
  )!;
  s = e.applyAction(s, 'p0', { type: 'FIRE', index: miss });
  assert.equal(s.currentTurnPlayerId, 'p1');
});
test('Opciones: límites, tipos y claves válidos; sin cambios compartidos entre salas', () => {
  for (const [game, settings] of Object.entries(GAME_SETTINGS)) {
    const type = game as keyof typeof GAME_SETTINGS;
    for (const setting of settings!) {
      assert.ok(validGameSetting(type, setting.key, setting.defaultValue));
      for (const bad of [null, undefined, NaN, Infinity, -1, 'true', '30', {}, []])
        assert.equal(validGameSetting(type, setting.key, bad), false);
      assert.throws(() => resolveGameSettings(type, { [setting.key]: 'bad' }));
    }
    assert.equal(validGameSetting(type, 'foreign', true), false);
    const a = defaultGameSettings(type),
      b = defaultGameSettings(type);
    assert.notEqual(a, b);
  }
});
test('Opciones caseras documentadas: Jump-In y premio de Escoba desactivados por defecto', () => {
  assert.equal(defaultGameSettings('colorclash').jumpIn, false);
  assert.equal(defaultGameSettings('escoba').allSevensBonus, false);
  assert.equal(validGameSetting('colorclash', 'jumpIn', true), true);
  assert.equal(validGameSetting('colorclash', 'jumpIn', 1), false);
  assert.equal(validGameSetting('escoba', 'allSevensBonus', true), true);
  assert.equal(validGameSetting('escoba', 'allSevensBonus', null), false);
});
