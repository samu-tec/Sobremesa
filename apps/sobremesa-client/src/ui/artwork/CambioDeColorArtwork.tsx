export function CambioDeColorArtwork({ uid }: { uid: string }) {
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
