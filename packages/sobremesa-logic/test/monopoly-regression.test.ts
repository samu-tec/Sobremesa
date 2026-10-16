import { MonopolyEngine } from '../src/games/monopoly/engine.js';
import type { MonopolyState, MonopolyTradeOffer } from '../src/games/monopoly/types.js';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(`Regresión de Monopoly: ${message}`);
  console.log(`  ✓ ${message}`);
}

const engine = new MonopolyEngine();
const original = engine.initGame([
  { id: 'a', name: 'Ana', isBot: false },
  { id: 'b', name: 'Bot', isBot: true },
]);
check(
  original.players[0].name === 'Ana',
  'Se utiliza el nombre visible, no el identificador de sesión',
);

const purchased = engine.applyAction(
  {
    ...original,
    turnPhase: 'tile_action',
    pendingTileAction: { tileIndex: 1, actionType: 'buy_property', amount: 60 },
  },
  'a',
  { type: 'BUY_PROPERTY' },
);
check(purchased.properties[1].ownerId === 'a', 'Compra de una propiedad');

const proposed = {
  fromPlayerId: 'a',
  toPlayerId: 'b',
  offeredCash: 20,
  requestedCash: 0,
  offeredPropertyIndices: [1],
  requestedPropertyIndices: [],
};
const valid = (trade: Omit<MonopolyTradeOffer, 'id'>, actor = 'a') =>
  engine.validateAction(purchased, actor, { type: 'PROPOSE_TRADE', trade });
check(valid(proposed), 'Oferta válida aceptada');
check(!valid({ ...proposed, fromPlayerId: 'b' }), 'No se permite suplantar al remitente');
check(!valid(proposed, 'b'), 'No se permite suplantar desde otra sesión');
check(!valid({ ...proposed, toPlayerId: 'a' }), 'No se permiten ofertas a uno mismo');
check(!valid({ ...proposed, offeredCash: -50 }), 'No se permite dinero negativo');
check(!valid({ ...proposed, offeredCash: 1.5 }), 'No se permiten importes decimales');
check(
  !valid({ ...proposed, offeredCash: 999_999 }),
  'No se permite ofrecer más dinero del disponible',
);
check(
  !valid({ ...proposed, requestedCash: 999_999 }),
  'No se permite exigir más efectivo del disponible',
);
check(
  !valid({ ...proposed, offeredPropertyIndices: [1, 1] }),
  'No se permiten propiedades duplicadas',
);
check(
  !valid({ ...proposed, offeredCash: 0, offeredPropertyIndices: [] }),
  'No se permiten tratos vacíos',
);

const offeredState = engine.applyAction(purchased, 'a', { type: 'PROPOSE_TRADE', trade: proposed });
const botAnswer = engine.getBotAction(offeredState, 'b');
check(
  botAnswer?.type === 'RESPOND_TRADE',
  'El bot responde a ofertas durante el turno de otro jugador',
);
const afterSpending: MonopolyState = {
  ...offeredState,
  players: offeredState.players.map((p) => (p.id === 'a' ? { ...p, cash: 0 } : { ...p })),
};
const tradeId = offeredState.activeTrade!.id;
check(
  !engine.validateAction(afterSpending, 'b', { type: 'RESPOND_TRADE', tradeId, accept: true }),
  'La aceptación revalida el saldo',
);
check(
  engine.validateAction(afterSpending, 'b', { type: 'RESPOND_TRADE', tradeId, accept: false }),
  'Siempre es posible rechazar un trato inválido',
);

const properties = Object.fromEntries(
  Object.entries(original.properties).map(([i, prop]) => [i, { ...prop }]),
);
properties[1].ownerId = 'a';
properties[3].ownerId = 'a';
const owned: MonopolyState = { ...original, properties, turnPhase: 'end_turn' };
check(
  engine.validateAction(owned, 'a', { type: 'BUILD_HOUSE', tileIndex: 1 }),
  'Edificación válida en monopolio',
);
const built = engine.applyAction(owned, 'a', { type: 'BUILD_HOUSE', tileIndex: 1 });
check(owned.properties[1].houses === 0, 'El estado previo no muta al construir');
check(built.properties[1].houses === 1, 'La casa aparece en el nuevo estado');
check(
  !engine.validateAction(built, 'a', {
    type: 'PROPOSE_TRADE',
    trade: { ...proposed, offeredPropertyIndices: [3] },
  }),
  'No se comercia con grupos edificados',
);

const forfeited = engine.forfeitPlayer(built, 'a');
check(forfeited.players[0].isBankrupt, 'Salir de una partida equivale a abandonarla');
check(forfeited.properties[1].ownerId === null, 'La propiedad vuelve al banco');
check(forfeited.winner === 'b', 'El último jugador activo gana');
check(!built.players[0].isBankrupt, 'Abandonar tampoco muta estados anteriores');
console.log('Regresiones de Monopoly: todas las comprobaciones correctas.');
