import { useState } from 'react';
import {
  pokerRank,
  pokerSuit,
  pokerEvaluate,
  pokerCategory,
  type PokerAction,
  type PokerPublicState,
} from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/poker.css';
const suits = ['♣', '♦', '♥', '♠'];
function cardName(card: number) {
  const rank = pokerRank(card),
    suit = [t('Tréboles'), t('Diamantes'), t('Corazones'), t('Picas')][pokerSuit(card)];
  return t('{0} de {1}', {
    '0':
      rank === 14
        ? t('As')
        : rank === 13
          ? t('Rey')
          : rank === 12
            ? t('Dama')
            : rank === 11
              ? t('Jota')
              : rank,
    '1': suit,
  });
}
function Card({ card, motion = false }: { card: number | null; motion?: boolean }) {
  return (
    <span
      className={`poker-card ${card === null ? 'back' : `suit-${pokerSuit(card)}`}`}
      role="img"
      aria-label={card === null ? t('Carta boca abajo') : cardName(card)}
      data-motion-id={motion && card !== null ? `poker-${card}` : undefined}
    >
      {card === null ? (
        <span aria-hidden="true">◆</span>
      ) : (
        <>
          <b aria-hidden="true">
            {({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[pokerRank(card)] ??
              pokerRank(card)}
          </b>
          <span aria-hidden="true">{suits[pokerSuit(card)]}</span>
        </>
      )}
    </span>
  );
}
const categoryName = (score: number) =>
  [
    t('Carta alta'),
    t('Pareja'),
    t('Doble pareja'),
    t('Trío'),
    t('Escalera de póker'),
    t('Color de póker'),
    t('Full'),
    t('Póker'),
    t('Escalera de color'),
  ][pokerCategory(score)];
export function PokerBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<PokerPublicState, PokerAction>) {
  const [draft, setDraft] = useState<{ revision: number; to: number } | null>(null),
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    playing = can && s.phase !== 'hand_end' && s.phase !== 'finished',
    to = draft?.revision === s.revision ? draft.to : Math.min(s.maxRaiseTo, s.minRaiseTo),
    valid =
      Number.isSafeInteger(to) &&
      to > s.currentBet &&
      to <= s.maxRaiseTo &&
      (to >= s.minRaiseTo || to === s.maxRaiseTo),
    name = (id: string) => room.players.find((p) => p.id === id)?.name ?? id,
    motionRef = useBoardMotion(s.revision);
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [p.id, t('{0} fichas de póker', { '0': p.score })]),
      )}
    >
      <p className="board-caption">{t('Solo fichas ficticias, sin valor económico.')}</p>
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p>
        {t('Mano {0} · ciegas {1}/{2}', {
          '0': s.handNumber,
          '1': s.bigBlind / 2,
          '2': s.bigBlind,
        })}
      </p>
      <h2>{t('Tus cartas privadas')}</h2>
      <div className="poker-hand">
        {s.hand.map((card) => (
          <Card key={card} card={card} motion />
        ))}
      </div>
      {s.hand.length === 2 && s.board.length >= 3 && (
        <p>{categoryName(pokerEvaluate([...s.hand, ...s.board]))}</p>
      )}
      {s.phase === 'hand_end' ? (
        <button
          className="button primary"
          disabled={!can}
          onClick={() => onAction({ type: 'NEXT_HAND' })}
        >
          {t('Siguiente mano')}
        </button>
      ) : (
        s.phase !== 'finished' && (
          <>
            <div className="board-actions">
              <button
                className="button secondary"
                disabled={!playing}
                onClick={() => onAction({ type: 'FOLD' })}
              >
                {t('Retirarse')}
              </button>
              <button
                className="button primary"
                disabled={!playing}
                onClick={() => onAction({ type: s.callAmount ? 'CALL' : 'CHECK' })}
              >
                {s.callAmount ? t('Igualar {0}', { '0': s.callAmount }) : t('Pasar')}
              </button>
            </div>
            <div className="poker-bet">
              <label>
                {t('Apuesta total en esta calle')}
                <input
                  type="number"
                  inputMode="numeric"
                  min={Math.min(s.minRaiseTo, s.maxRaiseTo)}
                  max={s.maxRaiseTo}
                  step={1}
                  value={to}
                  disabled={!playing || !s.canRaise}
                  onChange={(e) => setDraft({ revision: s.revision, to: Number(e.target.value) })}
                />
              </label>
              <button
                className="button primary"
                disabled={!playing || !s.canRaise || !valid}
                onClick={() => onAction({ type: 'RAISE', to })}
              >
                {t('Apostar o subir')}
              </button>
              <button
                className="button secondary"
                disabled={!playing || !s.canRaise}
                onClick={() => setDraft({ revision: s.revision, to: s.maxRaiseTo })}
              >
                {t('Preparar all-in')}
              </button>
            </div>
          </>
        )
      )}
      <section className="poker-table" aria-label={t('Mesa de póker')}>
        <h2>{t('Bote: {0}', { '0': s.pot })}</h2>
        <div className="poker-community">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              {i < s.board.length ? (
                <Card card={s.board[i]} motion />
              ) : (
                <span className="poker-empty" aria-label={t('Comunitaria pendiente')}>
                  ·
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="poker-seats">
          {s.players.map((p, i) => (
            <section key={p.id} className={p.folded ? 'folded' : ''}>
              <h3>
                {name(p.id)} {i === s.dealer ? '●' : ''}
              </h3>
              <p>
                {i === s.dealer
                  ? t('Botón del repartidor')
                  : p.id === s.smallBlindId
                    ? t('Ciega pequeña')
                    : p.id === s.bigBlindId
                      ? t('Ciega grande')
                      : t('Participante')}
              </p>
              <p>
                {p.left
                  ? t('Ha abandonado')
                  : p.folded
                    ? t('Retirado de la mano')
                    : p.score === 0
                      ? t('All-in')
                      : t('Apuesta: {0}', { '0': p.bet })}
              </p>
              {p.hand !== null && p.id !== myPlayerId && (
                <div className="poker-hand">
                  {p.hand.map((c) => (
                    <Card key={c} card={c} />
                  ))}
                </div>
              )}
              {p.hand !== null && p.hand.length === 2 && !p.folded && s.board.length === 5 && (
                <p>{categoryName(pokerEvaluate([...p.hand, ...s.board]))}</p>
              )}
            </section>
          ))}
        </div>
      </section>
      {s.pots.length > 0 && (
        <section>
          <h2>{t('Reparto de botes')}</h2>
          {s.pots.map((pot, i) => (
            <p key={i}>
              {t('Bote {0}: {1} fichas → {2}', {
                '0': i + 1,
                '1': pot.amount,
                '2': pot.winnerIds.map(name).join(', '),
              })}
              {pot.returned ? ` · ${t('Importe devuelto')}` : ''}
            </p>
          ))}
        </section>
      )}
    </BoardFrame>
  );
}
