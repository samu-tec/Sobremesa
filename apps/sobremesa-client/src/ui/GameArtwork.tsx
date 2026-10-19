import { useId, type ComponentType } from 'react';
import type { GameType } from 'sobremesa-logic';
import { AjedrezYDamasArtwork } from './artwork/AjedrezYDamasArtwork';
import { RummyDeFichasArtwork } from './artwork/RummyDeFichasArtwork';
import { ImpostorArtwork } from './artwork/ImpostorArtwork';
import { DominoArtwork } from './artwork/DominoArtwork';
import { BackgammonArtwork } from './artwork/BackgammonArtwork';
import { BatallaNavalArtwork } from './artwork/BatallaNavalArtwork';
import { MancalaArtwork } from './artwork/MancalaArtwork';
import { DadosDeCombinacionesArtwork } from './artwork/DadosDeCombinacionesArtwork';
import { CiudadFortunaArtwork } from './artwork/CiudadFortunaArtwork';
import { CambioDeColorArtwork } from './artwork/CambioDeColorArtwork';
import { CuatroEnLineaArtwork } from './artwork/CuatroEnLineaArtwork';
import { TresEnRayaArtwork } from './artwork/TresEnRayaArtwork';
import { ReversiArtwork } from './artwork/ReversiArtwork';
import { DadosAl100Artwork } from './artwork/DadosAl100Artwork';

const artworks = {
  chess: (props) => <AjedrezYDamasArtwork {...props} game="chess" />,
  checkers: (props) => <AjedrezYDamasArtwork {...props} game="checkers" />,
  rummy: RummyDeFichasArtwork,
  impostor: ImpostorArtwork,
  dominoes: DominoArtwork,
  backgammon: BackgammonArtwork,
  battleship: BatallaNavalArtwork,
  mancala: MancalaArtwork,
  combinations: DadosDeCombinacionesArtwork,
  monopoly: CiudadFortunaArtwork,
  colorclash: CambioDeColorArtwork,
  connect4: CuatroEnLineaArtwork,
  tictactoe: TresEnRayaArtwork,
  reversi: ReversiArtwork,
  pig: DadosAl100Artwork,
} satisfies Record<GameType, ComponentType<{ uid: string }>>;
export function GameArtwork({ game, hero = false }: { game: GameType; hero?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const Artwork = artworks[game];
  const palettes: Record<GameType, [string, string]> = {
    monopoly: ['#ccebdc', '#9ecfb5'],
    colorclash: ['#f8dfd2', '#edbaa7'],
    connect4: ['#dbe1fa', '#b6c0ec'],
    reversi: ['#dce8ce', '#bacd9e'],
    tictactoe: ['#f4e5b9', '#e0ca8e'],
    pig: ['#e6ddf5', '#c9b3e2'],
    rummy: ['#f2e4cc', '#dcc399'],
    chess: ['#dbe6d5', '#acbea3'],
    impostor: ['#e9def3', '#c9b1d9'],
    dominoes: ['#e3d9c8', '#bcae92'],
    checkers: ['#f1d6c4', '#d8ac8b'],
    backgammon: ['#eaddc5', '#c5a071'],
    battleship: ['#d5e9ed', '#9bbfc9'],
    mancala: ['#e8e4cc', '#c4be91'],
    combinations: ['#f0e2bc', '#dbc176'],
  };
  const [bg, shade] = palettes[game];
  return (
    <svg className={`game-art ${hero ? 'hero-art' : ''}`} viewBox="0 0 360 200" aria-hidden="true">
      <defs>
        <linearGradient id={`bg${uid}`} x2="1" y2="1">
          <stop stopColor={bg} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <filter id={`shadow${uid}`} x="-50%" y="-50%" width="200%" height="220%">
          <feDropShadow dx="0" dy="9" stdDeviation="6" floodColor="#19382d" floodOpacity=".19" />
        </filter>
      </defs>
      {!hero && <rect width="360" height="200" fill={`url(#bg${uid})`} />}
      <circle cx="307" cy="19" r="88" fill="white" opacity=".13" />
      <circle cx="24" cy="182" r="65" fill="white" opacity=".13" />
      <Artwork uid={uid} />

      <path
        d="M35 39h10m-5-5v10m269 112h12m-6-6v12"
        stroke={hero ? '#81b59d' : '#fff'}
        strokeWidth="2"
        opacity=".8"
      />
    </svg>
  );
}
