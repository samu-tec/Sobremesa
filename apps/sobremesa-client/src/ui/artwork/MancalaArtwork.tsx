export function MancalaArtwork({ uid }: { uid: string }) {
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
