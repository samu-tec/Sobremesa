import type { GameText } from '../../messages.js';
export type PropertyGroup =
  | 'brown'
  | 'light_blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark_blue'
  | 'station'
  | 'utility';

export type TileType =
  | 'property'
  | 'station'
  | 'utility'
  | 'go'
  | 'community_chest'
  | 'chance'
  | 'tax'
  | 'jail'
  | 'free_parking'
  | 'go_to_jail';

export interface BoardTile {
  index: number; // 0-39
  name: string;
  type: TileType;
  group?: PropertyGroup;
  price?: number;
  rent?: number[]; // [base, 1h, 2h, 3h, 4h, hotel] or station [25, 50, 100, 200]
  houseCost?: number;
  mortgageValue?: number;
  taxAmount?: number;
}

export interface MonopolyCustomRules {
  maxRounds?: number;
  startingCash: number; // 1500 (standard), 1000, 2000, 2500
  salaryGO: number; // 200 (standard), 300, 400
  doubleGoSalary: boolean; // landing directly on GO pays double
  freeParkingPool: boolean; // fines/taxes placed in Free Parking
  auctionEnabled: boolean; // auction property if lander declines
  rentInJail: boolean;
  evenBuilding: boolean;
  jailFine: number; // 50 (standard)
  maxJailTurns: number; // 3 (standard)
}

export const DEFAULT_MONOPOLY_RULES: MonopolyCustomRules = {
  maxRounds: 40,
  startingCash: 1500,
  salaryGO: 200,
  doubleGoSalary: false,
  freeParkingPool: false,
  auctionEnabled: true,
  rentInJail: true,
  evenBuilding: true,
  jailFine: 50,
  maxJailTurns: 3,
};

export interface PropertyOwnership {
  ownerId: string | null;
  houses: number; // 0-4 = houses, 5 = hotel
  isMortgaged: boolean;
}

export interface MonopolyPlayer {
  id: string;
  name: string;
  isBot: boolean;
  position: number; // 0-39
  cash: number;
  inJail: boolean;
  jailTurns: number;
  getOutOfJailFreeCards: number;
  isBankrupt: boolean;
  consecutiveDoubles: number;
}

export interface CardEffect {
  id: string;
  deck: 'chance' | 'community_chest';
  text: string;
  type: 'move' | 'money' | 'jail' | 'repairs' | 'pay_players' | 'jail_free';
  value?: number;
  targetTile?: number;
}

export type TurnPhase =
  | 'roll' // Player must roll dice (or pay jail fine / use jail card)
  | 'tile_action' // Pending buying property, drawing card, etc.
  | 'end_turn'; // Free to trade, build houses, mortgage, or end turn

export interface PendingTileAction {
  tileIndex: number;
  actionType: 'buy_property' | 'pay_rent' | 'tax' | 'chance' | 'community_chest' | 'go_to_jail';
  amount?: number;
  cardText?: string;
}

export interface MonopolyTradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offeredCash: number;
  offeredPropertyIndices: number[];
  requestedCash: number;
  requestedPropertyIndices: number[];
}

export interface MonopolyState {
  heldJailCards: { ownerId: string; card: CardEffect }[];
  round: number;
  isDraw: boolean;
  auction: MonopolyAuction | null;
  players: MonopolyPlayer[];
  properties: Record<number, PropertyOwnership>;
  currentTurnPlayerId: string;
  turnPhase: TurnPhase;
  lastDice: [number, number];
  lastDiceSum: number;
  isDouble: boolean;
  doublesRolledThisTurn: number;
  hasRolled: boolean;
  pendingTileAction: PendingTileAction | null;
  freeParkingPool: number;
  winner: string | null;
  logs: GameText[];
  customRules: MonopolyCustomRules;
  activeTrade: MonopolyTradeOffer | null;
  chanceDeck: CardEffect[];
  communityDeck: CardEffect[];
}

export type MonopolyAction =
  | { type: 'BID'; amount: number }
  | { type: 'PASS_AUCTION' }
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'PASS_PROPERTY' }
  | { type: 'END_TURN' }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'BUILD_HOUSE'; tileIndex: number }
  | { type: 'SELL_HOUSE'; tileIndex: number }
  | { type: 'MORTGAGE_PROPERTY'; tileIndex: number }
  | { type: 'UNMORTGAGE_PROPERTY'; tileIndex: number }
  | { type: 'PROPOSE_TRADE'; trade: Omit<MonopolyTradeOffer, 'id'> }
  | { type: 'RESPOND_TRADE'; tradeId: string; accept: boolean }
  | { type: 'CANCEL_TRADE' }
  | { type: 'DECLARE_BANKRUPTCY' };

export interface MonopolyPublicState {
  round: number;
  isDraw: boolean;
  auction: MonopolyAuction | null;
  players: MonopolyPlayer[];
  properties: Record<number, PropertyOwnership>;
  currentTurnPlayerId: string;
  turnPhase: TurnPhase;
  lastDice: [number, number];
  lastDiceSum: number;
  isDouble: boolean;
  hasRolled: boolean;
  pendingTileAction: PendingTileAction | null;
  freeParkingPool: number;
  winner: string | null;
  logs: GameText[];
  customRules: MonopolyCustomRules;
  activeTrade: MonopolyTradeOffer | null;
  chanceDeckRemaining: number;
  communityDeckRemaining: number;
}

export interface MonopolyAuction {
  tileIndex: number;
  currentBid: number;
  highestBidderId: string | null;
  currentBidderId: string;
  passedPlayerIds: string[];
}
