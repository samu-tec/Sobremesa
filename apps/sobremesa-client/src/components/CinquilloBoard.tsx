import { useState } from 'react';
import {
  SPANISH_RANKS,
  SPANISH_SUITS,
  type CinquilloAction,
  type CinquilloPublicState,
} from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { SpanishCardFace, spanishCardLabel, spanishSuitName } from '../ui/SpanishCard';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/cinquillo.css';
export function CinquilloBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<CinquilloPublicState, CinquilloAction>) {
  const [draft, setDraft] = useState<{ revision: number; card: number } | null>(null),
    selected = draft?.revision === s.revision ? draft.card : null,
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    motionRef = useBoardMotion(s.revision);
  const actions = (
    <>
      <div className="board-actions">
        <button
          className="button primary"
          disabled={!can || selected === null || !s.legalCards.includes(selected)}
          onClick={() => {
            if (selected !== null) onAction({ type: 'PLAY', card: selected });
          }}
        >
          {t('Colocar carta')}
        </button>
        <button
          className="button secondary"
          disabled={!can || s.legalCards.length > 0}
          onClick={() => onAction({ type: 'PASS' })}
        >
          {t('Pasar')}
        </button>
      </div>
    </>
  );
  return (
    <BoardFrame
      selectionActive={selected !== null}
      onCancelSelection={() => setDraft(null)}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [p.id, t('{0} cartas', { '0': p.handCount })]),
      )}
      actions={actions}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <h2>{t('Tu mano')}</h2>
      <div className="spanish-hand">
        {s.hand.map((card) => (
          <button
            key={card}
            disabled={!can || !s.legalCards.includes(card)}
            aria-label={spanishCardLabel(card)}
            aria-pressed={selected === card}
            onClick={() => setDraft(selected === card ? null : { revision: s.revision, card })}
          >
            <SpanishCardFace card={card} motion />
          </button>
        ))}
      </div>

      <p className="board-caption">
        {t('Debes colocar una carta si puedes. El siete continúa con la sota.')}
      </p>
      <section className="cinquillo-table" aria-label={t('Secuencias de Cinquillo')} tabIndex={0}>
        {SPANISH_SUITS.map((suit, i) => (
          <div className="cinquillo-lane" key={suit}>
            <h3>{spanishSuitName(i)}</h3>
            <div>
              {SPANISH_RANKS.map((rank, j) => {
                const lane = s.lanes[i],
                  placed = lane !== null && j >= lane[0] && j <= lane[1];
                return (
                  <div className={`cinquillo-slot ${j === 4 ? 'five' : ''}`} key={rank}>
                    {placed ? (
                      <SpanishCardFace card={i * 10 + j} motion />
                    ) : (
                      <span aria-label={t('Casilla vacía: {0}', { '0': rank })}>{rank}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </BoardFrame>
  );
}
