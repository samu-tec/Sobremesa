import {
  Bird,
  Castle,
  Dices,
  Flag,
  Hotel,
  Route,
  Skull,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { t, gameText } from '../i18n';
import { BoardFrame, DiceFace, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import { ocaSquareKind, type OcaAction, type OcaState, type OcaSquareKind } from 'sobremesa-logic';
import '../styles/oca.css';
const track: [number, number][] = [];
for (let edge = 0; edge < 4; edge++) {
  const end = 7 - edge;
  for (let x = edge; x <= end; x++) track.push([x, edge]);
  for (let y = edge + 1; y <= end; y++) track.push([end, y]);
  for (let x = end - 1; x >= edge; x--) track.push([x, end]);
  for (let y = end - 1; y > edge; y--) track.push([edge, y]);
}
const symbols: Partial<Record<OcaSquareKind, LucideIcon>> = {
  goose: Bird,
  bridge: Route,
  inn: Hotel,
  well: Waves,
  maze: Route,
  prison: Castle,
  dice: Dices,
  skull: Skull,
  goal: Flag,
  start: Flag,
};
const labels: Record<OcaSquareKind, string> = {
  ordinary: 'Camino',
  goose: 'Oca',
  bridge: 'Puente',
  inn: 'Posada',
  well: 'Pozo',
  maze: 'Laberinto',
  prison: 'Cárcel',
  dice: 'Dados',
  skull: 'Calavera',
  goal: 'Jardín',
  start: 'Salida',
};
const colors = ['#9c6428', '#466e98', '#a24842', '#4a744a', '#76518b', '#276f71'];
export function OcaBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<OcaState, OcaAction>) {
  const motionRef = useBoardMotion(s.revision, { rollDice: true, diceKey: s.rollCount });
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('Casilla {0} · espera {1}', { '0': p.position, '1': p.skippedTurns }),
        ]),
      )}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <div className="oca-toolbar">
        <DiceFace value={s.lastRoll ?? 1} />
        <button
          className="button primary"
          disabled={busy || s.currentTurnPlayerId !== myPlayerId || !!s.winner || s.isDraw}
          onClick={() => onAction({ type: 'ROLL' })}
        >
          {t('Tirar dados')}
        </button>
      </div>
      <svg
        className="oca-board"
        viewBox="0 0 640 640"
        role="img"
        aria-label={t('Recorrido de la Oca: de la salida al jardín, casilla 63.')}
      >
        <rect width="640" height="640" rx="16" fill="#fffefa" />
        {track.map(([x, y], square) => {
          const kind = ocaSquareKind(square),
            Icon = symbols[kind];
          return (
            <g key={square}>
              <rect
                x={x * 80 + 2}
                y={y * 80 + 2}
                width="76"
                height="76"
                rx="9"
                fill={
                  kind === 'goose' || kind === 'goal'
                    ? '#d8eddf'
                    : kind === 'ordinary'
                      ? '#f5f1e4'
                      : '#f0d9c4'
                }
                stroke="#9baa8c"
              />
              <text x={x * 80 + 9} y={y * 80 + 17} fontSize="13" fill="#243b32" fontWeight="bold">
                {square}
              </text>
              {Icon && (
                <Icon
                  x={x * 80 + 27}
                  y={y * 80 + 21}
                  width="29"
                  height="29"
                  color="#42654b"
                  strokeWidth="1.7"
                />
              )}
            </g>
          );
        })}
        {s.players
          .filter((p) => !p.withdrawn)
          .map((p) => {
            const seat = s.players.findIndex((person) => person.id === p.id),
              [x, y] = track[p.position];
            return (
              <g key={p.id} data-motion-id={p.id}>
                <circle
                  cx={x * 80 + 13 + (seat % 3) * 26}
                  cy={y * 80 + 57 + Math.floor(seat / 3) * 14}
                  r="9"
                  fill={colors[seat]}
                  stroke="#fffefa"
                  strokeWidth="1.5"
                />
                <text
                  x={x * 80 + 13 + (seat % 3) * 26}
                  y={y * 80 + 61 + Math.floor(seat / 3) * 14}
                  fontSize="12"
                  textAnchor="middle"
                  fill="#fffefa"
                >
                  {seat + 1}
                </text>
              </g>
            );
          })}
      </svg>
      {s.lastMove?.bounced && (
        <p className="board-caption">
          {t('Has rebotado en la meta y retrocedido las casillas sobrantes.')}
        </p>
      )}
      {s.skipped.length > 0 && (
        <p className="board-caption">
          {t('Turnos de espera cumplidos: {0}.', {
            '0': s.skipped
              .map(
                (id) =>
                  s.players.find((p) => p.id === id)?.name ||
                  room.players.find((p) => p.id === id)?.name,
              )
              .join(', '),
          })}
        </p>
      )}
      <ol className="oca-players">
        {s.players.map((p, i) => (
          <li key={p.id}>
            <strong>
              {i + 1}. {p.name || room.players.find((person) => person.id === p.id)?.name}
            </strong>
            <span>
              {p.withdrawn
                ? t('Ha abandonado')
                : t('Casilla {0}: {1}. Espera: {2}.', {
                    '0': p.position,
                    '1': t(labels[ocaSquareKind(p.position)]),
                    '2': p.skippedTurns,
                  })}
            </span>
          </li>
        ))}
      </ol>
      <details className="oca-guide">
        <summary>{t('Casillas especiales de la Oca')}</summary>
        {(
          ['goose', 'bridge', 'inn', 'well', 'maze', 'prison', 'dice', 'skull', 'goal'] as const
        ).map((kind) => (
          <p key={kind}>
            <strong>{t(labels[kind])}</strong>:{' '}
            {track.flatMap((_, i) => (ocaSquareKind(i) === kind ? [i] : [])).join(', ')}
          </p>
        ))}
        <p>{t('Consulta las reglas para ver cada salto y penalización.')}</p>
      </details>
    </BoardFrame>
  );
}
