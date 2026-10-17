import { t } from '../i18n';
import { useId } from 'react';
import type { GameType } from 'sobremesa-logic';
// Original SVG illustrations, kept as code: crisp at any screen density, no third-party assets.
export function GameArtwork({ game, hero = false }: { game: GameType; hero?: boolean }) {
  const uid = useId().replace(/:/g, '');
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
      {(game === 'chess' || game === 'checkers') && (
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
      )}
      {game === 'rummy' && (
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
      )}
      {game === 'impostor' && (
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
      )}
      {game === 'dominoes' && (
        <g filter={`url(#shadow${uid})`}>
          {[0, 1, 2].map((n) => (
            <g
              key={n}
              transform={`translate(${118 + n * 62} ${95 + n * 10}) rotate(${n * 15 - 12})`}
            >
              <rect
                x="-24"
                y="-56"
                width="48"
                height="112"
                rx="7"
                fill="#fff9e6"
                stroke="#b0a17e"
              />
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
      )}
      {game === 'backgammon' && (
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
      )}
      {game === 'battleship' && (
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
          <path
            d="M-75 83q20-12 40 0t40 0t40 0t40 0"
            stroke="#568aa1"
            strokeWidth="4"
            fill="none"
          />
        </g>
      )}
      {game === 'mancala' && (
        <g transform="translate(180 100) rotate(-10)" filter={`url(#shadow${uid})`}>
          <rect x="-120" y="-49" width="240" height="98" rx="45" fill="#af8c58" />
          <ellipse cx="-97" cy="0" rx="14" ry="33" fill="#846d42" />
          <ellipse cx="97" cy="0" rx="14" ry="33" fill="#72815a" />
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i}>
              <ellipse
                cx={-65 + (i % 6) * 26}
                cy={i < 6 ? -21 : 21}
                rx="11"
                ry="16"
                fill="#8b7146"
              />
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
      )}
      {game === 'combinations' && (
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
              <rect
                x="-29"
                y="-29"
                width="58"
                height="58"
                rx="12"
                fill={i ? '#64856a' : '#fff9e8'}
              />
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
      )}
      {game === 'monopoly' && (
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
      )}
      {game === 'colorclash' && (
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
      )}
      {game === 'connect4' && (
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
      )}
      {game === 'tictactoe' && (
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
      )}
      {game === 'reversi' && (
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
      )}
      {game === 'pig' && (
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
      )}
      <path
        d="M35 39h10m-5-5v10m269 112h12m-6-6v12"
        stroke={hero ? '#81b59d' : '#fff'}
        strokeWidth="2"
        opacity=".8"
      />
    </svg>
  );
}
