export function CuatroEnLineaArtwork({ uid }: { uid: string }) {
  return (
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
  );
}
