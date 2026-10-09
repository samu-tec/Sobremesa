export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type PlayableColor = 'red' | 'blue' | 'green' | 'yellow';

export type CardValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild_draw4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface PlayerHand {
  playerId: string;
  isBot: boolean;
  cards: Card[];
}

export interface ColorClashState {
  players: PlayerHand[];
  drawPile: Card[];
  discardPile: Card[];
  activeColor: PlayableColor;
  currentTurnPlayerId: string;
  turnDirection: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  winner: string | null;
  lastActionDescription: string | null;
  hasDrawnThisTurn: boolean;
}

export type ColorClashAction =
  | {
      type: 'PLAY_CARD';
      cardId: string;
      chosenColor?: PlayableColor;
    }
  | {
      type: 'DRAW_CARD';
    }
  | {
      type: 'PASS_TURN';
    };

export interface OpponentPublicInfo {
  playerId: string;
  isBot: boolean;
  cardCount: number;
}

export interface ColorClashPublicState {
  myHand: Card[];
  opponents: OpponentPublicInfo[];
  topDiscardCard: Card;
  activeColor: PlayableColor;
  drawPileCount: number;
  currentTurnPlayerId: string;
  turnDirection: 1 | -1;
  winner: string | null;
  lastActionDescription: string | null;
  hasDrawnThisTurn: boolean;
}
