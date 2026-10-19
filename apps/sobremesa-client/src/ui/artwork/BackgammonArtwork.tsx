export function BackgammonArtwork({ uid }: { uid: string }) {
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
