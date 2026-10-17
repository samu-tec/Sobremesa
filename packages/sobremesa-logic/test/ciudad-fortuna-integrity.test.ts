import test from 'node:test';
import assert from 'node:assert/strict';
import { CiudadFortunaEngine } from '../src/games/ciudad-fortuna/engine.js';
import { getCiudadFortunaRent } from '../src/games/ciudad-fortuna/economy.js';
import { CHANCE_CARDS } from '../src/games/ciudad-fortuna/boardData.js';
import type { CiudadFortunaAction } from '../src/games/ciudad-fortuna/types.js';

const engine = new CiudadFortunaEngine();
const initial = () =>
  engine.initGame([
    { id: 'a', name: 'Ana', isBot: false },
    { id: 'b', name: 'Bruno', isBot: true },
  ]);

test('La ruta incluye el paso por Salida, las cartas y el traslado directo a prisión', (context) => {
  context.mock.method(Math, 'random', () => 0); // Two ones.
  const state = initial();
  state.players[0].position = 38;
  const rolled = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
  assert.deepEqual(rolled.lastMovement?.path, [
    { position: 39, direct: false },
    { position: 0, direct: false },
  ]);
  assert.equal(rolled.players[0].cash, 1700);
  assert.equal(state.lastMovement, null);
  const cardState = initial();
  cardState.players[0].position = 5;
  cardState.chanceDeck = [CHANCE_CARDS.find((c) => c.type === 'jail')!];
  const jailed = engine.applyAction(cardState, 'a', { type: 'ROLL_DICE' });
  assert.deepEqual(jailed.lastMovement?.path, [
    { position: 6, direct: false },
    { position: 7, direct: false },
    { position: 10, direct: true },
  ]);
  assert.equal(jailed.players[0].cash, 1500);
  assert.equal(jailed.players[0].inJail, true);
  const publicState = engine.getSanitizedState(jailed, 'a');
  publicState.lastMovement!.path[0].position = 0;
  publicState.lastMovement!.dice[0] = 6;
  assert.equal(jailed.lastMovement?.path[0].position, 6);
  assert.deepEqual(jailed.lastMovement?.dice, [1, 1]);
  assert.equal('chanceDeck' in publicState, false);
});

test('La tercera tirada doble va directamente a prisión, sin recorrer los dados', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const state = initial();
  state.players[0].position = 39;
  state.doublesRolledThisTurn = 2;
  const next = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
  assert.deepEqual(next.lastMovement?.path, [{ position: 10, direct: true }]);
  assert.equal(next.players[0].cash, 1500);
});

test('Los índices de propiedades recibidos por red requieren enteros, sin coerción', () => {
  const state = initial();
  for (const i of [1, 3]) state.properties[i].ownerId = 'a';
  for (const tileIndex of ['1', ['1'], {}, 1.5, null, Infinity]) {
    for (const type of ['BUILD_HOUSE', 'SELL_HOUSE', 'MORTGAGE_PROPERTY', 'UNMORTGAGE_PROPERTY']) {
      assert.equal(
        engine.validateAction(state, 'a', { type, tileIndex } as unknown as CiudadFortunaAction),
        false,
      );
    }
  }
});

test('Hipotecar una propiedad ofrecida cancela el trato; no se transfiere deuda oculta', () => {
  const state = initial();
  state.properties[1].ownerId = 'a';
  const offered = engine.applyAction(state, 'a', {
    type: 'PROPOSE_TRADE',
    trade: {
      fromPlayerId: 'a',
      toPlayerId: 'b',
      offeredCash: 0,
      requestedCash: 60,
      offeredPropertyIndices: [1],
      requestedPropertyIndices: [],
    },
  });
  const mortgaged = engine.applyAction(offered, 'a', { type: 'MORTGAGE_PROPERTY', tileIndex: 1 });
  assert.equal(mortgaged.activeTrade, null);
  assert.notEqual(offered.activeTrade, null);
  assert.equal(offered.properties[1].isMortgaged, false);
  assert.equal(
    engine.validateAction(mortgaged, 'b', {
      type: 'RESPOND_TRADE',
      tradeId: offered.activeTrade!.id,
      accept: true,
    }),
    false,
  );
});

test('Los bots valoran precio, hipotecas y grupos, no solo el número de propiedades', () => {
  const state = initial();
  state.properties[1].ownerId = 'a';
  state.properties[39].ownerId = 'b';
  const offer = (offeredCash: number) =>
    engine.applyAction(state, 'a', {
      type: 'PROPOSE_TRADE',
      trade: {
        fromPlayerId: 'a',
        toPlayerId: 'b',
        offeredCash,
        requestedCash: 0,
        offeredPropertyIndices: [1],
        requestedPropertyIndices: [39],
      },
    });
  assert.equal((engine.getBotAction(offer(0), 'b') as { accept: boolean }).accept, false);
  assert.equal((engine.getBotAction(offer(400), 'b') as { accept: boolean }).accept, true);
});

test('Alquileres visibles y cobrados comparten cálculo, incluidas las reglas de prisión', () => {
  const state = initial();
  for (const i of [1, 3, 5, 15, 12, 28]) state.properties[i].ownerId = 'a';
  assert.equal(getCiudadFortunaRent(state, 1), 4);
  state.properties[3].isMortgaged = true;
  assert.equal(getCiudadFortunaRent(state, 1), 4);
  assert.equal(getCiudadFortunaRent(state, 3), 0);
  assert.equal(getCiudadFortunaRent(state, 5), 50);
  assert.equal(getCiudadFortunaRent(state, 12, 9), 90);
  state.players[0].inJail = true;
  state.customRules.rentInJail = false;
  assert.equal(getCiudadFortunaRent(state, 5), 0);
  state.customRules.rentInJail = true;
  state.properties[1].houses = 5;
  assert.equal(getCiudadFortunaRent(state, 1), 250);
});

test('Los historiales y las rutas permanecen acotados en partidas largas', () => {
  let state = initial();
  state.logs = Array.from({ length: 200 }, () => ({ key: 'Evento', values: [] }));
  state = engine.applyAction(state, 'a', { type: 'ROLL_DICE' });
  assert.ok(state.logs.length <= 80);
  assert.ok((state.lastMovement?.path.length ?? 0) <= 52);
});
