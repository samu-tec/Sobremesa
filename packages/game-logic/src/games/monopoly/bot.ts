import { BOARD_TILES, PROPERTY_GROUPS } from './boardData.js';
import { MonopolyAction, MonopolyState, PropertyGroup } from './types.js';

export function getBotMonopolyAction(state: MonopolyState, botId: string): MonopolyAction | null {
  if (state.winner !== null) return null;
  if (state.auction) {
    if (state.auction.currentBidderId !== botId) return null;
    const bot = state.players.find((p) => p.id === botId)!;
    const amount = state.auction.currentBid + 10;
    return amount <= Math.min(BOARD_TILES[state.auction.tileIndex].price || 0, bot.cash - 100)
      ? { type: 'BID', amount }
      : { type: 'PASS_AUCTION' };
  }

  // A bot must answer incoming trades even if it is currently playing its turn.
  if (state.activeTrade?.toPlayerId === botId) {
    const trade = state.activeTrade;
    const netPropertyGain =
      trade.offeredPropertyIndices.length - trade.requestedPropertyIndices.length;
    return {
      type: 'RESPOND_TRADE',
      tradeId: trade.id,
      accept:
        trade.offeredCash >= trade.requestedCash &&
        netPropertyGain >= 0 &&
        (state.players.find((p) => p.id === botId)?.cash ?? 0) >= trade.requestedCash &&
        (state.players.find((p) => p.id === trade.fromPlayerId)?.cash ?? 0) >= trade.offeredCash,
    };
  }
  if (state.currentTurnPlayerId !== botId) return null;

  const bot = state.players.find((p) => p.id === botId);
  if (!bot || bot.isBankrupt) {
    return null;
  }

  // A debt may occur before a bonus throw or after a compulsory jail payment.
  if (bot.cash < 0) {
    for (const [key, prop] of Object.entries(state.properties)) {
      const tile = BOARD_TILES[Number(key)];
      if (
        prop.ownerId === botId &&
        prop.houses > 0 &&
        tile.group &&
        prop.houses ===
          Math.max(...PROPERTY_GROUPS[tile.group].map((i) => state.properties[i].houses))
      )
        return { type: 'SELL_HOUSE', tileIndex: Number(key) };
    }
    for (const [key, prop] of Object.entries(state.properties)) {
      const tile = BOARD_TILES[Number(key)];
      if (
        prop.ownerId === botId &&
        !prop.isMortgaged &&
        (!tile.group || PROPERTY_GROUPS[tile.group].every((i) => state.properties[i].houses === 0))
      )
        return { type: 'MORTGAGE_PROPERTY', tileIndex: Number(key) };
    }
    return { type: 'DECLARE_BANKRUPTCY' };
  }

  // 1. If In Jail
  if (bot.inJail && !state.hasRolled && state.turnPhase === 'roll') {
    if (bot.getOutOfJailFreeCards > 0) {
      return { type: 'USE_JAIL_CARD' };
    }
    if (bot.cash >= state.customRules.jailFine + 200) {
      return { type: 'PAY_JAIL_FINE' };
    }
    return { type: 'ROLL_DICE' };
  }

  // 2. Roll Phase
  if (state.turnPhase === 'roll' && !state.hasRolled) {
    return { type: 'ROLL_DICE' };
  }

  // 3. Tile Action (e.g. buying landed property)
  if (state.turnPhase === 'tile_action' && state.pendingTileAction) {
    if (state.pendingTileAction.actionType === 'buy_property') {
      const tile = BOARD_TILES[state.pendingTileAction.tileIndex];
      const price = tile.price || 0;
      // Bot buys if it can afford it with a $100 safety cushion
      if (bot.cash >= price + 100) {
        return { type: 'BUY_PROPERTY' };
      } else {
        return { type: 'PASS_PROPERTY' };
      }
    }
  }

  // 4. End Turn Phase: Building or mortgaging or ending turn
  if (state.turnPhase === 'end_turn') {
    // Try to build houses on full monopolies if surplus cash exists
    if (bot.cash >= 400) {
      for (const [groupName, tileIndices] of Object.entries(PROPERTY_GROUPS) as [
        PropertyGroup,
        number[],
      ][]) {
        if (groupName === 'station' || groupName === 'utility') continue;

        const ownsAll = tileIndices.every(
          (idx) => state.properties[idx]?.ownerId === botId && !state.properties[idx]?.isMortgaged,
        );
        if (ownsAll) {
          // Find property in group with the least houses (even building rule)
          let minHouses = 5;
          let candidateTile = -1;

          for (const idx of tileIndices) {
            const h = state.properties[idx].houses;
            if (h < minHouses) {
              minHouses = h;
              candidateTile = idx;
            }
          }

          if (candidateTile !== -1 && minHouses < 5) {
            const houseCost = BOARD_TILES[candidateTile].houseCost || 100;
            if (bot.cash >= houseCost + 200) {
              return { type: 'BUILD_HOUSE', tileIndex: candidateTile };
            }
          }
        }
      }
    }

    // End Turn
    return { type: 'END_TURN' };
  }

  return null;
}
