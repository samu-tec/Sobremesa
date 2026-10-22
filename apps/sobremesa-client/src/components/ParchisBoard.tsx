import { t, gameText } from '../i18n';
import { BoardFrame, DiceFace, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import {
  PARCHIS_GOAL,
  PARCHIS_SAFE,
  PARCHIS_STARTS,
  parchisSquare,
  type ParchisPublicState,
  type ParchisAction,
} from 'sobremesa-logic';
import '../styles/parchis.css';

const colors = ['#c3962e', '#4b7497', '#b65d4f', '#507b50'];
const names = ['Amarillo', 'Azul', 'Rojo', 'Verde'];
const track: [number, number][] = [
  ...Array.from({ length: 8 }, (_, i): [number, number] => [8, 18 - i]),
  ...Array.from({ length: 8 }, (_, i): [number, number] => [7 - i, 10]),
  [0, 9],
  ...Array.from({ length: 8 }, (_, i): [number, number] => [i, 8]),
  ...Array.from({ length: 8 }, (_, i): [number, number] => [8, 7 - i]),
  [9, 0],
  ...Array.from({ length: 8 }, (_, i): [number, number] => [10, i]),
  ...Array.from({ length: 8 }, (_, i): [number, number] => [11 + i, 8]),
  [18, 9],
  ...Array.from({ length: 8 }, (_, i): [number, number] => [18 - i, 10]),
  ...Array.from({ length: 8 }, (_, i): [number, number] => [10, 11 + i]),
  [9, 18],
];
function rotate(x: number, y: number, color: number): [number, number] {
  for (let i = 0; i < color; i++) [x, y] = [18 - y, x];
  return [x, y];
}
function location(color: number, progress: number, pawn: number): [number, number] {
  if (progress === -1) return rotate(2 + (pawn % 2) * 3, 13 + Math.floor(pawn / 2) * 3, color);
  const square = parchisSquare(color, progress);
  return square === null ? rotate(9, 81 - progress, color) : track[square];
}
function place(color: number, progress: number) {
  if (progress === -1) return t('En casa');
  if (progress === PARCHIS_GOAL) return t('En meta');
  return progress >= 64
    ? t('Pasillo {0}', { '0': progress - 63 })
    : t('Casilla {0}', { '0': parchisSquare(color, progress)! + 1 });
}
export function ParchisBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<ParchisPublicState, ParchisAction>) {
  const motionRef = useBoardMotion(s.revision, { rollDice: true, diceKey: s.rollCount });
  const own = s.players.find((p) => p.id === myPlayerId)!;
  const can =
    s.currentTurnPlayerId === myPlayerId && !s.winner && !s.isDraw && !busy && !own.withdrawn;
  const actions = (
    <>
      <div className="parchis-toolbar">
        <DiceFace value={s.lastRoll ?? 1} />
        <button
          className="button primary"
          disabled={!can || s.phase !== 'roll'}
          onClick={() => onAction({ type: 'ROLL' })}
        >
          {t('Tirar dados')}
        </button>
        {s.phase === 'move' && (
          <strong>
            {t(s.bonus ? 'Premio: {0} casillas' : 'Avance: {0} casillas', { '0': s.steps })}
          </strong>
        )}
      </div>
      <div className="parchis-pawns" role="group" aria-label={t('Tus cuatro fichas')}>
        {own.pawns.map((progress, pawn) => {
          const legal = can && s.legalPawns.includes(pawn);
          const destination = progress === -1 ? 0 : progress + s.steps;
          return (
            <button
              key={pawn}
              className="button secondary parchis-pawn-choice"
              disabled={!legal}
              onClick={() => onAction({ type: 'MOVE', pawn })}
            >
              <strong>{t('Ficha {0}', { '0': pawn + 1 })}</strong>
              <span>{place(own.color, progress)}</span>
              {legal && <span>→ {place(own.color, destination)}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('{0}/4 en meta · {1}', {
            '0': p.pawns.filter((n) => n === 71).length,
            '1': t(names[p.color]),
          }),
        ]),
      )}
      actions={actions}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>

      <svg
        className="parchis-board"
        viewBox="0 0 570 570"
        role="img"
        aria-label={t('Tablero de Parchís. Las fichas se mueven con los botones inferiores.')}
      >
        <rect width="570" height="570" rx="16" fill="#f8f3e3" />
        {colors.map((color, i) => {
          const [x, y] = rotate(3.5, 14.5, i),
            p = s.players.find((p) => p.color === i);
          return (
            <g key={color}>
              <rect
                x={(x - 3.5) * 30}
                y={(y - 3.5) * 30}
                width="240"
                height="240"
                rx="14"
                fill={color}
                opacity={p && !p.withdrawn ? '.22' : '.08'}
              />
              <text
                x={x * 30 + 15}
                y={y * 30 + 15}
                textAnchor="middle"
                fontSize="18"
                fill="#243b32"
              >
                {p
                  ? room.players.find((person) => person.id === p.id)?.name.slice(0, 16)
                  : t('Sin jugador')}
              </text>
            </g>
          );
        })}
        {track.map(([x, y], square) => {
          const start = PARCHIS_STARTS.findIndex((n) => n === square),
            safe = PARCHIS_SAFE.some((n) => n === square);
          return (
            <g key={square}>
              <rect
                x={x * 30}
                y={y * 30}
                width="30"
                height="30"
                fill={start >= 0 ? colors[start] : '#fffefa'}
                stroke="#87917b"
                strokeWidth="1"
              />
              {safe && (
                <circle
                  cx={x * 30 + 15}
                  cy={y * 30 + 15}
                  r="10"
                  fill="none"
                  stroke={start >= 0 ? '#fffefa' : '#52644d'}
                />
              )}
              <text
                x={x * 30 + 3}
                y={y * 30 + 9}
                fontSize="9"
                fill={start >= 0 ? '#fffefa' : '#243b32'}
              >
                {square + 1}
              </text>
            </g>
          );
        })}
        {colors.flatMap((color, i) =>
          Array.from({ length: 8 }, (_, n) => {
            const [x, y] = location(i, 64 + n, 0);
            return (
              <rect
                key={`${i}-${n}`}
                x={x * 30}
                y={y * 30}
                width="30"
                height="30"
                fill={color}
                opacity=".55"
                stroke="#52644d"
              />
            );
          }),
        )}
        <text x="285" y="290" textAnchor="middle" fill="#243b32" fontSize="18">
          ★
        </text>
        {s.players
          .filter((p) => !p.withdrawn)
          .flatMap((p) =>
            p.pawns.map((progress, pawn) => {
              const [x, y] = location(p.color, progress, pawn);
              const at = s.players
                .filter((other) => !other.withdrawn)
                .flatMap((other) =>
                  other.pawns.flatMap((position, index) => {
                    const [ox, oy] = location(other.color, position, index);
                    return ox === x && oy === y ? [`${other.id}-${index}`] : [];
                  }),
                );
              const slot = at.indexOf(`${p.id}-${pawn}`);
              const offset = at.length > 1 ? (slot % 2 ? 6 : -6) : 0;
              const vertical = at.length > 2 ? (slot < 2 ? -6 : 6) : 0;
              return (
                <g key={`${p.id}-${pawn}`} data-motion-id={`${p.id}-${pawn}`}>
                  <circle
                    cx={x * 30 + 15 + offset}
                    cy={y * 30 + 15 + vertical}
                    r={progress === -1 ? 15 : at.length > 2 ? 7 : 10}
                    fill={colors[p.color]}
                    stroke="#243b32"
                    strokeWidth="2"
                  />
                  <text
                    x={x * 30 + 15 + offset}
                    y={y * 30 + 19 + vertical}
                    textAnchor="middle"
                    fill="#fffefa"
                    fontSize="12"
                    fontWeight="bold"
                    stroke="#243b32"
                    strokeWidth=".5"
                    paintOrder="stroke"
                  >
                    {pawn + 1}
                  </text>
                </g>
              );
            }),
          )}
      </svg>
      <p className="board-caption">
        {t(
          'Tu color: {0}. Los círculos marcan seguros. Dos fichas del mismo color forman una barrera.',
          { '0': t(names[own.color]) },
        )}
      </p>

      <details className="parchis-positions">
        <summary>{t('Estado de todas las fichas')}</summary>
        {s.players.map((p) => (
          <p key={p.id}>
            <strong>
              {p.name || room.players.find((person) => person.id === p.id)?.name} ·{' '}
              {t(names[p.color])}
            </strong>
            :{' '}
            {p.withdrawn
              ? t('Ha abandonado')
              : p.pawns
                  .map((position, pawn) =>
                    t('Ficha {0}: {1}', { '0': pawn + 1, '1': place(p.color, position) }),
                  )
                  .join(' · ')}
          </p>
        ))}
      </details>
    </BoardFrame>
  );
}
