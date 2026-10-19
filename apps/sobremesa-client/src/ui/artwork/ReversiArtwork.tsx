export function ReversiArtwork({ uid }: { uid: string }) {
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
