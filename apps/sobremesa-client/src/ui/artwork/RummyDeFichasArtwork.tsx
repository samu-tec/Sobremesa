export function RummyDeFichasArtwork({ uid }: { uid: string }) {
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
