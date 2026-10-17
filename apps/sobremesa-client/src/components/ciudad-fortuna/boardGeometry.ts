// The CSS grid uses 2-unit corners and nine 1-unit streets per edge.
const CORNER = 2;
const SIZE = CORNER * 2 + 9;
export function tilePosition(index: number) {
  if (index <= 10) return { gridRow: 1, gridColumn: index + 1 };
  if (index <= 20) return { gridRow: index - 9, gridColumn: 11 };
  if (index <= 30) return { gridRow: 11, gridColumn: 31 - index };
  return { gridRow: 41 - index, gridColumn: 1 };
}
export function tileEdge(index: number) {
  if (index <= 10) return 'top';
  if (index < 20) return 'right';
  if (index <= 30) return 'bottom';
  return 'left';
}
function axis(cell: number) {
  return cell === 1 ? 0 : CORNER + cell - 2;
}
/** Six stable slots in an inner lane, physically separate from the property text. */
export function piecePosition(index: number, seat: number) {
  const { gridRow, gridColumn } = tilePosition(index);
  const x = axis(gridColumn),
    y = axis(gridRow);
  const corner = index % 10 === 0;
  const width = gridColumn === 1 || gridColumn === 11 ? CORNER : 1;
  const height = gridRow === 1 || gridRow === 11 ? CORNER : 1;
  const edge = tileEdge(index);
  let px: number, py: number;
  if (corner || edge === 'top' || edge === 'bottom') {
    px = x + width / 2 + ((seat % 3) - 1) * 0.28;
    py =
      edge === 'bottom'
        ? y + 0.14 + Math.floor(seat / 3) * 0.27
        : y + height - 0.42 + Math.floor(seat / 3) * 0.27;
  } else {
    px = edge === 'right' ? x + 0.14 + (seat % 2) * 0.27 : x + width - 0.42 + (seat % 2) * 0.27;
    py = y + height / 2 + (Math.floor(seat / 2) - 1) * 0.28;
  }
  return { left: `${(px / SIZE) * 100}%`, top: `${(py / SIZE) * 100}%` };
}
