import { IGameEngine } from '../../engine/IGameEngine.js';
import {
  BOARD_TILES,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  PROPERTY_GROUPS,
} from './boardData.js';
import {
  BoardTile,
  CardEffect,
  DEFAULT_MONOPOLY_RULES,
  MonopolyAction,
  MonopolyCustomRules,
  MonopolyPlayer,
  MonopolyPublicState,
  MonopolyState,
  PropertyGroup,
  PropertyOwnership,
} from './types.js';
import { getBotMonopolyAction } from './bot.js';

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class MonopolyEngine implements IGameEngine<MonopolyState, MonopolyAction, MonopolyPublicState> {
  constructor(private customRules: MonopolyCustomRules = DEFAULT_MONOPOLY_RULES) {}

  public setRules(rules: Partial<MonopolyCustomRules>) {
    this.customRules = { ...this.customRules, ...rules };
  }

  initGame(players: { id: string; isBot: boolean }[]): MonopolyState {
    if (players.length < 2 || players.length > 6) {
      throw new Error('Capital Clash (Monopoly) requiere entre 2 y 6 jugadores');
    }

    const startingCash = this.customRules.startingCash || 1500;

    const monopolyPlayers: MonopolyPlayer[] = players.map(p => ({
      id: p.id,
      name: p.id,
      isBot: p.isBot,
      position: 0,
      cash: startingCash,
      inJail: false,
      jailTurns: 0,
      getOutOfJailFreeCards: 0,
      isBankrupt: false,
      consecutiveDoubles: 0,
    }));

    const properties: Record<number, PropertyOwnership> = {};
    for (const tile of BOARD_TILES) {
      if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
        properties[tile.index] = {
          ownerId: null,
          houses: 0,
          isMortgaged: false,
        };
      }
    }

    return {
      players: monopolyPlayers,
      properties,
      currentTurnPlayerId: monopolyPlayers[0].id,
      turnPhase: 'roll',
      lastDice: [1, 1],
      lastDiceSum: 2,
      isDouble: false,
      doublesRolledThisTurn: 0,
      hasRolled: false,
      pendingTileAction: null,
      freeParkingPool: 0,
      winner: null,
      logs: ['¡Partida de Capital Clash iniciada! Todos comienzan en la SALIDA con ' + startingCash + '€.'],
      customRules: { ...this.customRules },
      activeTrade: null,
      chanceDeck: shuffle(CHANCE_CARDS),
      communityDeck: shuffle(COMMUNITY_CHEST_CARDS),
    };
  }

  validateAction(state: MonopolyState, playerId: string, action: MonopolyAction): boolean {
    if (state.winner !== null) return false;

    // Responding to or cancelling trades can happen off-turn
    if (action.type === 'RESPOND_TRADE') {
      return Boolean(
        state.activeTrade &&
        state.activeTrade.id === action.tradeId &&
        state.activeTrade.toPlayerId === playerId
      );
    }

    if (action.type === 'CANCEL_TRADE') {
      return Boolean(
        state.activeTrade &&
        (state.activeTrade.fromPlayerId === playerId || state.activeTrade.toPlayerId === playerId)
      );
    }

    if (action.type === 'PROPOSE_TRADE') {
      if (state.activeTrade) return false; // only 1 trade at a time
      const player = state.players.find(p => p.id === playerId);
      const target = state.players.find(p => p.id === action.trade.toPlayerId);
      if (!player || !target || player.isBankrupt || target.isBankrupt) return false;
      if (player.cash < action.trade.offeredCash) return false;

      // Ensure properties offered belong to player and have no houses
      for (const idx of action.trade.offeredPropertyIndices) {
        const prop = state.properties[idx];
        if (!prop || prop.ownerId !== playerId || prop.houses > 0) return false;
      }
      // Ensure requested properties belong to target and have no houses
      for (const idx of action.trade.requestedPropertyIndices) {
        const prop = state.properties[idx];
        if (!prop || prop.ownerId !== target.id || prop.houses > 0) return false;
      }
      return true;
    }

    // All other actions require it being the player's turn
    if (state.currentTurnPlayerId !== playerId) return false;

    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isBankrupt) return false;

    if (action.type === 'ROLL_DICE') {
      return state.turnPhase === 'roll' && !state.hasRolled;
    }

    if (action.type === 'PAY_JAIL_FINE') {
      return player.inJail && state.turnPhase === 'roll' && !state.hasRolled && player.cash >= state.customRules.jailFine;
    }

    if (action.type === 'USE_JAIL_CARD') {
      return player.inJail && state.turnPhase === 'roll' && !state.hasRolled && player.getOutOfJailFreeCards > 0;
    }

    if (action.type === 'BUY_PROPERTY') {
      if (state.turnPhase !== 'tile_action' || !state.pendingTileAction) return false;
      if (state.pendingTileAction.actionType !== 'buy_property') return false;
      const tile = BOARD_TILES[state.pendingTileAction.tileIndex];
      return player.cash >= (tile.price || 0);
    }

    if (action.type === 'PASS_PROPERTY') {
      return state.turnPhase === 'tile_action' && state.pendingTileAction?.actionType === 'buy_property';
    }

    if (action.type === 'END_TURN') {
      // Cannot end turn if in negative cash or before rolling
      return state.turnPhase === 'end_turn' && player.cash >= 0;
    }

    if (action.type === 'BUILD_HOUSE') {
      const tile = BOARD_TILES[action.tileIndex];
      if (!tile || tile.type !== 'property' || !tile.group || !tile.houseCost) return false;
      if (player.cash < tile.houseCost) return false;

      const prop = state.properties[action.tileIndex];
      if (!prop || prop.ownerId !== playerId || prop.isMortgaged || prop.houses >= 5) return false;

      // Must own all in group and none mortgaged
      const groupTiles = PROPERTY_GROUPS[tile.group];
      const ownsAll = groupTiles.every(idx => state.properties[idx]?.ownerId === playerId && !state.properties[idx]?.isMortgaged);
      if (!ownsAll) return false;

      // Even building: cannot build if another property in group has fewer houses
      const minHousesInGroup = Math.min(...groupTiles.map(idx => state.properties[idx].houses));
      return prop.houses === minHousesInGroup;
    }

    if (action.type === 'SELL_HOUSE') {
      const tile = BOARD_TILES[action.tileIndex];
      if (!tile || tile.type !== 'property' || !tile.group) return false;

      const prop = state.properties[action.tileIndex];
      if (!prop || prop.ownerId !== playerId || prop.houses <= 0) return false;

      // Even building rule: cannot sell if another property in group has more houses
      const groupTiles = PROPERTY_GROUPS[tile.group];
      const maxHousesInGroup = Math.max(...groupTiles.map(idx => state.properties[idx].houses));
      return prop.houses === maxHousesInGroup;
    }

    if (action.type === 'MORTGAGE_PROPERTY') {
      const prop = state.properties[action.tileIndex];
      if (!prop || prop.ownerId !== playerId || prop.isMortgaged) return false;

      // Cannot mortgage if any property in the group has houses
      const tile = BOARD_TILES[action.tileIndex];
      if (tile.group && (tile.group !== 'station' && tile.group !== 'utility')) {
        const groupTiles = PROPERTY_GROUPS[tile.group];
        const anyHouses = groupTiles.some(idx => state.properties[idx]?.houses > 0);
        if (anyHouses) return false;
      }
      return true;
    }

    if (action.type === 'UNMORTGAGE_PROPERTY') {
      const prop = state.properties[action.tileIndex];
      if (!prop || prop.ownerId !== playerId || !prop.isMortgaged) return false;
      const tile = BOARD_TILES[action.tileIndex];
      const cost = Math.round((tile.mortgageValue || 0) * 1.1);
      return player.cash >= cost;
    }

    if (action.type === 'DECLARE_BANKRUPTCY') {
      return player.cash < 0;
    }

    return false;
  }

  applyAction(state: MonopolyState, playerId: string, action: MonopolyAction): MonopolyState {
    const newState: MonopolyState = {
      ...state,
      players: state.players.map(p => ({ ...p })),
      properties: { ...state.properties },
      logs: [...state.logs],
      chanceDeck: [...state.chanceDeck],
      communityDeck: [...state.communityDeck],
    };

    const player = newState.players.find(p => p.id === playerId);
    if (!player) return newState;

    // TRADE HANDLING
    if (action.type === 'PROPOSE_TRADE') {
      newState.activeTrade = {
        id: `trade_${Date.now()}`,
        ...action.trade,
      };
      const target = newState.players.find(p => p.id === action.trade.toPlayerId);
      newState.logs.unshift(`${player.name} propuso un intercambio a ${target?.name || 'otro jugador'}.`);
      return newState;
    }

    if (action.type === 'CANCEL_TRADE') {
      newState.activeTrade = null;
      newState.logs.unshift(`El intercambio fue cancelado.`);
      return newState;
    }

    if (action.type === 'RESPOND_TRADE') {
      if (!newState.activeTrade || !action.accept) {
        newState.activeTrade = null;
        newState.logs.unshift(`${player.name} rechazó el intercambio.`);
        return newState;
      }

      // Execute Trade
      const fromP = newState.players.find(p => p.id === newState.activeTrade!.fromPlayerId)!;
      const toP = newState.players.find(p => p.id === newState.activeTrade!.toPlayerId)!;

      fromP.cash -= newState.activeTrade.offeredCash;
      toP.cash += newState.activeTrade.offeredCash;

      toP.cash -= newState.activeTrade.requestedCash;
      fromP.cash += newState.activeTrade.requestedCash;

      for (const idx of newState.activeTrade.offeredPropertyIndices) {
        newState.properties[idx] = { ...newState.properties[idx], ownerId: toP.id };
      }
      for (const idx of newState.activeTrade.requestedPropertyIndices) {
        newState.properties[idx] = { ...newState.properties[idx], ownerId: fromP.id };
      }

      newState.logs.unshift(`¡Trato cerrado entre ${fromP.name} y ${toP.name}!`);
      newState.activeTrade = null;
      return newState;
    }

    // JAIL ACTIONS
    if (action.type === 'PAY_JAIL_FINE') {
      player.cash -= newState.customRules.jailFine;
      if (newState.customRules.freeParkingPool) {
        newState.freeParkingPool += newState.customRules.jailFine;
      }
      player.inJail = false;
      player.jailTurns = 0;
      newState.logs.unshift(`${player.name} pagó ${newState.customRules.jailFine}€ para salir de la Cárcel.`);
      return newState;
    }

    if (action.type === 'USE_JAIL_CARD') {
      player.getOutOfJailFreeCards--;
      player.inJail = false;
      player.jailTurns = 0;
      newState.logs.unshift(`${player.name} utilizó una Carta de Libertad para salir de la Cárcel.`);
      return newState;
    }

    // ROLL DICE
    if (action.type === 'ROLL_DICE') {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      const isDouble = d1 === d2;

      newState.lastDice = [d1, d2];
      newState.lastDiceSum = sum;
      newState.isDouble = isDouble;
      newState.hasRolled = true;

      newState.logs.unshift(`🎲 ${player.name} tiró los dados: [${d1}] y [${d2}] (Total: ${sum})${isDouble ? ' ¡DOBLES!' : ''}`);

      // Handle Jail rolling
      if (player.inJail) {
        if (isDouble) {
          player.inJail = false;
          player.jailTurns = 0;
          newState.logs.unshift(`${player.name} sacó dobles y quedó en libertad.`);
          this.movePlayer(newState, player, sum);
          return newState;
        } else {
          player.jailTurns++;
          if (player.jailTurns >= newState.customRules.maxJailTurns) {
            player.cash -= newState.customRules.jailFine;
            if (newState.customRules.freeParkingPool) {
              newState.freeParkingPool += newState.customRules.jailFine;
            }
            player.inJail = false;
            player.jailTurns = 0;
            newState.logs.unshift(`${player.name} cumplió su condena máxima en prisión, pagó ${newState.customRules.jailFine}€ y avanza.`);
            this.movePlayer(newState, player, sum);
          } else {
            newState.logs.unshift(`${player.name} no sacó dobles y permanece en la Cárcel (Turno ${player.jailTurns}/${newState.customRules.maxJailTurns}).`);
            newState.turnPhase = 'end_turn';
          }
          return newState;
        }
      }

      // Normal rolling (not in jail)
      if (isDouble) {
        newState.doublesRolledThisTurn++;
        if (newState.doublesRolledThisTurn >= 3) {
          this.sendToJail(newState, player, '3 dobles consecutivos');
          return newState;
        }
      } else {
        newState.doublesRolledThisTurn = 0;
      }

      this.movePlayer(newState, player, sum);
      return newState;
    }

    // BUY PROPERTY
    if (action.type === 'BUY_PROPERTY') {
      if (!newState.pendingTileAction) return newState;
      const tile = BOARD_TILES[newState.pendingTileAction.tileIndex];
      const price = tile.price || 0;

      player.cash -= price;
      newState.properties[tile.index] = {
        ownerId: player.id,
        houses: 0,
        isMortgaged: false,
      };

      newState.logs.unshift(`🏠 ${player.name} compró "${tile.name}" por ${price}€.`);
      newState.pendingTileAction = null;
      newState.turnPhase = newState.isDouble ? 'roll' : 'end_turn';
      if (newState.isDouble) newState.hasRolled = false;
      return newState;
    }

    // PASS PROPERTY
    if (action.type === 'PASS_PROPERTY') {
      if (!newState.pendingTileAction) return newState;
      const tile = BOARD_TILES[newState.pendingTileAction.tileIndex];
      newState.logs.unshift(`${player.name} decidió no comprar "${tile.name}".`);
      newState.pendingTileAction = null;
      newState.turnPhase = newState.isDouble ? 'roll' : 'end_turn';
      if (newState.isDouble) newState.hasRolled = false;
      return newState;
    }

    // BUILD HOUSE
    if (action.type === 'BUILD_HOUSE') {
      const tile = BOARD_TILES[action.tileIndex];
      player.cash -= tile.houseCost!;
      newState.properties[action.tileIndex].houses++;
      const count = newState.properties[action.tileIndex].houses;
      const label = count === 5 ? 'un Hotel' : `${count} casa(s)`;
      newState.logs.unshift(`🏗️ ${player.name} construyó ${label} en "${tile.name}".`);
      return newState;
    }

    // SELL HOUSE
    if (action.type === 'SELL_HOUSE') {
      const tile = BOARD_TILES[action.tileIndex];
      const refund = Math.floor(tile.houseCost! / 2);
      player.cash += refund;
      newState.properties[action.tileIndex].houses--;
      newState.logs.unshift(`🏚️ ${player.name} vendió una edificación en "${tile.name}" por ${refund}€.`);
      return newState;
    }

    // MORTGAGE
    if (action.type === 'MORTGAGE_PROPERTY') {
      const tile = BOARD_TILES[action.tileIndex];
      player.cash += tile.mortgageValue!;
      newState.properties[action.tileIndex].isMortgaged = true;
      newState.logs.unshift(`📜 ${player.name} hipotecó "${tile.name}" por ${tile.mortgageValue}€.`);
      return newState;
    }

    // UNMORTGAGE
    if (action.type === 'UNMORTGAGE_PROPERTY') {
      const tile = BOARD_TILES[action.tileIndex];
      const cost = Math.round((tile.mortgageValue || 0) * 1.1);
      player.cash -= cost;
      newState.properties[action.tileIndex].isMortgaged = false;
      newState.logs.unshift(`🔓 ${player.name} levantó la hipoteca de "${tile.name}" por ${cost}€.`);
      return newState;
    }

    // DECLARE BANKRUPTCY
    if (action.type === 'DECLARE_BANKRUPTCY') {
      player.isBankrupt = true;
      player.cash = 0;
      // Release all properties
      for (const [idxStr, prop] of Object.entries(newState.properties)) {
        if (prop.ownerId === player.id) {
          newState.properties[Number(idxStr)] = {
            ownerId: null,
            houses: 0,
            isMortgaged: false,
          };
        }
      }
      newState.logs.unshift(`💀 ${player.name} se ha declarado en Bancarrota y queda eliminado de la partida.`);
      this.advanceTurn(newState);
      this.checkVictory(newState);
      return newState;
    }

    // END TURN
    if (action.type === 'END_TURN') {
      this.advanceTurn(newState);
      this.checkVictory(newState);
      return newState;
    }

    return newState;
  }

  private movePlayer(state: MonopolyState, player: MonopolyPlayer, steps: number): void {
    const oldPos = player.position;
    const newPos = (oldPos + steps) % 40;
    player.position = newPos;

    // Passing GO check
    if (newPos < oldPos || newPos === 0) {
      const isDirectOnGo = newPos === 0;
      const salary = isDirectOnGo && state.customRules.doubleGoSalary
        ? state.customRules.salaryGO * 2
        : state.customRules.salaryGO;

      player.cash += salary;
      state.logs.unshift(`🚩 ${player.name} pasó por la SALIDA y cobró su salario de ${salary}€.`);
    }

    const tile = BOARD_TILES[newPos];
    state.logs.unshift(`${player.name} cayó en "${tile.name}".`);

    // Resolve landed tile
    if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
      const prop = state.properties[tile.index];
      if (!prop.ownerId) {
        // Unowned: pending purchase
        state.turnPhase = 'tile_action';
        state.pendingTileAction = {
          tileIndex: tile.index,
          actionType: 'buy_property',
          amount: tile.price,
        };
        return;
      } else if (prop.ownerId !== player.id) {
        // Owned by rival: calculate and pay rent
        if (prop.isMortgaged) {
          state.logs.unshift(`"${tile.name}" está hipotecada. No se cobra alquiler.`);
        } else {
          const owner = state.players.find(p => p.id === prop.ownerId)!;
          const rentAmount = this.calculateRent(state, tile, prop, state.lastDiceSum);

          player.cash -= rentAmount;
          owner.cash += rentAmount;
          state.logs.unshift(`💸 ${player.name} pagó ${rentAmount}€ de alquiler a ${owner.name}.`);
        }
      }
    } else if (tile.type === 'tax') {
      const tax = tile.taxAmount || 100;
      player.cash -= tax;
      if (state.customRules.freeParkingPool) {
        state.freeParkingPool += tax;
      }
      state.logs.unshift(`⚖️ ${player.name} pagó ${tax}€ de impuestos.`);
    } else if (tile.type === 'free_parking') {
      if (state.customRules.freeParkingPool && state.freeParkingPool > 0) {
        const pool = state.freeParkingPool;
        player.cash += pool;
        state.freeParkingPool = 0;
        state.logs.unshift(`🎁 ¡Bote de Parking Gratuito! ${player.name} se lleva los ${pool}€ acumulados.`);
      }
    } else if (tile.type === 'go_to_jail') {
      this.sendToJail(state, player, 'Casilla Ve a la Cárcel');
      return;
    } else if (tile.type === 'chance') {
      this.drawCard(state, player, 'chance');
      return;
    } else if (tile.type === 'community_chest') {
      this.drawCard(state, player, 'community_chest');
      return;
    }

    // Default resolution
    if (state.isDouble && !player.inJail) {
      state.turnPhase = 'roll';
      state.hasRolled = false;
      state.logs.unshift(`Al sacar dobles, ${player.name} tira otra vez.`);
    } else {
      state.turnPhase = 'end_turn';
    }
  }

  private calculateRent(state: MonopolyState, tile: BoardTile, prop: PropertyOwnership, diceSum: number): number {
    if (tile.type === 'station') {
      const stations = PROPERTY_GROUPS.station;
      const count = stations.filter(idx => state.properties[idx]?.ownerId === prop.ownerId).length;
      return tile.rent![Math.min(count - 1, 3)] || 25;
    }

    if (tile.type === 'utility') {
      const utilities = PROPERTY_GROUPS.utility;
      const count = utilities.filter(idx => state.properties[idx]?.ownerId === prop.ownerId).length;
      return count === 2 ? diceSum * 10 : diceSum * 4;
    }

    // Standard property
    if (prop.houses > 0) {
      return tile.rent![prop.houses];
    }

    // Unimproved: double rent if owner holds full monopoly
    const groupTiles = PROPERTY_GROUPS[tile.group!];
    const hasMonopoly = groupTiles.every(idx => state.properties[idx]?.ownerId === prop.ownerId);
    return hasMonopoly ? tile.rent![0] * 2 : tile.rent![0];
  }

  private sendToJail(state: MonopolyState, player: MonopolyPlayer, reason: string): void {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    state.doublesRolledThisTurn = 0;
    state.turnPhase = 'end_turn';
    state.logs.unshift(`👮 ¡A la Cárcel! ${player.name} fue encarcelado por: ${reason}.`);
  }

  private drawCard(state: MonopolyState, player: MonopolyPlayer, deckType: 'chance' | 'community_chest'): void {
    const deck = deckType === 'chance' ? state.chanceDeck : state.communityDeck;
    const card = deck.shift()!;
    deck.push(card); // cycle card back to bottom

    state.logs.unshift(`🎴 [${deckType === 'chance' ? 'Suerte' : 'Caja de Comunidad'}] ${player.name}: "${card.text}"`);

    if (card.type === 'move' && card.targetTile !== undefined) {
      const target = card.targetTile;
      const steps = (target - player.position + 40) % 40;
      this.movePlayer(state, player, steps);
      return;
    } else if (card.type === 'jail') {
      this.sendToJail(state, player, 'Carta de Cárcel');
      return;
    } else if (card.type === 'jail_free') {
      player.getOutOfJailFreeCards++;
    } else if (card.type === 'money' && card.value !== undefined) {
      player.cash += card.value;
      if (card.value < 0 && state.customRules.freeParkingPool) {
        state.freeParkingPool += Math.abs(card.value);
      }
    } else if (card.type === 'pay_players' && card.value !== undefined) {
      const activePlayers = state.players.filter(p => !p.isBankrupt && p.id !== player.id);
      for (const other of activePlayers) {
        player.cash -= card.value;
        other.cash += card.value;
      }
    } else if (card.type === 'repairs') {
      let total = 0;
      for (const prop of Object.values(state.properties)) {
        if (prop.ownerId === player.id) {
          if (prop.houses === 5) total += 100;
          else total += prop.houses * 25;
        }
      }
      player.cash -= total;
      state.logs.unshift(`${player.name} pagó ${total}€ en reparaciones de fincas.`);
    }

    if (state.isDouble && !player.inJail) {
      state.turnPhase = 'roll';
      state.hasRolled = false;
    } else {
      state.turnPhase = 'end_turn';
    }
  }

  private advanceTurn(state: MonopolyState): void {
    state.hasRolled = false;
    state.doublesRolledThisTurn = 0;
    state.isDouble = false;
    state.pendingTileAction = null;
    state.turnPhase = 'roll';

    const activePlayers = state.players.filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1) return;

    const currentIndex = state.players.findIndex(p => p.id === state.currentTurnPlayerId);
    let nextIndex = (currentIndex + 1) % state.players.length;

    while (state.players[nextIndex].isBankrupt) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }

    state.currentTurnPlayerId = state.players[nextIndex].id;
    state.logs.unshift(`Es el turno de ${state.players[nextIndex].name}.`);
  }

  private checkVictory(state: MonopolyState): void {
    const activePlayers = state.players.filter(p => !p.isBankrupt);
    if (activePlayers.length === 1) {
      state.winner = activePlayers[0].id;
      state.logs.unshift(`🏆 ¡VICTORIA! ${activePlayers[0].name} es el nuevo Magnate Inmobiliario de Capital Clash.`);
    }
  }

  getSanitizedState(state: MonopolyState, _playerId: string): MonopolyPublicState {
    return {
      players: state.players.map(p => ({ ...p })),
      properties: { ...state.properties },
      currentTurnPlayerId: state.currentTurnPlayerId,
      turnPhase: state.turnPhase,
      lastDice: [...state.lastDice],
      lastDiceSum: state.lastDiceSum,
      isDouble: state.isDouble,
      hasRolled: state.hasRolled,
      pendingTileAction: state.pendingTileAction ? { ...state.pendingTileAction } : null,
      freeParkingPool: state.freeParkingPool,
      winner: state.winner,
      logs: state.logs.slice(0, 15),
      customRules: { ...state.customRules },
      activeTrade: state.activeTrade ? { ...state.activeTrade } : null,
      chanceDeckRemaining: state.chanceDeck.length,
      communityDeckRemaining: state.communityDeck.length,
    };
  }

  checkWinner(state: MonopolyState): string | null {
    return state.winner;
  }

  getBotAction(state: MonopolyState, botId: string): MonopolyAction | null {
    return getBotMonopolyAction(state, botId);
  }
}
