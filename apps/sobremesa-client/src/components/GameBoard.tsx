import { lazy } from 'react';
import type { BoardProps } from '../ui/GameLayout';
import type {
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

export function GameBoard(props: BoardProps<GamePublicState, GameAction>) {
  switch (props.room.gameType) {
    case 'monopoly':
      return <CiudadFortunaBoard {...props} state={props.state as CiudadFortunaPublicState} />;
    case 'colorclash':
      return <CambioDeColorBoard {...props} state={props.state as CambioDeColorPublicState} />;
    case 'chess':
      return <AjedrezBoard {...props} state={props.state as AjedrezPublicState} />;
    case 'checkers':
      return <DamasBoard {...props} state={props.state as DamasPublicState} />;
    case 'mancala':
      return <MancalaBoard {...props} state={props.state as MancalaState} />;
    case 'backgammon':
      return <BackgammonBoard {...props} state={props.state as BackgammonPublicState} />;
    case 'rummy':
      return <RummyDeFichasBoard {...props} state={props.state as RummyDeFichasPublicState} />;
    case 'dominoes':
      return <DominoBoard {...props} state={props.state as DominoPublicState} />;
    case 'impostor':
      return <ImpostorBoard {...props} state={props.state as ImpostorPublicState} />;
    case 'battleship':
      return <BatallaNavalBoard {...props} state={props.state as BatallaNavalPublicState} />;
    case 'combinations':
      return (
        <DadosDeCombinacionesBoard
          {...props}
          state={props.state as DadosDeCombinacionesPublicState}
        />
      );
    case 'tictactoe':
      return <TresEnRayaBoard {...props} state={props.state as TresEnRayaState} />;
    case 'connect4':
      return <CuatroEnLineaBoard {...props} state={props.state as CuatroEnLineaState} />;
    case 'reversi':
      return <ReversiBoard {...props} state={props.state as ReversiState} />;
    case 'pig':
      return <DadosAl100Board {...props} state={props.state as DadosAl100State} />;
  }
}
