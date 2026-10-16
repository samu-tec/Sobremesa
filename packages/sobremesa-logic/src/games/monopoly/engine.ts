import { message as msg, term } from '../../messages.js';
import { IGameEngine } from '../../engine/IGameEngine.js';
import { BOARD_TILES, CHANCE_CARDS, COMMUNITY_CHEST_CARDS, PROPERTY_GROUPS } from './boardData.js';
import {
  BoardTile,
  DEFAULT_MONOPOLY_RULES,
  MonopolyAction,
  MonopolyCustomRules,
  MonopolyPlayer,
  MonopolyPublicState,
  MonopolyState,
  PropertyOwnership,
  MonopolyTradeOffer,
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

export class MonopolyEngine implements IGameEngine<
  MonopolyState,
  MonopolyAction,
  MonopolyPublicState
> {
  private customRules: MonopolyCustomRules;
  constructor(rules: Partial<MonopolyCustomRules> = {}) {
    this.customRules = { ...DEFAULT_MONOPOLY_RULES, ...rules };
  }

  public setRules(rules: Partial<MonopolyCustomRules>) {
    this.customRules = { ...this.customRules, ...rules };
  }

  initGame(players: { id: string; isBot: boolean; name?: string }[]): MonopolyState {
    if (players.length < 2 || players.length > 6) {
      throw new Error('Ciudad Fortuna requiere entre 2 y 6 jugadores');
    }

    const startingCash = this.customRules.startingCash || 1500;

    const monopolyPlayers: MonopolyPlayer[] = players.map((p) => ({
      id: p.id,
      name: p.name || 'Jugador',
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
      round: 1,
      isDraw: false,
      heldJailCards: [],
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
      logs: [
        msg(
          '¡Partida de Ciudad Fortuna iniciada! Todos comienzan en la SALIDA con {0}€.',
          startingCash,
        ),
      ],
      customRules: { ...this.customRules },
      activeTrade: null,
      auction: null,
      chanceDeck: shuffle(CHANCE_CARDS),
      communityDeck: shuffle(COMMUNITY_CHEST_CARDS),
    };
  }

  validateAction(state: MonopolyState, playerId: string, action: MonopolyAction): boolean {
    if (!action || typeof action !== 'object') return false;
    if (state.winner !== null || state.isDraw) return false;
    if (state.auction) {
      const bidder = state.players.find((p) => p.id === playerId && !p.isBankrupt);
      if (!bidder || state.auction.passedPlayerIds.includes(playerId)) return false;
      if (action.type === 'PASS_AUCTION') return playerId !== state.auction.highestBidderId;
      return (
        action.type === 'BID' &&
        playerId !== state.auction.highestBidderId &&
        Number.isSafeInteger(action.amount) &&
        action.amount >= state.auction.currentBid + 10 &&
        action.amount <= bidder.cash
      );
    }

    // Trades can be offered and answered outside the normal turn. Every field is
    // validated on the server, including the claimed sender and remaining cash.
    if (action.type === 'RESPOND_TRADE') {
      if (typeof action.accept !== 'boolean') return false;
      if (
        !state.activeTrade ||
        state.activeTrade.id !== action.tradeId ||
        state.activeTrade.toPlayerId !== playerId
      )
        return false;
      return (
        !action.accept ||
        this.isValidTrade(state, state.activeTrade, state.activeTrade.fromPlayerId)
      );
    }

    if (action.type === 'CANCEL_TRADE') {
      return Boolean(
        state.activeTrade &&
        (state.activeTrade.fromPlayerId === playerId || state.activeTrade.toPlayerId === playerId),
      );
    }

    if (action.type === 'PROPOSE_TRADE') {
      return !state.activeTrade && this.isValidTrade(state, action.trade, playerId);
    }

    // All other actions require it being the player's turn
    if (state.currentTurnPlayerId !== playerId) return false;

    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.isBankrupt) return false;

    if (action.type === 'ROLL_DICE') {
      return player.cash >= 0 && state.turnPhase === 'roll' && !state.hasRolled;
    }

    if (action.type === 'PAY_JAIL_FINE') {
      return (
        player.inJail &&
        state.turnPhase === 'roll' &&
        !state.hasRolled &&
        player.cash >= state.customRules.jailFine
      );
    }

    if (action.type === 'USE_JAIL_CARD') {
      return (
        player.inJail &&
        state.turnPhase === 'roll' &&
        !state.hasRolled &&
        player.getOutOfJailFreeCards > 0
      );
    }

    if (action.type === 'BUY_PROPERTY') {
      if (state.turnPhase !== 'tile_action' || !state.pendingTileAction) return false;
      if (state.pendingTileAction.actionType !== 'buy_property') return false;
      const tile = BOARD_TILES[state.pendingTileAction.tileIndex];
      return player.cash >= (tile.price || 0);
    }

    if (action.type === 'PASS_PROPERTY') {
      return (
        state.turnPhase === 'tile_action' && state.pendingTileAction?.actionType === 'buy_property'
      );
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
      const ownsAll = groupTiles.every(
        (idx) => state.properties[idx]?.ownerId === playerId && !state.properties[idx]?.isMortgaged,
      );
      if (!ownsAll) return false;

      // Even building: cannot build if another property in group has fewer houses
      const minHousesInGroup = Math.min(...groupTiles.map((idx) => state.properties[idx].houses));
      return !state.customRules.evenBuilding || prop.houses === minHousesInGroup;
    }

    if (action.type === 'SELL_HOUSE') {
      const tile = BOARD_TILES[action.tileIndex];
      if (!tile || tile.type !== 'property' || !tile.group) return false;

      const prop = state.properties[action.tileIndex];
      if (!prop || prop.ownerId !== playerId || prop.houses <= 0) return false;

      // Even building rule: cannot sell if another property in group has more houses
      const groupTiles = PROPERTY_GROUPS[tile.group];
      const maxHousesInGroup = Math.max(...groupTiles.map((idx) => state.properties[idx].houses));
      return !state.customRules.evenBuilding || prop.houses === maxHousesInGroup;
    }

    if (action.type === 'MORTGAGE_PROPERTY') {
      const prop = state.properties[action.tileIndex];
      if (!prop || prop.ownerId !== playerId || prop.isMortgaged) return false;

      // Cannot mortgage if any property in the group has houses
      const tile = BOARD_TILES[action.tileIndex];
      if (tile.group && tile.group !== 'station' && tile.group !== 'utility') {
        const groupTiles = PROPERTY_GROUPS[tile.group];
        const anyHouses = groupTiles.some((idx) => state.properties[idx]?.houses > 0);
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

  private isValidTrade(
    state: MonopolyState,
    trade: Omit<MonopolyTradeOffer, 'id'>,
    senderId: string,
  ): boolean {
    if (!trade || trade.fromPlayerId !== senderId || senderId === trade.toPlayerId) return false;
    const from = state.players.find((player) => player.id === senderId);
    const to = state.players.find((player) => player.id === trade.toPlayerId);
    if (!from || !to || from.isBankrupt || to.isBankrupt) return false;
    const validCash = (amount: number, available: number) =>
      Number.isSafeInteger(amount) && amount >= 0 && amount <= available;
    if (!validCash(trade.offeredCash, from.cash) || !validCash(trade.requestedCash, to.cash))
      return false;

    const validProperties = (indices: number[], ownerId: string) => {
      if (!Array.isArray(indices) || new Set(indices).size !== indices.length) return false;
      return indices.every((index) => {
        if (!Number.isInteger(index) || index < 0 || index >= BOARD_TILES.length) return false;
        const tile = BOARD_TILES[index];
        const property = state.properties[index];
        if (!property || property.ownerId !== ownerId || property.houses !== 0) return false;
        // Developed color sets cannot be broken up by trading a single street.
        if (tile.type === 'property' && tile.group) {
          return !PROPERTY_GROUPS[tile.group].some(
            (sibling) => (state.properties[sibling]?.houses ?? 0) > 0,
          );
        }
        return true;
      });
    };

    return (
      validProperties(trade.offeredPropertyIndices, senderId) &&
      validProperties(trade.requestedPropertyIndices, to.id) &&
      (trade.offeredCash > 0 ||
        trade.requestedCash > 0 ||
        trade.offeredPropertyIndices.length > 0 ||
        trade.requestedPropertyIndices.length > 0)
    );
  }

  applyAction(state: MonopolyState, playerId: string, action: MonopolyAction): MonopolyState {
    if (!this.validateAction(state, playerId, action)) return state;
    const newState: MonopolyState = {
      ...state,
      players: state.players.map((p) => ({ ...p })),
      properties: Object.fromEntries(
        Object.entries(state.properties).map(([index, property]) => [index, { ...property }]),
      ),
      logs: [...state.logs],
      chanceDeck: [...state.chanceDeck],
      communityDeck: [...state.communityDeck],
      auction: state.auction
        ? { ...state.auction, passedPlayerIds: [...state.auction.passedPlayerIds] }
        : null,
      heldJailCards: state.heldJailCards.map((held) => ({ ...held })),
    };

    const player = newState.players.find((p) => p.id === playerId);
    if (!player) return newState;

    if (newState.auction && (action.type === 'BID' || action.type === 'PASS_AUCTION')) {
      if (action.type === 'BID') {
        newState.auction.currentBid = action.amount;
        newState.auction.highestBidderId = playerId;
        newState.logs.unshift(
          msg(
            '{0} puja {1} € por {2}.',
            player.name,
            action.amount,
            term(BOARD_TILES[newState.auction.tileIndex].name),
          ),
        );
      } else {
        newState.auction.passedPlayerIds.push(playerId);
      }
      if (!this.hasAuctionChallenger(newState)) this.settleAuction(newState);
      return newState;
    }

    // TRADE HANDLING
    if (action.type === 'PROPOSE_TRADE') {
      newState.activeTrade = {
        fromPlayerId: playerId,
        toPlayerId: action.trade.toPlayerId,
        offeredCash: action.trade.offeredCash,
        requestedCash: action.trade.requestedCash,
        offeredPropertyIndices: [...action.trade.offeredPropertyIndices],
        requestedPropertyIndices: [...action.trade.requestedPropertyIndices],
        id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
      const target = newState.players.find((p) => p.id === action.trade.toPlayerId);
      newState.logs.unshift(
        msg('{0} propuso un intercambio a {1}.', player.name, target?.name || term('otro jugador')),
      );
      return newState;
    }

    if (action.type === 'CANCEL_TRADE') {
      newState.activeTrade = null;
      newState.logs.unshift(msg('El intercambio fue cancelado.'));
      return newState;
    }

    if (action.type === 'RESPOND_TRADE') {
      if (!newState.activeTrade || !action.accept) {
        newState.activeTrade = null;
        newState.logs.unshift(msg('{0} rechazó el intercambio.', player.name));
        return newState;
      }

      // Execute Trade
      const fromP = newState.players.find((p) => p.id === newState.activeTrade!.fromPlayerId)!;
      const toP = newState.players.find((p) => p.id === newState.activeTrade!.toPlayerId)!;

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

      newState.logs.unshift(msg('¡Trato cerrado entre {0} y {1}!', fromP.name, toP.name));
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
      newState.logs.unshift(
        msg('{0} pagó {1}€ para salir de la Cárcel.', player.name, newState.customRules.jailFine),
      );
      return newState;
    }

    if (action.type === 'USE_JAIL_CARD') {
      const heldIndex = newState.heldJailCards.findIndex((held) => held.ownerId === playerId);
      if (heldIndex >= 0) {
        const [held] = newState.heldJailCards.splice(heldIndex, 1);
        (held.card.deck === 'chance' ? newState.chanceDeck : newState.communityDeck).push(
          held.card,
        );
      }
      player.getOutOfJailFreeCards--;
      player.inJail = false;
      player.jailTurns = 0;
      newState.logs.unshift(
        msg('{0} utilizó una Carta de Libertad para salir de la Cárcel.', player.name),
      );
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

      newState.logs.unshift(
        msg(
          '🎲 {0} tiró los dados: [{1}] y [{2}] (Total: {3}){4}',
          player.name,
          d1,
          d2,
          sum,
          term(isDouble ? ' ¡DOBLES!' : ''),
        ),
      );

      // Handle Jail rolling
      if (player.inJail) {
        if (isDouble) {
          player.inJail = false;
          player.jailTurns = 0;
          newState.logs.unshift(msg('{0} sacó dobles y quedó en libertad.', player.name));
          // Doubles release the player but do not grant another throw.
          newState.isDouble = false;
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
            newState.logs.unshift(
              msg(
                '{0} cumplió su condena máxima en prisión, pagó {1}€ y avanza.',
                player.name,
                newState.customRules.jailFine,
              ),
            );
            this.movePlayer(newState, player, sum);
          } else {
            newState.logs.unshift(
              msg(
                '{0} no sacó dobles y permanece en la Cárcel (Turno {1}/{2}).',
                player.name,
                player.jailTurns,
                newState.customRules.maxJailTurns,
              ),
            );
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

      newState.logs.unshift(
        msg('🏠 {0} compró "{1}" por {2}€.', player.name, term(tile.name), price),
      );
      newState.pendingTileAction = null;
      newState.turnPhase = newState.isDouble ? 'roll' : 'end_turn';
      if (newState.isDouble) newState.hasRolled = false;
      return newState;
    }

    // PASS PROPERTY
    if (action.type === 'PASS_PROPERTY') {
      if (!newState.pendingTileAction) return newState;
      const tile = BOARD_TILES[newState.pendingTileAction.tileIndex];
      newState.logs.unshift(msg('{0} decidió no comprar "{1}".', player.name, term(tile.name)));
      newState.pendingTileAction = null;
      if (newState.customRules.auctionEnabled) {
        newState.auction = {
          tileIndex: tile.index,
          currentBid: 0,
          highestBidderId: null,
          passedPlayerIds: [],
        };
        return newState;
      }
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
      newState.logs.unshift(
        msg('🏗️ {0} construyó {1} en "{2}".', player.name, term(label), term(tile.name)),
      );
      return newState;
    }

    // SELL HOUSE
    if (action.type === 'SELL_HOUSE') {
      const tile = BOARD_TILES[action.tileIndex];
      const refund = Math.floor(tile.houseCost! / 2);
      player.cash += refund;
      newState.properties[action.tileIndex].houses--;
      newState.logs.unshift(
        msg(
          '🏚️ {0} vendió una edificación en "{1}" por {2}€.',
          player.name,
          term(tile.name),
          refund,
        ),
      );
      return newState;
    }

    // MORTGAGE
    if (action.type === 'MORTGAGE_PROPERTY') {
      const tile = BOARD_TILES[action.tileIndex];
      player.cash += tile.mortgageValue!;
      newState.properties[action.tileIndex].isMortgaged = true;
      newState.logs.unshift(
        msg(
          '📜 {0} hipotecó "{1}" por {2}€.',
          player.name,
          term(tile.name),
          tile.mortgageValue ?? 0,
        ),
      );
      return newState;
    }

    // UNMORTGAGE
    if (action.type === 'UNMORTGAGE_PROPERTY') {
      const tile = BOARD_TILES[action.tileIndex];
      const cost = Math.round((tile.mortgageValue || 0) * 1.1);
      player.cash -= cost;
      newState.properties[action.tileIndex].isMortgaged = false;
      newState.logs.unshift(
        msg('🔓 {0} levantó la hipoteca de "{1}" por {2}€.', player.name, term(tile.name), cost),
      );
      return newState;
    }

    // DECLARE BANKRUPTCY
    if (action.type === 'DECLARE_BANKRUPTCY') {
      this.returnJailCards(newState, playerId);
      if (
        newState.activeTrade?.fromPlayerId === playerId ||
        newState.activeTrade?.toPlayerId === playerId
      )
        newState.activeTrade = null;
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
      newState.logs.unshift(
        msg('💀 {0} se ha declarado en Bancarrota y queda eliminado de la partida.', player.name),
      );
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

  /** Remove a player who has left a running match without blocking turn progression. */
  forfeitPlayer(state: MonopolyState, playerId: string): MonopolyState {
    const next: MonopolyState = {
      ...state,
      players: state.players.map((p) => ({ ...p })),
      properties: Object.fromEntries(
        Object.entries(state.properties).map(([index, property]) => [index, { ...property }]),
      ),
      logs: [...state.logs],
      heldJailCards: state.heldJailCards.map((held) => ({ ...held })),
      chanceDeck: [...state.chanceDeck],
      communityDeck: [...state.communityDeck],
    };
    const player = next.players.find((p) => p.id === playerId);
    if (!player || player.isBankrupt || next.winner) return next;
    player.isBankrupt = true;
    player.cash = 0;
    this.returnJailCards(next, playerId);
    if (next.auction) {
      next.auction = null;
      next.turnPhase = next.isDouble ? 'roll' : 'end_turn';
      if (next.isDouble) next.hasRolled = false;
      next.logs.unshift(msg('La subasta se canceló por abandono. La propiedad sigue en el banco.'));
    }
    for (const property of Object.values(next.properties)) {
      if (property.ownerId === playerId) {
        property.ownerId = null;
        property.houses = 0;
        property.isMortgaged = false;
      }
    }
    if (next.activeTrade?.fromPlayerId === playerId || next.activeTrade?.toPlayerId === playerId) {
      next.activeTrade = null;
    }
    next.logs.unshift(
      msg('{0} abandonó la partida. Sus propiedades vuelven al banco.', player.name),
    );
    if (next.currentTurnPlayerId === playerId) this.advanceTurn(next);
    this.checkVictory(next);
    return next;
  }

  private hasAuctionChallenger(state: MonopolyState): boolean {
    const auction = state.auction;
    if (!auction) return false;
    return state.players.some(
      (player) =>
        !player.isBankrupt &&
        player.id !== auction.highestBidderId &&
        !auction.passedPlayerIds.includes(player.id) &&
        player.cash >= auction.currentBid + 10,
    );
  }

  /** Finish an auction after the server-side bidding window expires. */
  finishAuction(state: MonopolyState): MonopolyState {
    if (!state.auction) return state;
    const next: MonopolyState = {
      ...state,
      players: state.players.map((player) => ({ ...player })),
      properties: Object.fromEntries(
        Object.entries(state.properties).map(([index, property]) => [index, { ...property }]),
      ),
      logs: [...state.logs],
      auction: { ...state.auction, passedPlayerIds: [...state.auction.passedPlayerIds] },
    };
    this.settleAuction(next);
    return next;
  }

  private settleAuction(state: MonopolyState): void {
    const auction = state.auction;
    if (!auction) return;
    if (auction.highestBidderId) {
      const winner = state.players.find((p) => p.id === auction.highestBidderId && !p.isBankrupt);
      if (winner) {
        winner.cash -= auction.currentBid;
        state.properties[auction.tileIndex] = { ownerId: winner.id, houses: 0, isMortgaged: false };
        state.logs.unshift(
          msg(
            '{0} gana la subasta de {1} por {2} €.',
            winner.name,
            term(BOARD_TILES[auction.tileIndex].name),
            auction.currentBid,
          ),
        );
      } else state.logs.unshift(msg('Subasta desierta. La propiedad sigue en el banco.'));
    } else state.logs.unshift(msg('Subasta desierta. La propiedad sigue en el banco.'));
    state.auction = null;
    state.turnPhase = state.isDouble ? 'roll' : 'end_turn';
    if (state.isDouble) state.hasRolled = false;
  }

  private returnJailCards(state: MonopolyState, playerId: string): void {
    for (const held of state.heldJailCards.filter((held) => held.ownerId === playerId)) {
      (held.card.deck === 'chance' ? state.chanceDeck : state.communityDeck).push(held.card);
    }
    state.heldJailCards = state.heldJailCards.filter((held) => held.ownerId !== playerId);
    const player = state.players.find((p) => p.id === playerId);
    if (player) player.getOutOfJailFreeCards = 0;
  }

  private movePlayer(state: MonopolyState, player: MonopolyPlayer, steps: number): void {
    const oldPos = player.position;
    const newPos = (oldPos + steps) % 40;
    player.position = newPos;

    // Passing GO check
    if (newPos < oldPos || newPos === 0) {
      const isDirectOnGo = newPos === 0;
      const salary =
        isDirectOnGo && state.customRules.doubleGoSalary
          ? state.customRules.salaryGO * 2
          : state.customRules.salaryGO;

      player.cash += salary;
      state.logs.unshift(
        msg('🚩 {0} pasó por la SALIDA y cobró su salario de {1}€.', player.name, salary),
      );
    }

    const tile = BOARD_TILES[newPos];
    state.logs.unshift(msg('{0} cayó en "{1}".', player.name, term(tile.name)));

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
          state.logs.unshift(msg('"{0}" está hipotecada. No se cobra alquiler.', term(tile.name)));
        } else {
          const owner = state.players.find((p) => p.id === prop.ownerId)!;
          const rentAmount =
            !state.customRules.rentInJail && owner.inJail
              ? 0
              : this.calculateRent(state, tile, prop, state.lastDiceSum);

          player.cash -= rentAmount;
          owner.cash += rentAmount;
          state.logs.unshift(
            msg('💸 {0} pagó {1}€ de alquiler a {2}.', player.name, rentAmount, owner.name),
          );
        }
      }
    } else if (tile.type === 'tax') {
      const tax = tile.taxAmount || 100;
      player.cash -= tax;
      if (state.customRules.freeParkingPool) {
        state.freeParkingPool += tax;
      }
      state.logs.unshift(msg('⚖️ {0} pagó {1}€ de impuestos.', player.name, tax));
    } else if (tile.type === 'free_parking') {
      if (state.customRules.freeParkingPool && state.freeParkingPool > 0) {
        const pool = state.freeParkingPool;
        player.cash += pool;
        state.freeParkingPool = 0;
        state.logs.unshift(
          msg('🎁 ¡Bote de Parking Gratuito! {0} se lleva los {1}€ acumulados.', player.name, pool),
        );
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
      state.logs.unshift(msg('Al sacar dobles, {0} tira otra vez.', player.name));
    } else {
      state.turnPhase = 'end_turn';
    }
  }

  private calculateRent(
    state: MonopolyState,
    tile: BoardTile,
    prop: PropertyOwnership,
    diceSum: number,
  ): number {
    if (tile.type === 'station') {
      const stations = PROPERTY_GROUPS.station;
      const count = stations.filter(
        (idx) => state.properties[idx]?.ownerId === prop.ownerId,
      ).length;
      return tile.rent![Math.min(count - 1, 3)] || 25;
    }

    if (tile.type === 'utility') {
      const utilities = PROPERTY_GROUPS.utility;
      const count = utilities.filter(
        (idx) => state.properties[idx]?.ownerId === prop.ownerId,
      ).length;
      return count === 2 ? diceSum * 10 : diceSum * 4;
    }

    // Standard property
    if (prop.houses > 0) {
      return tile.rent![prop.houses];
    }

    // Unimproved: double rent if owner holds full monopoly
    const groupTiles = PROPERTY_GROUPS[tile.group!];
    const hasMonopoly = groupTiles.every((idx) => state.properties[idx]?.ownerId === prop.ownerId);
    return hasMonopoly ? tile.rent![0] * 2 : tile.rent![0];
  }

  private sendToJail(state: MonopolyState, player: MonopolyPlayer, reason: string): void {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    state.doublesRolledThisTurn = 0;
    state.turnPhase = 'end_turn';
    state.logs.unshift(
      msg('👮 ¡A la Cárcel! {0} fue encarcelado por: {1}.', player.name, term(reason)),
    );
  }

  private drawCard(
    state: MonopolyState,
    player: MonopolyPlayer,
    deckType: 'chance' | 'community_chest',
  ): void {
    const deck = deckType === 'chance' ? state.chanceDeck : state.communityDeck;
    const card = deck.shift()!;
    if (card.type === 'jail_free') state.heldJailCards.push({ ownerId: player.id, card });
    else deck.push(card);

    state.logs.unshift(
      msg(
        '🎴 [{0}] {1}: "{2}"',
        term(deckType === 'chance' ? 'Suerte' : 'Caja de Comunidad'),
        player.name,
        term(card.text),
      ),
    );

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
      const activePlayers = state.players.filter((p) => !p.isBankrupt && p.id !== player.id);
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
      state.logs.unshift(msg('{0} pagó {1}€ en reparaciones de fincas.', player.name, total));
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

    const activePlayers = state.players.filter((p) => !p.isBankrupt);
    if (activePlayers.length <= 1) return;

    const currentIndex = state.players.findIndex((p) => p.id === state.currentTurnPlayerId);
    let nextIndex = (currentIndex + 1) % state.players.length;

    while (state.players[nextIndex].isBankrupt) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }

    state.currentTurnPlayerId = state.players[nextIndex].id;
    if (nextIndex <= currentIndex) state.round++;
    state.logs.unshift(msg('Es el turno de {0}.', state.players[nextIndex].name));
  }

  private checkVictory(state: MonopolyState): void {
    const activePlayers = state.players.filter((p) => !p.isBankrupt);
    if (activePlayers.length === 1) {
      state.winner = activePlayers[0].id;
      state.logs.unshift(
        msg(
          '🏆 ¡VICTORIA! {0} es el nuevo Magnate Inmobiliario de Ciudad Fortuna.',
          activePlayers[0].name,
        ),
      );
    } else if (state.customRules.maxRounds != null && state.round > state.customRules.maxRounds) {
      const wealth = (id: string) =>
        state.players.find((p) => p.id === id)!.cash +
        Object.entries(state.properties).reduce((total, [key, property]) => {
          if (property.ownerId !== id) return total;
          const tile = BOARD_TILES[Number(key)];
          return (
            total +
            (tile.price ?? 0) +
            property.houses * (tile.houseCost ?? 0) -
            (property.isMortgaged ? (tile.mortgageValue ?? 0) : 0)
          );
        }, 0);
      const best = Math.max(...activePlayers.map((p) => wealth(p.id)));
      const leaders = activePlayers.filter((p) => wealth(p.id) === best);
      state.winner = leaders.length === 1 ? leaders[0].id : null;
      state.isDraw = leaders.length !== 1;
      state.round = state.customRules.maxRounds;
      state.logs.unshift(
        msg(
          'Fin de las {0} rondas. {1} por patrimonio ({2} €).',
          state.round,
          state.isDraw ? term('Empate') : msg('Gana {0}', leaders[0].name),
          best,
        ),
      );
    }
  }

  getSanitizedState(state: MonopolyState, _playerId: string): MonopolyPublicState {
    return {
      round: state.round,
      isDraw: state.isDraw,
      auction: state.auction
        ? { ...state.auction, passedPlayerIds: [...state.auction.passedPlayerIds] }
        : null,
      players: state.players.map((p) => ({ ...p })),
      properties: Object.fromEntries(
        Object.entries(state.properties).map(([index, property]) => [index, { ...property }]),
      ),
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
      activeTrade: state.activeTrade
        ? {
            ...state.activeTrade,
            offeredPropertyIndices: [...state.activeTrade.offeredPropertyIndices],
            requestedPropertyIndices: [...state.activeTrade.requestedPropertyIndices],
          }
        : null,
      chanceDeckRemaining: state.chanceDeck.length,
      communityDeckRemaining: state.communityDeck.length,
    };
  }

  checkWinner(state: MonopolyState): string | null {
    return state.winner;
  }

  getBotAction(state: MonopolyState, botId: string): MonopolyAction | null {
    const action = getBotMonopolyAction(state, botId);
    if (action && this.validateAction(state, botId, action)) return action;
    if (state.activeTrade?.toPlayerId === botId)
      return { type: 'RESPOND_TRADE', tradeId: state.activeTrade.id, accept: false };
    return null;
  }
}
