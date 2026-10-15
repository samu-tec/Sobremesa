import { message as msg, term, type GameText } from '../../messages.js';
import { IGameEngine } from '../../engine/IGameEngine.js';
import {
  Card,
  ColorClashAction,
  ColorClashPublicState,
  ColorClashState,
  PlayableColor,
  PlayerHand,
} from './types.js';
import { createDeck, getBotColorClashAction, isCardPlayable, shuffleDeck } from './bot.js';

export class ColorClashEngine implements IGameEngine<
  ColorClashState,
  ColorClashAction,
  ColorClashPublicState
> {
  constructor(private startingCards = 7) {}
  setStartingCards(value: number) {
    this.startingCards = value;
  }
  initGame(players: { id: string; isBot: boolean; name?: string }[]): ColorClashState {
    if (players.length < 2 || players.length > 4) {
      throw new Error('ColorClash requires between 2 and 4 players');
    }

    let deck = shuffleDeck(createDeck());
    const playerHands: PlayerHand[] = [];

    // Deal 7 cards to each player
    for (const p of players) {
      const cards = deck.splice(0, this.startingCards);
      playerHands.push({
        playerId: p.id,
        isBot: p.isBot,
        cards,
      });
    }

    // Find a starting card from deck that is a standard number card (0-9)
    let startIndex = deck.findIndex((c) => c.color !== 'wild' && !isNaN(Number(c.value)));
    if (startIndex === -1) {
      startIndex = 0;
    }
    const [initialCard] = deck.splice(startIndex, 1);
    const activeColor = initialCard.color as PlayableColor;

    return {
      players: playerHands,
      drawPile: deck,
      discardPile: [initialCard],
      activeColor,
      currentTurnPlayerId: players[0].id,
      turnDirection: 1,
      winner: null,
      lastActionDescription: msg('Partida iniciada'),
      hasDrawnThisTurn: false,
      drawnCardId: null,
    };
  }

  validateAction(state: ColorClashState, playerId: string, action: ColorClashAction): boolean {
    if (state.winner !== null) {
      return false;
    }

    if (state.currentTurnPlayerId !== playerId) {
      return false;
    }

    const player = state.players.find((p) => p.playerId === playerId);
    if (!player) {
      return false;
    }

    const topDiscard = state.discardPile[state.discardPile.length - 1];

    if (action.type === 'PLAY_CARD') {
      const card = player.cards.find((c) => c.id === action.cardId);
      if (!card) {
        return false;
      }
      if (state.hasDrawnThisTurn && state.drawnCardId !== card.id) return false;

      if (!isCardPlayable(card, state.activeColor, topDiscard)) {
        return false;
      }

      if (card.color === 'wild') {
        if (
          !action.chosenColor ||
          !['red', 'blue', 'green', 'yellow'].includes(action.chosenColor)
        ) {
          return false;
        }
      }

      return true;
    }

    if (action.type === 'DRAW_CARD') {
      return !state.hasDrawnThisTurn;
    }

    if (action.type === 'PASS_TURN') {
      return state.hasDrawnThisTurn;
    }

    return false;
  }

  applyAction(state: ColorClashState, playerId: string, action: ColorClashAction): ColorClashState {
    const newState: ColorClashState = {
      ...state,
      players: state.players.map((p) => ({ ...p, cards: [...p.cards] })),
      drawPile: [...state.drawPile],
      discardPile: [...state.discardPile],
    };

    const player = newState.players.find((p) => p.playerId === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    const topDiscard = newState.discardPile[newState.discardPile.length - 1];

    if (action.type === 'DRAW_CARD') {
      this.ensureDrawPile(newState);
      if (newState.drawPile.length > 0) {
        const drawnCard = newState.drawPile.pop()!;
        player.cards.push(drawnCard);

        const canPlayDrawn = isCardPlayable(drawnCard, newState.activeColor, topDiscard);
        if (canPlayDrawn) {
          newState.hasDrawnThisTurn = true;
          newState.drawnCardId = drawnCard.id;
          newState.lastActionDescription = msg('Robó 1 carta (puede jugarla o pasar)');
        } else {
          // Auto advance turn if not playable
          newState.hasDrawnThisTurn = false;
          newState.currentTurnPlayerId = this.getNextPlayerId(newState, 1);
          newState.lastActionDescription = msg('Robó 1 carta y pasó turno');
        }
      } else {
        // No cards left even after reshuffle
        newState.hasDrawnThisTurn = false;
        newState.currentTurnPlayerId = this.getNextPlayerId(newState, 1);
        newState.lastActionDescription = msg('No hay cartas para robar');
      }
      return newState;
    }

    if (action.type === 'PASS_TURN') {
      newState.hasDrawnThisTurn = false;
      newState.currentTurnPlayerId = this.getNextPlayerId(newState, 1);
      newState.lastActionDescription = msg('Pasó el turno');
      return newState;
    }

    if (action.type === 'PLAY_CARD') {
      newState.drawnCardId = null;
      const cardIndex = player.cards.findIndex((c) => c.id === action.cardId);
      const [playedCard] = player.cards.splice(cardIndex, 1);
      newState.discardPile.push(playedCard);

      // Check win condition immediately
      if (player.cards.length === 0) {
        newState.winner = playerId;
        newState.lastActionDescription = msg('¡Ha ganado la partida!');
        return newState;
      }

      // Update active color
      if (playedCard.color === 'wild') {
        newState.activeColor = action.chosenColor!;
      } else {
        newState.activeColor = playedCard.color as PlayableColor;
      }

      newState.hasDrawnThisTurn = false;

      // Handle card special effects
      if (playedCard.value === 'draw2') {
        const victimId = this.getNextPlayerId(newState, 1);
        this.drawCardsForPlayer(newState, victimId, 2);
        // Victim skips their turn
        newState.currentTurnPlayerId = this.getNextPlayerId(newState, 2);
        newState.lastActionDescription = msg('Jugó +2 (el siguiente roba 2 y pierde turno)');
      } else if (playedCard.value === 'wild_draw4') {
        const victimId = this.getNextPlayerId(newState, 1);
        this.drawCardsForPlayer(newState, victimId, 4);
        // Victim skips their turn
        newState.currentTurnPlayerId = this.getNextPlayerId(newState, 2);
        newState.lastActionDescription = msg(
          'Jugó +4 y cambió a color {0}',
          term(action.chosenColor!),
        );
      } else if (playedCard.value === 'skip') {
        newState.currentTurnPlayerId = this.getNextPlayerId(newState, 2);
        newState.lastActionDescription = msg('Jugó Salto (el siguiente pierde turno)');
      } else if (playedCard.value === 'reverse') {
        if (newState.players.length === 2) {
          // In 2 player games, reverse acts as a skip (current player plays again)
          newState.currentTurnPlayerId = playerId;
          newState.lastActionDescription = msg('Jugó Cambio de Sentido (juega de nuevo)');
        } else {
          newState.turnDirection = (newState.turnDirection * -1) as 1 | -1;
          newState.currentTurnPlayerId = this.getNextPlayerId(newState, 1);
          newState.lastActionDescription = msg('Cambio de sentido de la ronda');
        }
      } else if (playedCard.value === 'wild') {
        newState.currentTurnPlayerId = this.getNextPlayerId(newState, 1);
        newState.lastActionDescription = msg('Cambió el color a {0}', term(action.chosenColor!));
      } else {
        newState.currentTurnPlayerId = this.getNextPlayerId(newState, 1);
        newState.lastActionDescription = msg(
          'Jugó {0} {1}',
          term(playedCard.color),
          term(playedCard.value),
        );
      }

      return newState;
    }

    return newState;
  }

  getSanitizedState(state: ColorClashState, playerId: string): ColorClashPublicState {
    const player = state.players.find((p) => p.playerId === playerId);
    const myHand = player ? player.cards.map((c) => ({ ...c })) : [];

    const opponents = state.players
      .filter((p) => p.playerId !== playerId)
      .map((p) => ({
        playerId: p.playerId,
        isBot: p.isBot,
        cardCount: p.cards.length,
      }));

    const topDiscardCard = state.discardPile[state.discardPile.length - 1];

    return {
      myHand,
      drawnCardId: state.currentTurnPlayerId === playerId ? state.drawnCardId : null,
      opponents,
      topDiscardCard: { ...topDiscardCard },
      activeColor: state.activeColor,
      drawPileCount: state.drawPile.length,
      currentTurnPlayerId: state.currentTurnPlayerId,
      turnDirection: state.turnDirection,
      winner: state.winner,
      lastActionDescription: state.lastActionDescription,
      hasDrawnThisTurn: state.hasDrawnThisTurn && state.currentTurnPlayerId === playerId,
    };
  }

  checkWinner(state: ColorClashState): string | null {
    return state.winner;
  }

  forfeitPlayer(state: ColorClashState, id: string): ColorClashState {
    const departed = state.players.find((p) => p.playerId === id);
    const players = state.players
      .filter((p) => p.playerId !== id)
      .map((p) => ({ ...p, cards: [...p.cards] }));
    const nextId =
      state.currentTurnPlayerId === id ? this.getNextPlayerId(state, 1) : state.currentTurnPlayerId;
    return {
      ...state,
      players,
      drawPile: shuffleDeck([...state.drawPile, ...(departed?.cards ?? [])]),
      currentTurnPlayerId: nextId,
      winner: players.length === 1 ? players[0].playerId : null,
      hasDrawnThisTurn: state.currentTurnPlayerId === id ? false : state.hasDrawnThisTurn,
      lastActionDescription: msg('Un jugador abandonó. Sus cartas vuelven al mazo.'),
    };
  }

  getBotAction(state: ColorClashState, botId: string): ColorClashAction | null {
    return getBotColorClashAction(state, botId);
  }

  /**
   * Helper: Calculates next player index based on turn direction and step count.
   */
  private getNextPlayerId(state: ColorClashState, steps: number): string {
    const currentIndex = state.players.findIndex((p) => p.playerId === state.currentTurnPlayerId);
    if (currentIndex === -1) return state.players[0].playerId;

    const total = state.players.length;
    const delta = steps * state.turnDirection;
    const nextIndex = (((currentIndex + delta) % total) + total) % total;
    return state.players[nextIndex].playerId;
  }

  /**
   * Helper: Draws cards into a player's hand, reshuffling if necessary.
   */
  private drawCardsForPlayer(state: ColorClashState, targetPlayerId: string, count: number): void {
    const player = state.players.find((p) => p.playerId === targetPlayerId);
    if (!player) return;

    for (let i = 0; i < count; i++) {
      this.ensureDrawPile(state);
      if (state.drawPile.length > 0) {
        player.cards.push(state.drawPile.pop()!);
      }
    }
  }

  /**
   * Ensures the draw pile is populated by recycling and shuffling the discard pile if needed.
   */
  private ensureDrawPile(state: ColorClashState): void {
    if (state.drawPile.length === 0 && state.discardPile.length > 1) {
      const top = state.discardPile.pop()!;
      state.drawPile = shuffleDeck(state.discardPile);
      state.discardPile = [top];
    }
  }
}
