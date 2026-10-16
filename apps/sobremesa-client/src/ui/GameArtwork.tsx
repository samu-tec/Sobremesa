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
