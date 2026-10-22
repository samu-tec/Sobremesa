import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { BoardFrame, moveBoardFocus, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import type { DamasPublicState, DamasAction } from 'sobremesa-logic';
export function DamasBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<DamasPublicState, DamasAction>) {
  const [selected, setSelected] = useState<number | null>(null),
    side = s.players.findIndex((p) => p.id === myPlayerId),
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !s.isDraw && !busy;
  useEffect(() => setSelected(s.forcedFrom), [s.board, s.forcedFrom]);
  const order = Array.from({ length: 64 }, (_, i) => (side === 1 ? 63 - i : i));
  const motionRef = useBoardMotion(JSON.stringify(s.board), {
    travel: s.lastMove ? [{ from: String(s.lastMove[0]), to: String(s.lastMove[1]) }] : [],
  });
  const captures = s.legalMoves.some((m) => Math.abs((m.to % 8) - (m.from % 8)) === 2);
  return (
    <BoardFrame
      selectionActive={selected !== null && s.forcedFrom === null}
      onCancelSelection={() => setSelected(null)}
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('{0} fichas', { '0': s.board.filter((v) => v?.owner === p.id).length }),
        ]),
      )}
    >
      <p className="board-instruction" role="status">
        {s.forcedFrom !== null
          ? t('Continúa la captura con la misma ficha.')
          : captures
            ? t('Hay una captura obligatoria.')
            : t('Selecciona una ficha y una casilla marcada.')}
      </p>
      <div
        className="square-board checkers-board"
        onKeyDown={(event) => moveBoardFocus(event, 8)}
        role="group"
        aria-label={t('Tablero de Damas')}
      >
        {order.map((i) => {
          const p = s.board[i],
            legal = s.legalMoves.some((m) => m.from === selected && m.to === i),
            source = s.legalMoves.some((m) => m.from === i);
          return (
            <button
              key={i}
              data-cell={i}
              className={`${(Math.floor(i / 8) + (i % 8)) % 2 ? 'dark-square' : 'light-square'} ${selected === i ? 'selected-square' : ''} ${legal ? 'legal-square' : ''} ${s.lastMove?.includes(i) ? 'last-square' : ''}`}
              disabled={!can || (!legal && !source)}
              aria-label={t('Fila {0}, columna {1}: {2}', {
                '0': Math.floor(i / 8) + 1,
                '1': (i % 8) + 1,
                '2': p
                  ? `${room.players.find((v) => v.id === p.owner)?.name}${p.king ? ` · ${t('Dama')}` : ''}`
                  : legal
                    ? t('jugada válida')
                    : t('vacía'),
              })}
              aria-pressed={selected === i}
              onClick={() =>
                legal
                  ? onAction({ type: 'MOVE', from: selected!, to: i })
                  : setSelected(selected === i && s.forcedFrom === null ? null : i)
              }
            >
              {p ? (
                <span
                  className={`motion-piece checker checker-${s.players.findIndex((v) => v.id === p.owner)}`}
                >
                  {p.king ? '♛' : ''}
                </span>
              ) : legal ? (
                <i className="move-dot" />
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="board-caption">
        {t('Las capturas son obligatorias. La corona permite mover en ambas direcciones.')}
      </p>
    </BoardFrame>
  );
}
