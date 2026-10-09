import { BOARD_TILES, PROPERTY_GROUPS } from './boardData.js';
import { MonopolyAction, MonopolyState, PropertyGroup } from './types.js';

export function getBotMonopolyAction(state: MonopolyState, botId: string): MonopolyAction | null {
  if (state.winner !== null || state.currentTurnPlayerId !== botId) {
    // If there is an active trade targeting this bot, respond to it
    if (state.activeTrade && state.activeTrade.toPlayerId === botId) {
      // Evaluate trade: accept if offered cash is >= requested cash and gives bot more properties
      const isGenerous = state.activeTrade.offeredCash >= state.activeTrade.requestedCash;
      return {
        type: 'RESPOND_TRADE',
        tradeId: state.activeTrade.id,
        accept: isGenerous,
      };
    }
    return null;
  }

  const bot = state.players.find(p => p.id === botId);
  if (!bot || bot.isBankrupt) {
    return null;
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
    // If bot has negative cash (in debt), try to mortgage properties
    if (bot.cash < 0) {
      const mortgagableTile = Object.entries(state.properties).find(([idxStr, prop]) => {
        const idx = Number(idxStr);
        return prop.ownerId === botId && !prop.isMortgaged && prop.houses === 0;
      });

      if (mortgagableTile) {
        return { type: 'MORTGAGE_PROPERTY', tileIndex: Number(mortgagableTile[0]) };
      } else {
        // Can't pay debt: declare bankruptcy
        return { type: 'DECLARE_BANKRUPTCY' };
      }
    }

    // Try to build houses on full monopolies if surplus cash exists
    if (bot.cash >= 400) {
      for (const [groupName, tileIndices] of Object.entries(PROPERTY_GROUPS) as [PropertyGroup, number[]][]) {
        if (groupName === 'station' || groupName === 'utility') continue;

        const ownsAll = tileIndices.every(idx => state.properties[idx]?.ownerId === botId && !state.properties[idx]?.isMortgaged);
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
