import {
  Card,
  CardValue,
  CambioDeColorAction,
  CambioDeColorState,
  PlayableColor,
} from './types.js';

const PLAYABLE_COLORS: PlayableColor[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Creates the standard 108-card deck for Color Clash.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  for (const color of PLAYABLE_COLORS) {
    // One '0' card per color
    deck.push({ id: `c_${idCounter++}`, color, value: '0' });

    // Two of each 1-9
    for (let num = 1; num <= 9; num++) {
      const val = num.toString() as CardValue;
      deck.push({ id: `c_${idCounter++}`, color, value: val });
      deck.push({ id: `c_${idCounter++}`, color, value: val });
    }

    // Two of each action card per color
    for (const action of ['skip', 'reverse', 'draw2'] as CardValue[]) {
      deck.push({ id: `c_${idCounter++}`, color, value: action });
      deck.push({ id: `c_${idCounter++}`, color, value: action });
    }
  }

  // 4 Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${idCounter++}`, color: 'wild', value: 'wild' });
  }

  // 4 Wild Draw Four (+4) cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${idCounter++}`, color: 'wild', value: 'wild_draw4' });
  }

  return deck;
}

/**
 * Modern Fisher-Yates array shuffle.
 */
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Validates whether a specific card can be played against the active color and top discard card.
 */
export function isCardPlayable(card: Card, activeColor: PlayableColor, topDiscard: Card): boolean {
  if (card.color === 'wild') {
    return true;
  }
  if (card.color === activeColor) {
    return true;
  }
  if (card.value === topDiscard.value) {
    return true;
  }
  return false;
}

/**
 * Evaluates the dominant color in a hand to intelligently select color for wild cards.
 */
export function getMostFrequentColor(hand: Card[]): PlayableColor {
  const counts: Record<PlayableColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const card of hand) {
    if (card.color !== 'wild') {
      counts[card.color]++;
    }
  }

  let maxCount = -1;
  let bestColor: PlayableColor = 'red';
  for (const color of PLAYABLE_COLORS) {
    if (counts[color] > maxCount) {
      maxCount = counts[color];
      bestColor = color;
    }
  }

  return bestColor;
}

/**
 * Bot strategy for Color Clash.
 */
export function getBotCambioDeColorAction(
  state: CambioDeColorState,
  botId: string,
): CambioDeColorAction | null {
  if (state.winner !== null || state.currentTurnPlayerId !== botId) {
    return null;
  }

  const botHand = state.players.find((p) => p.playerId === botId);
  if (!botHand || botHand.cards.length === 0) {
    return null;
  }

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const playableCards = botHand.cards.filter(
    (c) =>
      isCardPlayable(c, state.activeColor, topDiscard) &&
      (!state.hasDrawnThisTurn || state.drawnCardId === c.id),
  );

  // If no playable cards
  if (playableCards.length === 0) {
    if (state.hasDrawnThisTurn) {
      return { type: 'PASS_TURN' };
    }
    return { type: 'DRAW_CARD' };
  }

  // Check if any opponent is close to winning (e.g. <= 2 cards)
  const isDangerousOpponent = state.players.some(
    (p) => p.playerId !== botId && p.cards.length <= 2,
  );

  // Strategy prioritization:
  // 1. If opponent is dangerous, prioritize +4 or +2 or skip/reverse
  let selectedCard: Card | undefined;
  if (isDangerousOpponent) {
    selectedCard =
      playableCards.find((c) => c.value === 'wild_draw4') ||
      playableCards.find((c) => c.value === 'draw2') ||
      playableCards.find((c) => c.value === 'skip' || c.value === 'reverse');
  }

  // 2. Otherwise prefer matching color actions or numbers
  if (!selectedCard) {
    selectedCard =
      playableCards.find((c) => c.color === state.activeColor) ||
      playableCards.find((c) => c.color !== 'wild') ||
      playableCards[0];
  }

  if (selectedCard.color === 'wild') {
    const chosenColor = getMostFrequentColor(botHand.cards);
    return {
      type: 'PLAY_CARD',
      cardId: selectedCard.id,
      chosenColor,
    };
  }

  return {
    type: 'PLAY_CARD',
    cardId: selectedCard.id,
  };
}
