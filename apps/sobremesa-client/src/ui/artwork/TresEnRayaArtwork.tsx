export function TresEnRayaArtwork({ uid }: { uid: string }) {
  return (
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
  );
}
