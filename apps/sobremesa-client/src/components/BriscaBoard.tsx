import { useState } from 'react';
import type { BriscaAction, BriscaPublicState } from 'sobremesa-logic';
import { SPANISH_SUITS } from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { SpanishCardFace, spanishCardLabel, spanishSuitName } from '../ui/SpanishCard';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/brisca.css';
export function BriscaBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<BriscaPublicState, BriscaAction>) {
  const [selection, setSelection] = useState<{ revision: number; card: number | null }>({
      revision: -1,
      card: null,
    }),
    selected = selection.revision === s.revision ? selection.card : null,
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    motionRef = useBoardMotion(s.revision),
    name = (id: string) => room.players.find((p) => p.id === id)?.name ?? id,
    shown = s.trick.length ? s.trick : s.lastTrick;
  const actions = (
    <>
      <div className="board-actions">
        {s.phase === 'play' && (
          <button
            className="button primary"
            disabled={!can || selected === null}
            onClick={() => {
              if (selected !== null) onAction({ type: 'PLAY', card: selected });
            }}
          >
            {t('Jugar carta')}
          </button>
        )}
        {s.phase === 'collect' && (
          <>
            <button
              className="button primary"
              disabled={!can}
              onClick={() => onAction({ type: 'COLLECT' })}
            >
              {t('Recoger y robar')}
            </button>
            {s.exchangeCard !== null && (
              <button
                className="button secondary"
                disabled={!can}
                onClick={() => {
                  if (s.exchangeCard !== null) onAction({ type: 'EXCHANGE', card: s.exchangeCard });
                }}
              >
                {t('Cambiar {0} por {1}', {
                  '0': spanishCardLabel(s.exchangeCard),
                  '1': spanishCardLabel(s.trumpCard!),
                })}
              </button>
            )}
          </>
        )}
        {s.phase === 'round_end' && (
          <button
            className="button primary"
            disabled={!can}
            onClick={() => onAction({ type: 'NEXT_ROUND' })}
          >
            {t('Siguiente reparto')}
          </button>
        )}
      </div>
    </>
  );
  return (
    <BoardFrame
      selectionActive={selected !== null}
      onCancelSelection={() => setSelection({ revision: s.revision, card: null })}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('Bando {0} · {1} puntos', { '0': p.team + 1, '1': p.score }),
        ]),
      )}
      sidebarDetails={{
        label: t('Ver cartas ganadas'),
        title: t('Cartas ganadas'),
        content: (
          <section className="brisca-captured">
            {s.players.map((p) => (
              <div key={p.id}>
                <strong>{name(p.id)}</strong>
                <p>
                  {p.captured.length
                    ? p.captured.map(spanishCardLabel).join(', ')
                    : t('Todavía no ha ganado cartas.')}
                </p>
              </div>
            ))}
          </section>
        ),
      }}
      actions={actions}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <div className="brisca-teams">
        {[0, 1].map((team) => (
          <section key={team}>
            <strong>{t('Bando {0}', { '0': team + 1 })}</strong>
            <p>
              {s.players
                .filter((p) => p.team === team)
                .map((p) => name(p.id))
                .join(' + ')}
            </p>
            <b>
              {t('{0} puntos · {1}/{2} victorias', {
                '0': s.players.filter((p) => p.team === team).reduce((sum, p) => sum + p.score, 0),
                '1': s.wins[team],
                '2': s.targetWins,
              })}
            </b>
          </section>
        ))}
      </div>
      <p className="board-caption">
        {t('Reparto {0} · triunfo: {1} · mazo: {2}', {
          '0': s.round,
          '1': spanishSuitName(SPANISH_SUITS.indexOf(s.trumpSuit)),
          '2': s.stockCount,
        })}
      </p>
      <h2 className="brisca-hand-title">{t('Tu mano')}</h2>
      <div className="spanish-hand" aria-label={t('Tu mano de Brisca')}>
        {s.hand.map((card) => (
          <button
            key={card}
            disabled={!can || s.phase !== 'play'}
            aria-pressed={selected === card}
            aria-label={spanishCardLabel(card)}
            onClick={() =>
              setSelection({ revision: s.revision, card: selected === card ? null : card })
            }
          >
            <SpanishCardFace card={card} motion />
          </button>
        ))}
      </div>
      {selected !== null && (
        <p role="status">{t('Carta seleccionada: {0}', { '0': spanishCardLabel(selected) })}</p>
      )}

      <div className="brisca-table">
        <div className="brisca-stock">
          <div>
            <SpanishCardFace card={null} />
            <strong>{t('Mazo: {0} cartas', { '0': s.stockCount })}</strong>
          </div>
          <div>
            {s.trumpCard !== null ? (
              <SpanishCardFace card={s.trumpCard} motion />
            ) : (
              <span className="brisca-empty" aria-hidden="true">
                —
              </span>
            )}
            <strong>
              {t('Triunfo: {0}', { '0': spanishSuitName(SPANISH_SUITS.indexOf(s.trumpSuit)) })}
            </strong>
          </div>
        </div>
        <h2>{t(s.trick.length ? 'Baza en juego' : 'Última baza')}</h2>
        {!shown.length ? (
          <p>{t('La primera carta marca el palo de salida.')}</p>
        ) : (
          <div className="brisca-trick">
            {shown.map((play) => (
              <div key={play.playerId}>
                <span>{name(play.playerId)}</span>
                <SpanishCardFace card={play.card} motion />
              </div>
            ))}
          </div>
        )}
        {!s.trick.length && s.lastTrickWinner && (
          <p>{t('Recoge la baza: {0}', { '0': name(s.lastTrickWinner) })}</p>
        )}
      </div>
    </BoardFrame>
  );
}
