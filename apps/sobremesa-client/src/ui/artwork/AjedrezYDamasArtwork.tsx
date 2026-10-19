export function AjedrezYDamasArtwork({ uid, game }: { uid: string; game: 'chess' | 'checkers' }) {
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
