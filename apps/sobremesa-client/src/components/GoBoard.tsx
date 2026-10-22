import { useRef, useState, type CSSProperties } from 'react';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import type { GoAction, GoPublicState } from 'sobremesa-logic';
import { Modal } from '../ui/Modal';
import '../styles/go.css';
const columns = 'ABCDEFGHJKLMNOPQRST';
export function GoBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<GoPublicState, GoAction>) {
  const [resigning, setResigning] = useState(false);
  const [selected, setSelected] = useState(0),
    grid = useRef<HTMLDivElement>(null);
  const motionRef = useBoardMotion(s.revision),
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId;
  const coordinate = (i: number) => `${columns[i % s.size]}${s.size - Math.floor(i / s.size)}`;
  const act = (i: number) => {
    setSelected(i);
    if (!can) return;
    if (s.phase === 'play' && s.legalMoves.includes(i)) onAction({ type: 'PLACE', index: i });
    else if (s.phase === 'score' && s.board[i]) onAction({ type: 'MARK_DEAD', index: i });
  };
  const actions = (
    <>
      <div className="board-actions">
        {s.phase === 'play' && (
          <button
            className="button secondary"
            disabled={!can}
            onClick={() => onAction({ type: 'PASS' })}
          >
            {t('Pasar')}
          </button>
        )}
        {s.phase === 'score' && (
          <>
            <button
              className="button primary"
              disabled={!can}
              onClick={() => onAction({ type: 'ACCEPT_SCORE' })}
            >
              {t('Aceptar puntuación')}
            </button>
            <button
              className="button secondary"
              disabled={!can}
              onClick={() => onAction({ type: 'RESUME' })}
            >
              {t('Reanudar el juego')}
            </button>
          </>
        )}
        {!s.winner && (
          <button className="button secondary" disabled={busy} onClick={() => setResigning(true)}>
            {t('Rendirse')}
          </button>
        )}
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
        s.players.map((p, i) => [
          p.id,
          t(i === 0 ? 'Negras · capturas: {0}' : 'Blancas · capturas: {0}', { '0': s.captured[i] }),
        ]),
      )}
      actions={actions}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p className="board-caption">
        {t('Usa las flechas para explorar el tablero y Enter para colocar o marcar una piedra.')}
      </p>
      <div className="go-scroll">
        <div
          className="go-board"
          ref={grid}
          role="group"
          aria-label={t('Tablero de Go')}
          style={{ '--go-size': s.size } as CSSProperties}
        >
          {s.board.map((stone, i) => {
            const legal =
              can &&
              (s.phase === 'play' ? s.legalMoves.includes(i) : s.phase === 'score' && stone !== 0);
            return (
              <button
                key={i}
                data-index={i}
                tabIndex={selected === i ? 0 : -1}
                aria-disabled={!legal}
                aria-label={t('{0}: {1}{2}', {
                  '0': coordinate(i),
                  '1': t(
                    stone === 1
                      ? 'Piedra negra'
                      : stone === 2
                        ? 'Piedra blanca'
                        : 'Intersección vacía',
                  ),
                  '2': s.dead.includes(i) ? t(', marcada como muerta') : '',
                })}
                className={s.lastMove === i ? 'go-last' : ''}
                onClick={() => act(i)}
                onKeyDown={(event) => {
                  const row = Math.floor(i / s.size),
                    col = i % s.size;
                  const next =
                    event.key === 'ArrowLeft' && col > 0
                      ? i - 1
                      : event.key === 'ArrowRight' && col < s.size - 1
                        ? i + 1
                        : event.key === 'ArrowUp' && row > 0
                          ? i - s.size
                          : event.key === 'ArrowDown' && row < s.size - 1
                            ? i + s.size
                            : i;
                  if (event.key.startsWith('Arrow')) {
                    event.preventDefault();
                    setSelected(next);
                    grid.current
                      ?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)
                      ?.focus();
                  }
                }}
              >
                {stone !== 0 && (
                  <span
                    className={`go-stone ${stone === 1 ? 'black' : 'white'}`}
                    data-motion-id={`${i}-${stone}`}
                  >
                    {s.dead.includes(i) && <span className="go-dead">×</span>}
                  </span>
                )}
                {selected === i && stone === 0 && <span className="go-cursor" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="board-caption">
        {t('Selección: {0}. Komi de blancas: 7,5.', { '0': coordinate(selected) })}
      </p>
      {can && s.phase === 'play' && !s.legalMoves.includes(selected) && (
        <p className="board-caption">
          {t('No puedes colocar aquí: casilla ocupada, suicidio o repetición de posición.')}
        </p>
      )}

      {resigning && (
        <Modal title={t('¿Rendirse en Go?')} onClose={() => setResigning(false)}>
          <p>{t('El rival ganará la partida. Puedes seguir en la sala para la revancha.')}</p>
          <button
            className="button danger"
            disabled={busy}
            onClick={() => {
              onAction({ type: 'RESIGN' });
              setResigning(false);
            }}
          >
            {t('Confirmar rendición')}
          </button>
        </Modal>
      )}
      {s.score && (
        <div className="go-score" role="status">
          <strong>
            {t('Negras: {0} · Blancas: {1}', { '0': s.score.black, '1': s.score.white })}
          </strong>
          <p>
            {t(
              s.phase === 'finished'
                ? 'Puntuación definitiva acordada por ambos jugadores.'
                : 'La propuesta solo termina la partida cuando ambos la confirman.',
            )}
          </p>
        </div>
      )}
    </BoardFrame>
  );
}
