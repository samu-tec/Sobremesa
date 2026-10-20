import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_CATALOG,
  GAME_DEFINITIONS,
  GAME_SETTINGS,
  getGame,
  CiudadFortunaEngine,
  DadosAl100Engine,
  DadosDeCombinacionesEngine,
  type IGameEngine,
} from '../src/index.js';

test('El catálogo conserva treinta juegos únicos y todo juego declara explícitamente sus opciones', () => {
  assert.equal(GAME_CATALOG.length, 30);
  assert.equal(new Set(GAME_CATALOG.map((g) => g.id)).size, 30);
  assert.deepEqual(Object.keys(GAME_DEFINITIONS).sort(), Object.keys(GAME_SETTINGS).sort());
  for (const definition of GAME_CATALOG) {
    assert.equal(getGame(definition.id), definition);
    assert.ok(definition.minPlayers >= 2 && definition.maxPlayers >= definition.minPlayers);
    assert.ok(definition.rules.length && definition.description && definition.name);
  }
});
function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
function reproducible<S, A, P>(make: () => IGameEngine<S, A, P>, action: A) {
  const players = [
    { id: 'a', isBot: false },
    { id: 'b', isBot: false },
  ];
  const a = make(),
    b = make();
  const first = a.initGame(players),
    second = b.initGame(players);
  assert.deepEqual(first, second);
  assert.deepEqual(a.applyAction(first, 'a', action), b.applyAction(second, 'a', action));
}
test('Dados y barajas son reproducibles por partida sin reemplazar Math.random global', () => {
  reproducible(() => new CiudadFortunaEngine({}, seeded(42)), { type: 'ROLL_DICE' });
  reproducible(() => new DadosAl100Engine(seeded(42)), { type: 'ROLL' });
  reproducible(() => new DadosDeCombinacionesEngine(seeded(42)), { type: 'ROLL', keep: [] });
});
