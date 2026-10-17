import type { CSSProperties } from 'react';
import { Cat, Rocket, Leaf, Crown, Sailboat, Gem } from 'lucide-react';
export const PLAYER_COLORS = ['#ad452b', '#315e9c', '#37713b', '#80519b', '#92690e', '#167572'];
const PIECES = [Cat, Rocket, Leaf, Crown, Sailboat, Gem];
export function PlayerPiece({ index, active = false }: { index: number; active?: boolean }) {
  const Icon = PIECES[index % PIECES.length];
  return (
    <span
      className={`player-piece ${active ? 'piece-active' : ''}`}
      style={{ '--piece-color': PLAYER_COLORS[index % PLAYER_COLORS.length] } as CSSProperties}
    >
      <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}
