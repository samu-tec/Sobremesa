export const SPANISH_RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export const SPANISH_SUITS = ['oros', 'copas', 'espadas', 'bastos'] as const;
export type SpanishSuit = (typeof SPANISH_SUITS)[number];
export interface SpanishCard {
  id: number;
  rank: (typeof SPANISH_RANKS)[number];
  suit: SpanishSuit;
}
export function spanishCard(id: number): SpanishCard {
  return { id, suit: SPANISH_SUITS[Math.floor(id / 10)], rank: SPANISH_RANKS[id % 10] };
}
export const spanishDeck = () => Array.from({ length: 40 }, (_, i) => i);
