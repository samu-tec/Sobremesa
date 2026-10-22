import type { PokerAction, PokerPublicState } from '../games/poker/engine.js';
import type { WordsAction, WordsPublicState } from '../games/words/engine.js';
import type { QuizAction, QuizPublicState } from '../games/quiz/engine.js';
import type { DrawingAction, DrawingPublicState } from '../games/drawing/engine.js';
import type { MysteryAction, MysteryPublicState } from '../games/mystery/engine.js';
import type { ConquestAction, ConquestPublicState } from '../games/conquest/engine.js';
import type { CinquilloAction, CinquilloPublicState } from '../games/cinquillo/engine.js';
import type { EscobaAction, EscobaPublicState } from '../games/escoba/engine.js';
import type { MusAction, MusPublicState } from '../games/mus/engine.js';
import type { BriscaAction, BriscaPublicState } from '../games/brisca/engine.js';
import type { MahjongAction, MahjongPublicState } from '../games/mahjong/engine.js';
import type { ChineseAction, ChinesePublicState } from '../games/damas-chinas/engine.js';
import type { GoAction, GoPublicState } from '../games/go/engine.js';
import type { OcaAction, OcaState } from '../games/oca/engine.js';
import type { ParchisAction, ParchisPublicState } from '../games/parchis/engine.js';
import type {
  CiudadFortunaPublicState,
  CiudadFortunaAction,
  CiudadFortunaCustomRules,
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
  | 'combinations'
  | 'parchis'
  | 'oca'
  | 'go'
  | 'chinesecheckers'
  | 'mahjong'
  | 'brisca'
  | 'mus'
  | 'escoba'
  | 'poker'
  | 'words'
  | 'quiz'
  | 'drawing'
  | 'mystery'
  | 'conquest'
  | 'cinquillo';

export type RoomStatus = 'waiting' | 'in_game' | 'finished';

/** Validated scalar options; economic and card options retain their specific types. */
export type RoomRules = Partial<CiudadFortunaCustomRules> & {
  startingCards?: number;
  stackDrawCards?: boolean;
  [key: string]: number | boolean | null | undefined;
};

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface RoomInfo {
  matchId: string;
  code: string;
  gameType: GameType;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  minPlayers: number;
  customRules?: RoomRules;
  turnSeconds: number;
  turnDeadline: number | null;
  autoPlay?: {
    playerId: string;
    mode: 'manual' | 'disconnect' | 'timeout';
    startedAt: number;
    deadline: number | null;
    awaitingHost: boolean;
    permanent: boolean;
  }[];
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
  | DadosDeCombinacionesPublicState
  | ParchisPublicState
  | OcaState
  | GoPublicState
  | ChinesePublicState
  | MahjongPublicState
  | BriscaPublicState
  | MusPublicState
  | EscobaPublicState
  | PokerPublicState
  | WordsPublicState
  | QuizPublicState
  | DrawingPublicState
  | MysteryPublicState
  | ConquestPublicState
  | CinquilloPublicState;

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
  | DadosDeCombinacionesAction
  | ParchisAction
  | OcaAction
  | GoAction
  | ChineseAction
  | MahjongAction
  | BriscaAction
  | MusAction
  | EscobaAction
  | PokerAction
  | WordsAction
  | QuizAction
  | DrawingAction
  | MysteryAction
  | ConquestAction
  | CinquilloAction;
