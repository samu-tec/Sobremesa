import { lazy, type ReactNode } from 'react';
import type { BoardProps } from '../ui/GameLayout';
import type {
  GameType,
  GamePublicState,
  GameAction,
  CiudadFortunaPublicState,
  CambioDeColorPublicState,
  TresEnRayaState,
  CuatroEnLineaState,
  ReversiState,
  DadosAl100State,
  AjedrezPublicState,
  DamasPublicState,
  MancalaState,
  BackgammonPublicState,
  RummyDeFichasPublicState,
  DominoPublicState,
  ImpostorPublicState,
  BatallaNavalPublicState,
  DadosDeCombinacionesPublicState,
} from 'sobremesa-logic';
const CiudadFortunaBoard = lazy(() =>
  import('./CiudadFortunaBoard').then((m) => ({ default: m.CiudadFortunaBoard })),
);
const CambioDeColorBoard = lazy(() =>
  import('./CambioDeColorBoard').then((m) => ({ default: m.CambioDeColorBoard })),
);
const AjedrezBoard = lazy(() =>
  import('./AjedrezBoard').then((m) => ({ default: m.AjedrezBoard })),
);
const DamasBoard = lazy(() => import('./DamasBoard').then((m) => ({ default: m.DamasBoard })));
const MancalaBoard = lazy(() =>
  import('./MancalaBoard').then((m) => ({ default: m.MancalaBoard })),
);
const BackgammonBoard = lazy(() =>
  import('./BackgammonBoard').then((m) => ({ default: m.BackgammonBoard })),
);
const RummyDeFichasBoard = lazy(() =>
  import('./RummyDeFichasBoard').then((m) => ({ default: m.RummyDeFichasBoard })),
);
const DominoBoard = lazy(() => import('./DominoBoard').then((m) => ({ default: m.DominoBoard })));
const ImpostorBoard = lazy(() =>
  import('./ImpostorBoard').then((m) => ({ default: m.ImpostorBoard })),
);
const BatallaNavalBoard = lazy(() =>
  import('./BatallaNavalBoard').then((m) => ({ default: m.BatallaNavalBoard })),
);
const DadosDeCombinacionesBoard = lazy(() =>
  import('./DadosDeCombinacionesBoard').then((m) => ({ default: m.DadosDeCombinacionesBoard })),
);
const TresEnRayaBoard = lazy(() =>
  import('./TresEnRayaBoard').then((m) => ({ default: m.TresEnRayaBoard })),
);
const CuatroEnLineaBoard = lazy(() =>
  import('./CuatroEnLineaBoard').then((m) => ({ default: m.CuatroEnLineaBoard })),
);
const ReversiBoard = lazy(() =>
  import('./ReversiBoard').then((m) => ({ default: m.ReversiBoard })),
);
const DadosAl100Board = lazy(() =>
  import('./DadosAl100Board').then((m) => ({ default: m.DadosAl100Board })),
);

const boards = {
  monopoly: (props) => (
    <CiudadFortunaBoard {...props} state={props.state as CiudadFortunaPublicState} />
  ),
  colorclash: (props) => (
    <CambioDeColorBoard {...props} state={props.state as CambioDeColorPublicState} />
  ),
  chess: (props) => <AjedrezBoard {...props} state={props.state as AjedrezPublicState} />,
  checkers: (props) => <DamasBoard {...props} state={props.state as DamasPublicState} />,
  mancala: (props) => <MancalaBoard {...props} state={props.state as MancalaState} />,
  backgammon: (props) => (
    <BackgammonBoard {...props} state={props.state as BackgammonPublicState} />
  ),
  rummy: (props) => (
    <RummyDeFichasBoard {...props} state={props.state as RummyDeFichasPublicState} />
  ),
  dominoes: (props) => <DominoBoard {...props} state={props.state as DominoPublicState} />,
  impostor: (props) => <ImpostorBoard {...props} state={props.state as ImpostorPublicState} />,
  battleship: (props) => (
    <BatallaNavalBoard {...props} state={props.state as BatallaNavalPublicState} />
  ),
  combinations: (props) => (
    <DadosDeCombinacionesBoard {...props} state={props.state as DadosDeCombinacionesPublicState} />
  ),
  tictactoe: (props) => <TresEnRayaBoard {...props} state={props.state as TresEnRayaState} />,
  connect4: (props) => <CuatroEnLineaBoard {...props} state={props.state as CuatroEnLineaState} />,
  reversi: (props) => <ReversiBoard {...props} state={props.state as ReversiState} />,
  pig: (props) => <DadosAl100Board {...props} state={props.state as DadosAl100State} />,
} satisfies Record<GameType, (props: BoardProps<GamePublicState, GameAction>) => ReactNode>;

export function GameBoard(props: BoardProps<GamePublicState, GameAction>) {
  return boards[props.room.gameType](props);
}
