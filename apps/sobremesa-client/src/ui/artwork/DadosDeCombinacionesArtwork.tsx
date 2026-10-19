export function DadosDeCombinacionesArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      <g transform="translate(230 98) rotate(11)">
        <rect x="-48" y="-64" width="96" height="132" rx="5" fill="#fffaf0" />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <path d={`M-34 ${-39 + i * 12}h68`} stroke="#c2c7ab" />
            <text x="17" y={-41 + i * 12} fontSize="10" fill="#5c785b">
              {[3, 6, 9, 12, 15, 18, 25, 50][i]}
            </text>
          </g>
        ))}
      </g>
      {[
        [121, 91, -14],
        [160, 135, 12],
      ].map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
          <rect x="-29" y="-29" width="58" height="58" rx="12" fill={i ? '#64856a' : '#fff9e8'} />
          {[-1, 1].flatMap((a) =>
            [-1, 1].map((b) => (
              <circle
                key={`${a}${b}`}
                cx={a * 13}
                cy={b * 13}
                r="4"
                fill={i ? '#fff9e8' : '#9d7d46'}
              />
            )),
          )}
          {!i && <circle r="4" fill="#9d7d46" />}
        </g>
      ))}
    </g>
  );
}
