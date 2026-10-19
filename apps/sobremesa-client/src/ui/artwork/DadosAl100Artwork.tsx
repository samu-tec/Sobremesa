export function DadosAl100Artwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      <g transform="translate(137 105) rotate(-18)">
        <rect x="-39" y="-39" width="78" height="78" rx="17" fill="#fff9f0" />
        {[
          [-18, -18],
          [18, 18],
          [0, 0],
          [-18, 18],
          [18, -18],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill="#8871ac" />
        ))}
      </g>
      <g transform="translate(223 90) rotate(16)">
        <rect x="-35" y="-35" width="70" height="70" rx="15" fill="#aa8ac9" />
        <circle cx="-15" cy="-15" r="5" fill="#fff9f0" />
        <circle cx="15" cy="15" r="5" fill="#fff9f0" />
      </g>
      <text
        x="229"
        y="164"
        fontSize="28"
        fontFamily="Georgia,serif"
        fill="#6d548c"
        fontStyle="italic"
      >
        100
      </text>
    </g>
  );
}
