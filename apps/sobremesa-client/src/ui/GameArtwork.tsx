import { t } from '../i18n';
import { useId, type ComponentType } from 'react';
import type { GameType } from 'sobremesa-logic';

const artworks = {
  poker: PokerArtwork,
  words: WordsArtwork,
  quiz: QuizArtwork,
  drawing: DrawingArtwork,
  mystery: MysteryArtwork,
  conquest: ConquestArtwork,
  cinquillo: CinquilloArtwork,
  escoba: EscobaArtwork,
  mus: MusArtwork,
  brisca: BriscaArtwork,
  mahjong: MahjongArtwork,
  chinesecheckers: ChineseArtwork,
  go: GoArtwork,
  oca: OcaArtwork,
  parchis: ParchisArtwork,
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
    poker: ['#e3d7c6', '#baa58e'],
    words: ['#ede4c8', '#cbbf8e'],
    quiz: ['#e4dfed', '#b8aacb'],
    drawing: ['#e5e7d4', '#bec78e'],
    mystery: ['#e8dfce', '#bfae90'],
    conquest: ['#d8e3d3', '#a7bc9c'],
    cinquillo: ['#e6e5cd', '#bdc9a0'],
    escoba: ['#e9e7c8', '#bfc28c'],
    mus: ['#e8dbc9', '#c5a380'],
    brisca: ['#ede3c9', '#cdb787'],
    mahjong: ['#d9e8d9', '#93b399'],
    chinesecheckers: ['#dce9d8', '#b6caa3'],
    go: ['#eaddbd', '#c2aa78'],
    oca: ['#e7ecd5', '#b7ce9b'],
    parchis: ['#eee4c9', '#c7d6b5'],
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

function AjedrezYDamasArtwork({ uid, game }: { uid: string; game: 'chess' | 'checkers' }) {
  return (
    <g transform="translate(180 103) rotate(-10)" filter={`url(#shadow${uid})`}>
      <rect x="-83" y="-75" width="166" height="150" rx="9" fill="#385342" />
      {Array.from({ length: 64 }, (_, i) => (
        <rect
          key={i}
          x={-75 + (i % 8) * 19}
          y={-67 + Math.floor(i / 8) * 17}
          width="19"
          height="17"
          fill={((i % 8) + Math.floor(i / 8)) % 2 ? '#7d9c7c' : '#f7e9c7'}
        />
      ))}
      {game === 'chess' ? (
        <>
          <text x="-35" y="21" fontSize="85" fill="#fff9dc" stroke="#385342" strokeWidth="1">
            ♔
          </text>
          <text x="18" y="52" fontSize="57" fill="#263e31">
            ♞
          </text>
        </>
      ) : (
        <>
          {[5, 12, 19, 26, 35, 42, 49, 56].map((i, n) => (
            <g key={i}>
              <ellipse
                cx={-66 + (i % 8) * 19}
                cy={-57 + Math.floor(i / 8) * 17}
                rx="8"
                ry="7"
                fill={n < 4 ? '#f5deb3' : '#2d4335'}
                stroke="#68573a"
                strokeWidth="1"
              />
              {n === 4 && (
                <text
                  x={-70 + (i % 8) * 19}
                  y={-54 + Math.floor(i / 8) * 17}
                  fontSize="10"
                  fill="#efd69d"
                >
                  ♛
                </text>
              )}
            </g>
          ))}
        </>
      )}
    </g>
  );
}

function RummyDeFichasArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`} transform="translate(180 102) rotate(-9)">
      <rect x="-118" y="36" width="236" height="19" rx="5" fill="#a6814e" />
      {[
        ['#b44532', 4],
        ['#b44532', 5],
        ['#b44532', 6],
        ['#2e60a4', 10],
        ['#314333', 10],
        ['#8c661b', 10],
      ].map(([color, value], i) => (
        <g key={i} transform={`translate(${-95 + i * 38} 8)`}>
          <rect x="-16" y="-29" width="32" height="59" rx="5" fill="#fff9e5" stroke="#c5b18b" />
          <text y="9" textAnchor="middle" fontSize="26" fontWeight="800" fill={String(color)}>
            {value}
          </text>
          <circle cy="21" r="2" fill={String(color)} />
        </g>
      ))}
      {[10, 11, 12].map((n, i) => (
        <g key={n} transform={`translate(${-51 + i * 39} -57)`}>
          <rect x="-16" y="-25" width="32" height="49" rx="5" fill="#fff9e5" stroke="#c5b18b" />
          <text y="8" textAnchor="middle" fontSize="25" fontWeight="800" fill="#2e60a4">
            {n}
          </text>
        </g>
      ))}
    </g>
  );
}

function ImpostorArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      <path d="M103 53Q180 20 257 53L246 109Q180 164 114 109Z" fill="#67537c" />
      <path
        d="M122 72Q145 54 163 79Q143 99 122 79ZM196 79Q215 54 239 72L239 79Q215 99 196 79Z"
        fill="#fff4dd"
      />
      <path
        d="M164 120Q180 131 196 120"
        fill="none"
        stroke="#c8acd8"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect
        x="140"
        y="139"
        width="83"
        height="39"
        rx="10"
        fill="#fff5df"
        transform="rotate(-8 180 158)"
      />
      <text x="180" y="167" textAnchor="middle" fontSize="29" fill="#7c5d90" fontWeight="700">
        ?
      </text>
      <circle cx="87" cy="123" r="9" fill="#f4deb0" />
      <circle cx="271" cy="134" r="7" fill="#f4deb0" />
    </g>
  );
}

function DominoArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      {[0, 1, 2].map((n) => (
        <g key={n} transform={`translate(${118 + n * 62} ${95 + n * 10}) rotate(${n * 15 - 12})`}>
          <rect x="-24" y="-56" width="48" height="112" rx="7" fill="#fff9e6" stroke="#b0a17e" />
          <path d="M-17 0H17" stroke="#a79b7c" />
          {[-1, 1].map((half) => (
            <g key={half}>
              {Array.from({ length: n + 2 }, (_, i) => (
                <circle
                  key={i}
                  cx={(i % 2 ? 1 : -1) * 10}
                  cy={half * 27 + (Math.floor(i / 2) * 10 - 5)}
                  r="4"
                  fill="#354c3c"
                />
              ))}
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function BackgammonArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 100) rotate(-9)" filter={`url(#shadow${uid})`}>
      <rect x="-103" y="-70" width="206" height="140" rx="8" fill="#84613e" />
      <rect x="-94" y="-61" width="188" height="122" fill="#e8cca1" />
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i}>
          <path
            d={`M${-92 + i * 15.5} -59h15L${-84 + i * 15.5} -6Z M${-92 + i * 15.5} 59h15L${-84 + i * 15.5} 6Z`}
            fill={i % 2 ? '#ad6650' : '#b59b6d'}
          />
          {[0, 1, 2].map(
            (n) =>
              (i % 3 === 0 || i % 5 === 0) && (
                <circle
                  key={n}
                  cx={-84 + i * 15.5}
                  cy={(i % 2 ? 1 : -1) * (48 - n * 13)}
                  r="6.5"
                  fill={i % 2 ? '#2d4435' : '#fff3d6'}
                  stroke="#907d55"
                />
              ),
          )}
        </g>
      ))}
      <rect x="-3" y="-61" width="6" height="122" fill="#84613e" />
    </g>
  );
}

function BatallaNavalArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 100) rotate(-9)" filter={`url(#shadow${uid})`}>
      <rect x="-90" y="-69" width="180" height="138" rx="10" fill="#37657b" />
      {Array.from({ length: 48 }, (_, i) => (
        <rect
          key={i}
          x={-78 + (i % 8) * 20}
          y={-56 + Math.floor(i / 8) * 19}
          width="18"
          height="17"
          fill="#a5c9d1"
        />
      ))}
      <rect x="-57" y="-16" width="76" height="14" rx="5" fill="#5c7b7b" />
      <rect x="24" y="-36" width="14" height="69" rx="5" fill="#5c7b7b" />
      {[9, 26, 42].map((i) => (
        <circle
          key={i}
          cx={-69 + (i % 8) * 20}
          cy={-48 + Math.floor(i / 8) * 19}
          r="5"
          fill="#d9775c"
        />
      ))}
      <path d="M-75 83q20-12 40 0t40 0t40 0t40 0" stroke="#568aa1" strokeWidth="4" fill="none" />
    </g>
  );
}

function MancalaArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 100) rotate(-10)" filter={`url(#shadow${uid})`}>
      <rect x="-120" y="-49" width="240" height="98" rx="45" fill="#af8c58" />
      <ellipse cx="-97" cy="0" rx="14" ry="33" fill="#846d42" />
      <ellipse cx="97" cy="0" rx="14" ry="33" fill="#72815a" />
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i}>
          <ellipse cx={-65 + (i % 6) * 26} cy={i < 6 ? -21 : 21} rx="11" ry="16" fill="#8b7146" />
          {[0, 1, 2, 3].map((n) => (
            <ellipse
              key={n}
              cx={-69 + (i % 6) * 26 + (n % 2) * 7}
              cy={(i < 6 ? -26 : 16) + Math.floor(n / 2) * 9}
              rx="3"
              ry="4"
              fill={n % 3 ? '#f0d791' : '#b9c29a'}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function DadosDeCombinacionesArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      <g transform="translate(230 98) rotate(11)">
        <rect x="-48" y="-64" width="96" height="132" rx="5" fill="#fffaf0" />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <path d={`M-34 ${-39 + i * 12}h68`} stroke="#c2c7ab" />
            <text x="17" y={-41 + i * 12} fontSize="10" fill="#5c785b">
              {[3, 6, 9, 12, 15, 18, 25, 50][i]}
            </text>
          </g>
        ))}
      </g>
      {[
        [121, 91, -14],
        [160, 135, 12],
      ].map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
          <rect x="-29" y="-29" width="58" height="58" rx="12" fill={i ? '#64856a' : '#fff9e8'} />
          {[-1, 1].flatMap((a) =>
            [-1, 1].map((b) => (
              <circle
                key={`${a}${b}`}
                cx={a * 13}
                cy={b * 13}
                r="4"
                fill={i ? '#fff9e8' : '#9d7d46'}
              />
            )),
          )}
          {!i && <circle r="4" fill="#9d7d46" />}
        </g>
      ))}
    </g>
  );
}

function CiudadFortunaArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      <g transform="translate(180 108) rotate(-13)">
        <rect
          x="-114"
          y="-65"
          width="228"
          height="136"
          rx="12"
          fill="#faf9ee"
          stroke="#799e86"
          strokeWidth="2"
        />
        <rect x="-77" y="-42" width="154" height="87" rx="5" fill="#bedcc7" />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <rect
              x={-98 + i * 25}
              y="-59"
              width="21"
              height="15"
              rx="2"
              fill={['#c96a58', '#e2b25b', '#699889', '#7b86bb'][i % 4]}
            />
            <rect
              x={-98 + i * 25}
              y="48"
              width="21"
              height="15"
              rx="2"
              fill={['#699889', '#7b86bb', '#e2b25b', '#c96a58'][i % 4]}
            />
          </g>
        ))}
        <text
          textAnchor="middle"
          y="7"
          fill="#32654f"
          fontFamily="Georgia,serif"
          fontSize="19"
          fontWeight="bold"
        >
          {t('CIUDAD')}
        </text>
        <text
          textAnchor="middle"
          y="24"
          fill="#32654f"
          fontFamily="Georgia,serif"
          fontSize="15"
          letterSpacing="3"
        >
          {t('FORTUNA')}
        </text>
      </g>
      <g transform="translate(235 50) rotate(9)">
        <rect x="0" y="0" width="33" height="49" rx="3" fill="#fff8e5" />
        <path d="M-5 1 L16-18 L39 1Z" fill="#d97750" />
        <rect x="5" y="13" width="7" height="9" fill="#6d9588" />
        <rect x="21" y="13" width="7" height="9" fill="#6d9588" />
        <rect x="14" y="30" width="10" height="19" fill="#527365" />
      </g>
      <g transform="translate(89 115) rotate(-12)">
        <rect width="42" height="42" rx="8" fill="#fff" />
        <g fill="#284b3f">
          <circle cx="11" cy="11" r="3" />
          <circle cx="31" cy="31" r="3" />
          <circle cx="21" cy="21" r="3" />
        </g>
      </g>
      <ellipse cx="274" cy="150" rx="18" ry="7" fill="#dbab4e" />
      <ellipse cx="274" cy="145" rx="18" ry="7" fill="#f6d27d" />
      <ellipse cx="274" cy="140" rx="18" ry="7" fill="#ffe1a0" />
    </g>
  );
}

function CambioDeColorArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      {[
        ['#468b82', -29, -28],
        ['#d8914f', -12, -9],
        ['#7672b3', 9, 12],
        ['#ce6359', 29, 32],
      ].map(([color, angle, dx], i) => (
        <g key={i} transform={`translate(${170 + Number(dx)} 102) rotate(${angle})`}>
          <rect x="-33" y="-55" width="66" height="110" rx="9" fill="#fffaf0" />
          <rect x="-28" y="-50" width="56" height="100" rx="6" fill={String(color)} />
          <circle r="22" fill="#fffaf0" opacity=".95" />
          <text
            textAnchor="middle"
            y="10"
            fontSize="29"
            fontFamily="sans-serif"
            fontWeight="800"
            fill={String(color)}
          >
            {[3, 8, 2, '↻'][i]}
          </text>
          <text x="-22" y="-31" fontSize="13" fill="#fff" fontWeight="700">
            {i + 2}
          </text>
          <text x="14" y="41" fontSize="13" fill="#fff" fontWeight="700">
            {i + 2}
          </text>
        </g>
      ))}
    </g>
  );
}

function CuatroEnLineaArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`} transform="translate(180 99) rotate(-8)">
      <rect x="-86" y="-65" width="172" height="131" rx="10" fill="#576dac" />
      {Array.from({ length: 42 }, (_, i) => (
        <circle
          key={i}
          cx={-66 + (i % 7) * 22}
          cy={-45 + Math.floor(i / 7) * 21}
          r="8"
          fill={i > 24 ? (i % 3 === 0 ? '#f6cc6d' : '#e4826c') : '#bdcae9'}
        />
      ))}
      <rect x="-95" y="64" width="190" height="9" rx="4" fill="#455b9a" />
    </g>
  );
}

function TresEnRayaArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 100) rotate(-10)" filter={`url(#shadow${uid})`}>
      <rect x="-81" y="-73" width="162" height="146" rx="15" fill="#fff9e8" />
      {[-25, 25].map((n) => (
        <g key={n}>
          <path
            d={`M${n} -57V57 M-64 ${n}H64`}
            stroke="#d6c391"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      ))}
      {[
        [-49, -47],
        [0, 0],
        [49, 47],
      ].map(([x, y]) => (
        <path
          key={x}
          d={`M${x - 10} ${y - 10}l20 20m0-20l-20 20`}
          stroke="#bd6d51"
          strokeWidth="7"
          strokeLinecap="round"
        />
      ))}
      <circle cx="49" cy="-47" r="13" stroke="#5a8f79" strokeWidth="7" fill="none" />
      <circle cx="-49" cy="0" r="13" stroke="#5a8f79" strokeWidth="7" fill="none" />
    </g>
  );
}

function ReversiArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 100) rotate(-12)" filter={`url(#shadow${uid})`}>
      <rect x="-78" y="-72" width="156" height="144" rx="10" fill="#618875" />
      {Array.from({ length: 36 }, (_, i) => (
        <rect
          key={i}
          x={-69 + (i % 6) * 23}
          y={-63 + Math.floor(i / 6) * 21}
          width="22"
          height="20"
          rx="1"
          fill={(i + Math.floor(i / 6)) % 2 ? '#779b84' : '#87a58c'}
        />
      ))}
      {[8, 9, 13, 14, 15, 20, 21, 26].map((i, n) => (
        <circle
          key={i}
          cx={-58 + (i % 6) * 23}
          cy={-53 + Math.floor(i / 6) * 21}
          r="9"
          fill={n % 3 ? '#f9f4df' : '#253c35'}
          stroke={n % 3 ? '#dfd9c1' : '#102b24'}
          strokeWidth="2"
        />
      ))}
    </g>
  );
}

function DadosAl100Artwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      <g transform="translate(137 105) rotate(-18)">
        <rect x="-39" y="-39" width="78" height="78" rx="17" fill="#fff9f0" />
        {[
          [-18, -18],
          [18, 18],
          [0, 0],
          [-18, 18],
          [18, -18],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill="#8871ac" />
        ))}
      </g>
      <g transform="translate(223 90) rotate(16)">
        <rect x="-35" y="-35" width="70" height="70" rx="15" fill="#aa8ac9" />
        <circle cx="-15" cy="-15" r="5" fill="#fff9f0" />
        <circle cx="15" cy="15" r="5" fill="#fff9f0" />
      </g>
      <text
        x="229"
        y="164"
        fontSize="28"
        fontFamily="Georgia,serif"
        fill="#6d548c"
        fontStyle="italic"
      >
        100
      </text>
    </g>
  );
}

function ParchisArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 102) rotate(-12)" filter={`url(#shadow${uid})`}>
      <rect
        x="-84"
        y="-78"
        width="168"
        height="156"
        rx="10"
        fill="#fff9e9"
        stroke="#8a9876"
        strokeWidth="4"
      />
      {['#c89b37', '#4e7699', '#b76555', '#587e54'].map((color, i) => (
        <g key={color} transform={`rotate(${i * 90})`}>
          <rect x="-74" y="19" width="52" height="49" rx="5" fill={color} />
          {[0, 1, 2, 3].map((n) => (
            <circle
              key={n}
              cx={-62 + (n % 2) * 25}
              cy={31 + Math.floor(n / 2) * 23}
              r="6"
              fill="#fffbed"
              stroke="#334e3c"
            />
          ))}
          {Array.from({ length: 7 }, (_, n) => (
            <rect key={n} x="-7" y={17 + n * 7} width="14" height="6" fill={color} opacity=".6" />
          ))}
        </g>
      ))}
      <path d="M0 -17L18 0 0 17 -18 0Z" fill="#476e4c" />
    </g>
  );
}

function OcaArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 102) rotate(-8)" filter={`url(#shadow${uid})`}>
      <rect
        x="-90"
        y="-74"
        width="180"
        height="148"
        rx="14"
        fill="#fcf6e7"
        stroke="#7c9469"
        strokeWidth="4"
      />
      <path
        d="M-67 51V-51H67V31H-42V-24H39V6H-13"
        fill="none"
        stroke="#b5c99a"
        strokeWidth="18"
        strokeLinejoin="round"
      />
      <ellipse cx="5" cy="11" rx="34" ry="22" fill="#fffdf3" stroke="#627d58" strokeWidth="2" />
      <path
        d="M21 9Q47 -2 36 -34Q31 -48 44 -48Q60 -45 51 -27L45 17"
        fill="#fffdf3"
        stroke="#627d58"
        strokeWidth="2"
      />
      <path d="M51 -41L66 -36 51 -31Z" fill="#bd8542" />
      <circle cx="45" cy="-40" r="2" fill="#243b32" />
      <path d="M-12 10Q1 29 21 7" fill="none" stroke="#a7b88f" strokeWidth="3" />
      <circle cx="-65" cy="42" r="10" fill="#a55e45" />
      <circle cx="64" cy="-49" r="9" fill="#4b7497" />
    </g>
  );
}

function GoArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(180 102) rotate(-9)" filter={`url(#shadow${uid})`}>
      <rect
        x="-83"
        y="-74"
        width="166"
        height="148"
        rx="10"
        fill="#e3c992"
        stroke="#826d43"
        strokeWidth="3"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} stroke="#806d44" strokeWidth=".8">
          <path d={`M${-66 + i * 16.5} -58V58`} />
          <path d={`M-66 ${-58 + i * 14.5}H66`} />
        </g>
      ))}
      {[
        [-33, -14, 1],
        [0, 0, 0],
        [16, -14, 1],
        [-16, 14, 0],
        [0, 29, 1],
        [33, 14, 0],
      ].map(([x, y, white], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="10"
          fill={white ? '#fffbee' : '#263e34'}
          stroke="#665d46"
        />
      ))}
    </g>
  );
}

function ChineseArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(68 -5) scale(.7)" filter={`url(#shadow${uid})`}>
      <path
        d="M160 25 194 88 266 88 230 150 266 212 194 212 160 275 126 212 54 212 90 150 54 88 126 88Z"
        fill="#e9ce9a"
        stroke="#7c603c"
        strokeWidth="4"
      />
      {[
        [160, 54],
        [236, 104],
        [236, 196],
        [160, 246],
        [84, 196],
        [84, 104],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r="13"
            fill={['#3c7458', '#406c99', '#bd7636', '#a25163', '#7963a2', '#837127'][i]}
            stroke="#fff9e9"
            strokeWidth="3"
          />
          <circle cx={160 + (x - 160) * 0.5} cy={150 + (y - 150) * 0.5} r="7" fill="#8b744c" />
        </g>
      ))}
      <circle cx="160" cy="150" r="8" fill="#8b744c" />
    </g>
  );
}

function MahjongArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(85 53) rotate(-8 90 50)" filter={`url(#shadow${uid})`}>
      {['東', '中', '發'].map((symbol, i) => (
        <g key={symbol} transform={`translate(${i * 62} 0)`}>
          <rect y="5" width="55" height="92" rx="7" fill="#bca77b" />
          <rect width="55" height="88" rx="7" fill="#fff7de" stroke="#a58c5f" strokeWidth="2" />
          <text
            x="27"
            y="60"
            textAnchor="middle"
            fontSize="44"
            fontWeight="700"
            fill={i === 1 ? '#a33d4c' : '#356247'}
          >
            {symbol}
          </text>
        </g>
      ))}
    </g>
  );
}

function BriscaArtwork({ uid }: { uid: string }) {
  return (
    <g transform="translate(110 34)" filter={`url(#shadow${uid})`}>
      <g transform="rotate(-15 50 70)">
        <rect width="92" height="132" rx="9" fill="#fff5d9" stroke="#af9466" strokeWidth="2" />
        <text x="10" y="24" fontSize="19" fill="#375d45">
          1
        </text>
        <circle cx="46" cy="72" r="22" fill="#d5ac51" stroke="#7d5e22" strokeWidth="3" />
        <circle cx="46" cy="72" r="14" fill="none" stroke="#7d5e22" strokeWidth="2" />
      </g>
      <g transform="translate(70 5) rotate(12 46 66)">
        <rect width="92" height="132" rx="9" fill="#fff5d9" stroke="#af9466" strokeWidth="2" />
        <text x="10" y="24" fontSize="19" fill="#9f4d40">
          3
        </text>
        <path
          d="M25 43h42v18c0 16-8 23-21 23S25 77 25 61Zm21 41v22m-18 1h36"
          fill="#bd7661"
          stroke="#884536"
          strokeWidth="3"
        />
      </g>
    </g>
  );
}

function MusArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      {[0, 1, 2, 3].map((i) => (
        <g
          key={i}
          transform={`translate(${79 + i * 47} ${32 + Math.abs(1.5 - i) * 10}) rotate(${(i - 1.5) * 8} 34 60)`}
        >
          <rect width="68" height="120" rx="8" fill="#fff4d7" stroke="#a98d60" strokeWidth="2" />
          <text x="9" y="25" fontSize="20" fontWeight="700" fill="#365941">
            {i % 2 ? 3 : 12}
          </text>
          <path d="m16 69 4-23 14 13 14-13 4 23Z" fill="#d6ad53" stroke="#7f6428" strokeWidth="2" />
          <path d="M19 76h30" stroke="#7f6428" strokeWidth="3" />
        </g>
      ))}
    </g>
  );
}

function EscobaArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      {[7, 5, 3].map((rank, i) => (
        <g
          key={rank}
          transform={`translate(${72 + i * 76} ${38 + (i % 2) * 12}) rotate(${(i - 1) * 8} 32 58)`}
        >
          <rect width="65" height="116" rx="8" fill="#fff5db" stroke="#9d8c5b" strokeWidth="2" />
          <text x="10" y="26" fontSize="23" fontWeight="700" fill="#375941">
            {rank}
          </text>
          <circle cx="32" cy="68" r="17" fill="#cfaa4c" stroke="#86641d" strokeWidth="2" />
          <circle cx="32" cy="68" r="10" fill="none" stroke="#86641d" strokeWidth="2" />
        </g>
      ))}
      <circle cx="282" cy="145" r="28" fill="#3c674d" />
      <text x="282" y="153" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff6dc">
        15
      </text>
    </g>
  );
}

