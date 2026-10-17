import { BOARD_TILES, PROPERTY_GROUPS } from './boardData.js';
import type { CiudadFortunaPublicState } from './types.js';

/** One calculation for server payments and the property inspector. */
export function getCiudadFortunaRent(
  state: Pick<CiudadFortunaPublicState, 'properties' | 'players' | 'customRules' | 'lastDiceSum'>,
  tileIndex: number,
  diceSum = state.lastDiceSum,
): number {
  const tile = BOARD_TILES[tileIndex];
  const property = state.properties[tileIndex];
  if (!tile || !property?.ownerId || property.isMortgaged) return 0;
  const owner = state.players.find((p) => p.id === property.ownerId);
  if (!owner || owner.isBankrupt || (!state.customRules.rentInJail && owner.inJail)) return 0;
  if (tile.type === 'station' || tile.type === 'utility') {
    const count = PROPERTY_GROUPS[tile.type].filter(
      (i) => state.properties[i]?.ownerId === owner.id,
    ).length;
    return tile.type === 'station'
      ? (tile.rent?.[count - 1] ?? 0)
      : diceSum * (count === 2 ? 10 : 4);
  }
  if (property.houses > 0) return tile.rent?.[property.houses] ?? 0;
  const complete =
    tile.group &&
    PROPERTY_GROUPS[tile.group].every((i) => state.properties[i]?.ownerId === owner.id);
  return (tile.rent?.[0] ?? 0) * (complete ? 2 : 1);
}
