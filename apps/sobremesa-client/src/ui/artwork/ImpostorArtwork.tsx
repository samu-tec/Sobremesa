export function ImpostorArtwork({ uid }: { uid: string }) {
  return (
    <g filter={`url(#shadow${uid})`}>
      <path d="M103 53Q180 20 257 53L246 109Q180 164 114 109Z" fill="#67537c" />
      <path
        d="M122 72Q145 54 163 79Q143 99 122 79ZM196 79Q215 54 239 72L239 79Q215 99 196 79Z"
        fill="#fff4dd"
      />
      <path
        d="M164 120Q180 131 196 120"
        fill="none"
        stroke="#c8acd8"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect
        x="140"
        y="139"
        width="83"
        height="39"
        rx="10"
        fill="#fff5df"
        transform="rotate(-8 180 158)"
      />
      <text x="180" y="167" textAnchor="middle" fontSize="29" fill="#7c5d90" fontWeight="700">
        ?
      </text>
      <circle cx="87" cy="123" r="9" fill="#f4deb0" />
      <circle cx="271" cy="134" r="7" fill="#f4deb0" />
    </g>
  );
}
