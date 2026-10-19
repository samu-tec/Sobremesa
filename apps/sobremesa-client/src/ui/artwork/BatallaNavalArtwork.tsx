export function BatallaNavalArtwork({ uid }: { uid: string }) {
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