function CinquilloArtwork() {
  return (
    <g>
      {[0, 1, 2, 3].map((row) => (
        <g key={row} transform={`translate(65 ${28 + row * 38})`}>
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <g key={col} transform={`translate(${col * 33} 0)`}>
              <rect
                width="28"
                height="34"
                rx="4"
                fill={col === 3 ? '#f4d37b' : '#fff8e8'}
                stroke="#8e8965"
              />
              <text x="14" y="23" textAnchor="middle" fontSize="18" fill="#345944">
                {col + 2}
              </text>
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function PokerArtwork() {
  return (
    <g>
      <ellipse cx="180" cy="104" rx="134" ry="76" fill="#215348" stroke="#b19160" strokeWidth="9" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${92 + i * 36} 68)`}>
          <rect width="31" height="47" rx="4" fill="#fff8e8" />
          <text
            x="15"
            y="29"
            textAnchor="middle"
            fill={i % 2 ? '#aa3542' : '#27453e'}
            fontSize="24"
          >
            {['A', 'K', 'Q', 'J', '10'][i]}
          </text>
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={157 + i * 23}
          cy="143"
          r="10"
          fill={i % 2 ? '#e5c26a' : '#d97a65'}
          stroke="#fff5da"
          strokeWidth="2"
        />
      ))}
    </g>
  );
}

function WordsArtwork() {
  return (
    <g transform="translate(100 24)">
      {Array.from({ length: 25 }, (_, i) => (
        <rect
          key={i}
          x={(i % 5) * 32}
          y={Math.floor(i / 5) * 32}
          width="29"
          height="29"
          rx="4"
          fill="#efe3c0"
          stroke="#ac9c77"
        />
      ))}
      {'MESA'.split('').map((l, i) => (
        <text key={i} x={i * 32 + 15} y="87" textAnchor="middle" fontSize="23" fill="#314f3f">
          {l}
        </text>
      ))}
      {'SOL'.split('').map((l, i) => (
        <text key={i} x="79" y={i * 32 + 55} textAnchor="middle" fontSize="23" fill="#314f3f">
          {l}
        </text>
      ))}
    </g>
  );
}

function QuizArtwork() {
  return (
    <g>
      <rect
        x="87"
        y="25"
        width="186"
        height="150"
        rx="20"
        fill="#fcf7ed"
        stroke="#9888aa"
        strokeWidth="3"
      />
      <text x="180" y="112" textAnchor="middle" fontSize="82" fill="#725782">
        ?
      </text>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={111 + (i % 2) * 73}
          y={129 + Math.floor(i / 2) * 18}
          width="65"
          height="12"
          rx="5"
          fill={i === 1 ? '#b7c78e' : '#d6c8df'}
        />
      ))}
    </g>
  );
}

function DrawingArtwork() {
  return (
    <g>
      <rect
        x="76"
        y="26"
        width="208"
        height="147"
        rx="10"
        fill="#fffdf5"
        stroke="#899a68"
        strokeWidth="3"
      />
      <path
        d="M103 146 151 78l33 45 24-29 48 52Z"
        fill="#b8cc91"
        stroke="#54764d"
        strokeWidth="3"
      />
      <circle cx="233" cy="62" r="16" fill="#ebc767" />
      <path d="m251 167 38-80 9 5-38 80-11 8Z" fill="#cc8461" stroke="#735446" strokeWidth="2" />
    </g>
  );
}

function MysteryArtwork() {
  return (
    <g>
      <rect
        x="84"
        y="34"
        width="150"
        height="132"
        rx="9"
        fill="#fbf3dc"
        stroke="#aa9471"
        strokeWidth="3"
      />
      <path d="M107 63h90m-90 22h69m-69 22h83m-83 22h54" stroke="#baaa8b" strokeWidth="5" />
      <circle
        cx="229"
        cy="91"
        r="38"
        fill="#dde8cd"
        fillOpacity=".8"
        stroke="#546b58"
        strokeWidth="8"
      />
      <path d="m257 120 38 41" stroke="#7a553d" strokeWidth="15" strokeLinecap="round" />
      <path d="m225 75 11 13-19 24" fill="none" stroke="#617f5a" strokeWidth="4" />
    </g>
  );
}

function ConquestArtwork() {
  return (
    <g>
      <path d="m56 55 84-28 33 53-35 62-76-6Z" fill="#d8c392" stroke="#93835d" strokeWidth="3" />
      <path d="m182 42 84-13 39 65-49 52-70-21Z" fill="#b7ca94" stroke="#6d8b62" strokeWidth="3" />
      <path d="m126 137 65-34 57 57-27 26-90-2Z" fill="#c2b7d1" stroke="#9685a7" strokeWidth="3" />
      <path
        d="M113 80h113m-113 0 63 73m50-73-50 73"
        stroke="#627b68"
        strokeWidth="4"
        strokeDasharray="7 5"
      />
      {[
        [113, 80],
        [226, 80],
        [176, 153],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r="21"
            fill={['#b55246', '#417a9a', '#788749'][i]}
            stroke="#fff6de"
            strokeWidth="3"
          />
          <text x={x} y={y + 7} textAnchor="middle" fontSize="23" fill="white">
            {i + 2}
          </text>
        </g>
      ))}
    </g>
  );
}
