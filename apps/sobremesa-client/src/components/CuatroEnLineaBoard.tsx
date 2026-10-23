import { useBoardMotion } from '../hooks/useBoardMotion';
import { t } from '../i18n';
import type { CuatroEnLineaState, CuatroEnLineaAction } from 'sobremesa-logic';
import { PlayersPanel, moveBoardFocus, type BoardProps } from '../ui/GameLayout';
import { ArrowDown } from 'lucide-react';
export function CuatroEnLineaBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<CuatroEnLineaState, CuatroEnLineaAction>) {
  const turn = s.currentTurnPlayerId;
  const canPlay = turn === myPlayerId && !s.winner && !s.isDraw && !busy;
  const last = s.lastMove;
  const motionRef = useBoardMotion(JSON.stringify(s.board), {
    travel: last !== null ? [{ from: String(last % 7), to: String(last) }] : [],
  });
  const values = Object.fromEntries(
    s.players.map((p, i) => [p.id, i === 0 ? t('Coral') : t('Mostaza')]),
  );
  return (
    <div className="table-layout animated-table" ref={motionRef}>
      <section className={`panel play-area play-${room.gameType}`}>
        <>
          <p className="board-instruction">{t('Una ficha puede cambiarlo todo.')}</p>
          <div className="connect-board-wrap">
            <div
              className="column-controls"
              role="group"
              onKeyDown={(event) => moveBoardFocus(event, 7)}
            >
              {Array.from({ length: 7 }, (_, column) => (
                <button
                  key={column}
                  disabled={!canPlay || !!s.board[column]}
                  onClick={() => onAction({ type: 'DROP', column })}
                  aria-label={t('Dejar caer ficha en columna {0}', { '0': column + 1 })}
                >
                  <ArrowDown size={23} />
                </button>
              ))}
            </div>
            <div
              className="connect-board"
              role="group"
              aria-label={t('Tablero de Cuatro en Línea')}
            >
              {s.board.map((id, index) => (
                <div
                  key={index}
                  role="img"
                  data-cell={index}
                  aria-label={t('Fila {0}, columna {1}: {2}', {
                    '0': Math.floor(index / 7) + 1,
                    '1': (index % 7) + 1,
                    '2': id
                      ? t('ficha de {0}', {
                          '0': room.players.find((p) => p.id === id)?.name,
                        })
                      : t('vacía'),
                  })}
                  className={`connect-hole ${id ? `disc-${s.players.findIndex((p) => p.id === id)}` : ''} ${s.winningLine.includes(index) ? 'winning-disc' : ''} ${s.lastMove === index ? 'last-disc' : ''}`}
                >
                  <span className="motion-piece" />
                </div>
              ))}
            </div>
          </div>
          <p className="board-caption">{t('Pulsa una flecha para dejar caer tu ficha.')}</p>
        </>
      </section>
      <aside className="table-sidebar" aria-label={t('Jugadores')} tabIndex={0}>
        <PlayersPanel room={room} myPlayerId={myPlayerId} currentTurn={turn} values={values} />
      </aside>
    </div>
  );
}
