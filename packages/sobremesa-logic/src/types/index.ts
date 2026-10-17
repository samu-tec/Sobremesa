import type {
  CiudadFortunaPublicState,
  CiudadFortunaAction,
} from '../games/ciudad-fortuna/types.js';
import type {
  CambioDeColorPublicState,
  CambioDeColorAction,
} from '../games/cambio-de-color/types.js';
import type { TresEnRayaState, TresEnRayaAction } from '../games/tres-en-raya/types.js';
import type { CuatroEnLineaState, CuatroEnLineaAction } from '../games/cuatro-en-linea/engine.js';
import type { ReversiState, ReversiAction } from '../games/reversi/engine.js';
import type { DadosAl100State, DadosAl100Action } from '../games/dados-al-100/engine.js';
import type { AjedrezPublicState, AjedrezAction } from '../games/ajedrez/engine.js';
import type { DamasPublicState, DamasAction } from '../games/damas/engine.js';
import type { MancalaState, MancalaAction } from '../games/mancala/engine.js';
import type { BackgammonPublicState, BackgammonAction } from '../games/backgammon/engine.js';
import type {
  RummyDeFichasPublicState,
  RummyDeFichasAction,
} from '../games/rummy-de-fichas/engine.js';
import type { DominoPublicState, DominoAction } from '../games/domino/engine.js';
import type { ImpostorPublicState, ImpostorAction } from '../games/impostor/engine.js';
import type { BatallaNavalPublicState, BatallaNavalAction } from '../games/batalla-naval/engine.js';
import type {
  DadosDeCombinacionesPublicState,
  DadosDeCombinacionesAction,
} from '../games/dados-de-combinaciones/engine.js';

export type GameType =
  | 'tictactoe'
  | 'colorclash'
  | 'monopoly'
  | 'connect4'
  | 'reversi'
  | 'pig'
  | 'rummy'
  | 'chess'
  | 'impostor'
  | 'dominoes'
  | 'checkers'
  | 'backgammon'
  | 'battleship'
  | 'mancala'
  | 'combinations';

export type RoomStatus = 'waiting' | 'in_game' | 'finished';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface RoomInfo {
  code: string;
  gameType: GameType;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  minPlayers: number;
  customRules?: any;
  turnSeconds: number;
  turnDeadline: number | null;
  serverNow: number;
  reconnectGraceMs: number;
}

export type GamePublicState =
  | CiudadFortunaPublicState
  | CambioDeColorPublicState
  | TresEnRayaState
  | CuatroEnLineaState
  | ReversiState
  | DadosAl100State
  | AjedrezPublicState
  | DamasPublicState
  | MancalaState
  | BackgammonPublicState
  | RummyDeFichasPublicState
  | DominoPublicState
  | ImpostorPublicState
  | BatallaNavalPublicState
  | DadosDeCombinacionesPublicState;

export type GameAction =
  | CiudadFortunaAction
  | CambioDeColorAction
  | TresEnRayaAction
  | CuatroEnLineaAction
  | ReversiAction
  | DadosAl100Action
  | AjedrezAction
  | DamasAction
  | MancalaAction
  | BackgammonAction
  | RummyDeFichasAction
  | DominoAction
  | ImpostorAction
  | BatallaNavalAction
  | DadosDeCombinacionesAction;
