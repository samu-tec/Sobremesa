import { useBoardMotion } from '../hooks/useBoardMotion';
import { getGame, t, gameText } from '../i18n';
import type { ReversiState, ReversiAction } from 'sobremesa-logic';
import { GameTip, PlayersPanel, type BoardProps } from '../ui/GameLayout';
import { useRef } from 'react';
export function ReversiBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<ReversiState, ReversiAction>) {
  const game = getGame(room.gameType);
  const turn = s.currentTurnPlayerId;
  const canPlay = turn === myPlayerId && !s.winner && !s.isDraw && !busy;
  const previousBoard = useRef<(string | null)[]>([]);
  const flipCells = s.board.flatMap((id, i) =>
    id && previousBoard.current[i] && id !== previousBoard.current[i] ? [String(i)] : [],
  );
  const motionRef = useBoardMotion(JSON.stringify(s.board), { flipCells });
  previousBoard.current = [...s.board];
  const values = Object.fromEntries(
    s.players.map((p) => [
      p.id,
      t('{0} fichas', { '0': s.board.filter((v) => v === p.id).length }),
    ]),
  );
  return (
    <div className="table-layout animated-table" ref={motionRef}>
      <section className={`panel play-area play-${room.gameType}`}>
        <>
          <p className="board-instruction" aria-live="polite">
            {gameText(s.message)}
          </p>
          <div className="reversi-board" role="group" aria-label={t('Tablero de Reversi')}>
            {s.board.map((id, index) => (
              <button
                key={index}
                data-cell={index}
                disabled={!canPlay || !s.legalMoves.includes(index)}
                aria-label={t('Fila {0}, columna {1}: {2}', {
                  '0': Math.floor(index / 8) + 1,
                  '1': (index % 8) + 1,
                  '2': id
                    ? s.players[0].id === id
                      ? t('oscura')
                      : t('clara')
                    : s.legalMoves.includes(index)
                      ? t('jugada válida')
                      : t('vacía'),
                })}
                className={`${id ? `reversi-disc-${s.players.findIndex((p) => p.id === id)}` : ''} ${s.lastMove === index ? 'last-move' : ''}`}
                onClick={() => onAction({ type: 'PLACE', index })}
              >
                {id ? (
                  <span className="motion-piece" />
                ) : canPlay && s.legalMoves.includes(index) ? (
                  <i />
                ) : null}
              </button>
            ))}
          </div>
          <p className="board-caption">{t('Los puntos señalan dónde puedes colocar una ficha.')}</p>
        </>
      </section>
      <aside className="table-sidebar">
        <PlayersPanel room={room} myPlayerId={myPlayerId} currentTurn={turn} values={values} />
        <GameTip text={game.tip} />
        <div className="game-mini-rules">
          <span className="eyebrow">{t('EL OBJETIVO')}</span>
          <p>{t('Termina con más fichas de tu color.')}</p>
        </div>
      </aside>
    </div>
  );
}
