import { useState } from 'react';
import {
  escobaCaptures,
  escobaValue,
  type EscobaAction,
  type EscobaPublicState,
} from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { SpanishCardFace, spanishCardLabel } from '../ui/SpanishCard';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/escoba.css';
export function EscobaBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<EscobaPublicState, EscobaAction>) {
  const [draft, setDraft] = useState<{ revision: number; card: number | null; take: number[] }>({
      revision: -1,
      card: null,
      take: [],
    }),
    active = draft.revision === s.revision ? draft : { revision: s.revision, card: null, take: [] },
    can =
      !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId && s.phase === 'play',
    options = active.card === null ? [] : escobaCaptures(active.card, s.table),
    sum =
      (active.card === null ? 0 : escobaValue(active.card)) +
      active.take.reduce((v, c) => v + escobaValue(c), 0),
    valid = active.card !== null && (active.take.length ? sum === 15 : !options.length),
    motionRef = useBoardMotion(s.revision),
    name = (id: string) => room.players.find((p) => p.id === id)?.name ?? id;
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('{0} puntos · {1} escobas', { '0': p.score, '1': p.sweeps }),
        ]),
      )}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p className="board-caption">
        {t('Reparto {0} · mazo: {1} · objetivo: {2}', {
          '0': s.round,
          '1': s.stockCount,
          '2': s.targetScore,
        })}
      </p>
      <h2 className="escoba-title">{t('Tu mano')}</h2>
      <div className="spanish-hand">
        {s.hand.map((card) => (
          <button
            key={card}
            disabled={!can}
            aria-label={spanishCardLabel(card)}
            aria-pressed={active.card === card}
            onClick={() => setDraft({ revision: s.revision, card, take: [] })}
          >
            <SpanishCardFace card={card} motion />
          </button>
        ))}
      </div>
      <p className="board-caption">
        {t('Sota suma 8, caballo 9 y rey 10. Selecciona tu carta y las cartas que capturas.')}
      </p>
      <p className="escoba-sum" role="status">
        {t('Suma seleccionada: {0}/15', { '0': sum })}
      </p>
      {can && options.length > 0 && (
        <label className="escoba-combo">
          {t('Captura rápida')}
          <select
            value={options.findIndex((p) => p.join(',') === active.take.join(','))}
            onChange={(e) => {
              const take = options[Number(e.target.value)];
              if (take) setDraft({ ...active, take });
            }}
          >
            <option value={-1}>{t('Seleccionar combinación')}</option>
            {options.map((take, i) => (
              <option key={i} value={i}>
                {take.map(spanishCardLabel).join(' + ')}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="board-actions">
        {s.phase === 'play' && (
          <button
            className="button primary"
            disabled={!can || !valid}
            onClick={() => {
              if (active.card !== null)
                onAction({ type: 'PLAY', card: active.card, take: active.take });
            }}
          >
            {t(active.take.length ? 'Capturar cartas' : 'Dejar carta en la mesa')}
          </button>
        )}
        {s.phase === 'round_end' && (
          <button
            className="button primary"
            disabled={busy || s.currentTurnPlayerId !== myPlayerId}
            onClick={() => onAction({ type: 'NEXT_ROUND' })}
          >
            {t('Siguiente reparto')}
          </button>
        )}
      </div>
      <section className="escoba-table" aria-label={t('Mesa de Escoba')}>
        <h2>{t('Cartas de la mesa')}</h2>
        <div>
          {s.table.map((card) => (
            <button
              key={card}
              disabled={!can || active.card === null}
              aria-label={t('{0}, valor {1}', {
                '0': spanishCardLabel(card),
                '1': escobaValue(card),
              })}
              aria-pressed={active.take.includes(card)}
              onClick={() =>
                setDraft({
                  ...active,
                  take: active.take.includes(card)
                    ? active.take.filter((c) => c !== card)
                    : [...active.take, card],
                })
              }
            >
              <SpanishCardFace card={card} motion />
            </button>
          ))}
        </div>
        {!s.table.length && <p>{t('La mesa está vacía.')}</p>}
      </section>
      {s.roundScores.length > 0 && (
        <section className="escoba-results">
          <h2>{t('Recuento del reparto')}</h2>
          {s.roundScores.map((row) => (
            <div key={row.playerId}>
              <strong>
                {name(row.playerId)}: +{row.total}
              </strong>
              <p>
                {t('Escobas {0} · cartas {1} · oros {2} · sietes {3} · siete de oros {4}', {
                  '0': row.sweeps,
                  '1': row.cards,
                  '2': row.coins,
                  '3': row.sevens,
                  '4': row.sevenCoins,
                })}
              </p>
            </div>
          ))}
        </section>
      )}
      <details className="escoba-captured">
        <summary>{t('Ver cartas ganadas')}</summary>
        {s.players.map((p) => (
          <p key={p.id}>
            <strong>{name(p.id)}:</strong>{' '}
            {p.captured.map(spanishCardLabel).join(', ') || t('Todavía no ha ganado cartas.')}
          </p>
        ))}
      </details>
    </BoardFrame>
  );
}
