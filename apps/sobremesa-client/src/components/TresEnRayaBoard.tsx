import { useBoardMotion } from '../hooks/useBoardMotion';
import { getGame, t } from '../i18n';
import type { TresEnRayaState, TresEnRayaAction } from 'sobremesa-logic';
import { GameTip, PlayersPanel, type BoardProps } from '../ui/GameLayout';
import { Circle, X } from 'lucide-react';
export function TresEnRayaBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<TresEnRayaState, TresEnRayaAction>) {
  const game = getGame(room.gameType);
  const turn = s.currentTurn;
  const canPlay = turn === myPlayerId && !s.winner && !s.isDraw && !busy;
  const motionRef = useBoardMotion(JSON.stringify(s.board));
  const values = Object.fromEntries(s.players.map((p) => [p.id, p.symbol]));
  return (
    <div className="table-layout animated-table" ref={motionRef}>
      <section className={`panel play-area play-${room.gameType}`}>
        <>
          <p className="board-instruction">{t('Tres símbolos. Una línea. Tu próxima jugada.')}</p>
          <div className="ttt-board" role="group" aria-label={t('Tablero de Tres en Raya')}>
            {s.board.map((cell, index) => (
              <button
                key={index}
                disabled={!canPlay || !!cell}
                className={`${cell === 'X' ? 'cell-x' : 'cell-o'} ${s.winningLine?.includes(index) ? 'winning-cell' : ''}`}
                aria-label={t('Fila {0}, columna {1}: {2}', {
                  '0': Math.floor(index / 3) + 1,
                  '1': (index % 3) + 1,
                  '2': cell || t('vacía'),
                })}
                onClick={() => onAction({ type: 'MAKE_MOVE', index })}
              >
                {cell === 'X' ? (
                  <span data-motion-id={`mark-${index}`}>
                    <X size={54} />
                  </span>
                ) : cell === 'O' ? (
                  <span data-motion-id={`mark-${index}`}>
                    <Circle size={45} />
                  </span>
                ) : (
                  <span className="empty-cell-dot" />
                )}
              </button>
            ))}
          </div>
          <p className="board-caption">
            {canPlay
              ? t('Elige una casilla libre.')
              : t('La siguiente jugada está en manos de tu rival.')}
          </p>
        </>
      </section>
      <aside className="table-sidebar">
        <PlayersPanel room={room} myPlayerId={myPlayerId} currentTurn={turn} values={values} />
        <GameTip text={game.tip} />
        <div className="game-mini-rules">
          <span className="eyebrow">{t('EL OBJETIVO')}</span>
          <p>{t('Completa una fila, columna o diagonal.')}</p>
        </div>
      </aside>
    </div>
  );
}
