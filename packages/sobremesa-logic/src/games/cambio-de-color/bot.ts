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
export function isCardPlayable(
  card: Card,
  activeColor: PlayableColor,
  topDiscard: Card,
  pendingDraw = 0,
): boolean {
  if (pendingDraw > 0) return card.value === 'draw2' || card.value === 'wild_draw4';
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
  if (state.winner !== null) return null;

  const botHand = state.players.find((p) => p.playerId === botId);
  if (!botHand || botHand.cards.length === 0) {
    return null;
  }

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  if (state.jumpInWindow) {
    const identical = botHand.cards.filter(
      (card) => card.color === topDiscard.color && card.value === topDiscard.value,
    );
    if (!identical.length) return null;
    const dangerous = state.players.some(
      (player) => player.playerId !== botId && player.cards.length <= 2,
    );
    const selected =
      (dangerous &&
        (identical.find((card) => card.value === 'wild_draw4') ||
          identical.find((card) => card.value === 'draw2') ||
          identical.find((card) => card.value === 'skip' || card.value === 'reverse'))) ||
      identical.find((card) => card.value !== 'wild_draw4' && card.value !== 'wild') ||
      identical[0];
    return {
      type: 'PLAY_CARD',
      cardId: selected.id,
      ...(selected.color === 'wild' ? { chosenColor: getMostFrequentColor(botHand.cards) } : {}),
    };
  }

  if (state.currentTurnPlayerId !== botId) return null;
  if (state.pendingDraw > 0 && !state.stackDrawCards) return { type: 'DRAW_CARD' };

  const playableCards = botHand.cards.filter(
    (c) =>
      isCardPlayable(c, state.activeColor, topDiscard, state.pendingDraw) &&
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

  const playerAfterBot = nextColorPlayer(
    state.players.map((player) => player.playerId),
    botId,
    state.turnDirection,
  );
  const dangerousOpponentId = state.players.find(
    (player) => player.playerId !== botId && player.cards.length <= 2,
  )?.playerId;
  const selectedCard = playableCards
    .map((card) => {
      const remaining = botHand.cards.filter((candidate) => candidate.id !== card.id);
      const matchingColorCount = remaining.filter(
        (candidate) => candidate.color === card.color,
      ).length;
      const isAction = ['skip', 'reverse', 'draw2', 'wild_draw4'].includes(card.value);
      const canStopDangerousOpponent =
        isDangerousOpponent &&
        isAction &&
        (state.players.length === 2 || playerAfterBot === dangerousOpponentId);
      const actionValue =
        card.value === 'wild_draw4'
          ? canStopDangerousOpponent
            ? 14
            : -6
          : card.value === 'draw2'
            ? canStopDangerousOpponent
              ? 11
              : 1
            : card.value === 'skip' || card.value === 'reverse'
              ? canStopDangerousOpponent
                ? 8
                : 2
              : 0;
      return {
        card,
        score:
          (remaining.length === 0 ? 1000 : 0) +
          (canStopDangerousOpponent ? 30 : 0) +
          actionValue +
          (card.color === state.activeColor ? 2 : 0) +
          matchingColorCount * 3 +
          (card.color === 'wild' ? -4 : 0),
      };
    })
    .sort((a, b) => b.score - a.score)[0].card;

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

/** Seat order comes from the engine, independently of the room and recipient. */
export function nextColorPlayer(
  playerOrder: readonly string[],
  current: string,
  direction: 1 | -1,
  steps = 1,
): string {
  const index = playerOrder.indexOf(current);
  if (index < 0 || !playerOrder.length) return playerOrder[0] || '';
  return playerOrder[
    (((index + steps * direction) % playerOrder.length) + playerOrder.length) % playerOrder.length
  ];
}
