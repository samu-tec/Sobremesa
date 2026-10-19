import { t } from '../../i18n';

export function CiudadFortunaArtwork({ uid }: { uid: string }) {
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
