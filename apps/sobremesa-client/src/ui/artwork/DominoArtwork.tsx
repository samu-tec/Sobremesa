export function DominoArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      {[0, 1, 2].map((n) => (
        <g key={n} transform={`translate(${118 + n * 62} ${95 + n * 10}) rotate(${n * 15 - 12})`}>
          <rect x="-24" y="-56" width="48" height="112" rx="7" fill="#fff9e6" stroke="#b0a17e" />
          <path d="M-17 0H17" stroke="#a79b7c" />
          {[-1, 1].map((half) => (
            <g key={half}>
              {Array.from({ length: n + 2 }, (_, i) => (
                <circle
                  key={i}
                  cx={(i % 2 ? 1 : -1) * 10}
                  cy={half * 27 + (Math.floor(i / 2) * 10 - 5)}
                  r="4"
                  fill="#354c3c"
                />
              ))}
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}
