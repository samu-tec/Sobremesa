import { useState } from 'react';
import type { MusAction, MusPublicState, MusLance } from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { SpanishCardFace, spanishCardLabel } from '../ui/SpanishCard';
import { Modal } from '../ui/Modal';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/mus.css';
const lanceName = (lance: MusLance) =>
  ({
    grande: t('Grande'),
    chica: t('Chica'),
    pares: t('Pares'),
    juego: t('Juego'),
    punto: t('Punto'),
  })[lance];
export function MusBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<MusPublicState, MusAction>) {
  const [draft, setDraft] = useState<{ revision: number; cards: number[] }>({
      revision: -1,
      cards: [],
    }),
    selected = draft.revision === s.revision ? draft.cards : [],
    [amount, setAmount] = useState(2),
    [ordago, setOrdago] = useState<number | null>(null),
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    motionRef = useBoardMotion(s.revision),
    name = (id: string) => room.players.find((p) => p.id === id)?.name ?? id,
    minimum = s.bet && s.bet.offer !== 'ordago' ? s.bet.offer + 1 : 2,
    bid = Math.max(minimum, amount);
  const actions = (
    <>
      {s.phase === 'mus' && (
        <div className="board-actions">
          <button
            className="button secondary"
            disabled={!can}
            onClick={() => onAction({ type: 'MUS' })}
          >
            {t('Mus: quiero descartar')}
          </button>
          <button
            className="button primary"
            disabled={!can}
            onClick={() => onAction({ type: 'CUT' })}
          >
            {t('Cortar el mus')}
          </button>
          <p>{t('Han pedido mus: {0}/4', { '0': s.musVotes.length })}</p>
        </div>
      )}
      {s.phase === 'declare' && (
        <button
          className="button primary"
          disabled={!can}
          onClick={() => onAction({ type: 'DECLARE' })}
        >
          {t(
            s.lance === 'pares'
              ? s.summary?.pairBonus
                ? 'Declarar: tengo pares'
                : 'Declarar: no tengo pares'
              : s.summary?.juego
                ? 'Declarar: tengo juego'
                : 'Declarar: no tengo juego',
          )}
        </button>
      )}
      {(s.phase === 'bet' || s.phase === 'declare') && (
        <section className="mus-betting">
          <h2>{t('Lance: {0}', { '0': lanceName(s.lance) })}</h2>
          {Object.keys(s.declarations).length > 0 && (
            <ul>
              {Object.entries(s.declarations).map(([id, yes]) => (
                <li key={id}>
                  {name(id)}: {t(yes ? 'Tiene' : 'No tiene')} {lanceName(s.lance)}
                </li>
              ))}
            </ul>
          )}
          {s.phase === 'bet' && (
            <>
              {s.bet ? (
                <p role="status">
                  {t('Bando {0} propone: {1}', {
                    '0': s.bet.team + 1,
                    '1':
                      s.bet.offer === 'ordago'
                        ? t('Órdago')
                        : t('{0} piedras', { '0': s.bet.offer }),
                  })}
                </p>
              ) : (
                <p>{t('Sin envite abierto. Pasar conserva la opción de responder después.')}</p>
              )}
              <div className="board-actions">
                {s.bet ? (
                  <>
                    <button
                      className="button primary"
                      disabled={!can}
                      onClick={() =>
                        s.bet?.offer === 'ordago'
                          ? setOrdago(s.revision)
                          : onAction({ type: 'ACCEPT' })
                      }
                    >
                      {t('Quiero')}
                    </button>
                    <button
                      className="button secondary"
                      disabled={!can}
                      onClick={() => onAction({ type: 'FOLD' })}
                    >
                      {t('No quiero')}
                    </button>
                  </>
                ) : (
                  <button
                    className="button secondary"
                    disabled={!can}
                    onClick={() => onAction({ type: 'PASS' })}
                  >
                    {t('Paso')}
                  </button>
                )}
                {s.bet?.offer !== 'ordago' && (
                  <>
                    <label className="mus-amount">
                      {t('Total del envite')}
                      <input
                        type="number"
                        min={minimum}
                        max={100}
                        step={1}
                        value={bid}
                        disabled={!can}
                        onChange={(e) => setAmount(Number(e.target.value))}
                      />
                    </label>
                    <button
                      className="button secondary"
                      disabled={!can || !Number.isInteger(bid) || bid > 100}
                      onClick={() => onAction({ type: 'BID', amount: bid })}
                    >
                      {t(s.bet ? 'Reenvidar' : 'Envidar')}
                    </button>
                    <button
                      className="button danger"
                      disabled={!can}
                      onClick={() => setOrdago(s.revision)}
                    >
                      {t('Órdago')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      )}
      {s.phase === 'hand_end' && (
        <button
          className="button primary"
          disabled={!can}
          onClick={() => onAction({ type: 'NEXT_HAND' })}
        >
          {t('Siguiente mano')}
        </button>
      )}
    </>
  );
  return (
    <BoardFrame
      selectionActive={selected.length > 0}
      onCancelSelection={() => setDraft({ revision: s.revision, cards: [] })}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('Bando {0} · {1} piedras', { '0': p.team + 1, '1': s.teamPoints[p.team] }),
        ]),
      )}
      sidebarDetails={
        s.agreements.length
          ? {
              label: t('Lances acordados'),
              title: t('Lances acordados'),
              content: (
                <section className="mus-results">
                  {s.agreements.map((a, i) => (
                    <p key={i}>
                      {lanceName(a.lance)}:{' '}
                      {a.forcedTeam === null
                        ? t('Envite pendiente: {0} piedras', { '0': a.stake })
                        : t('Asignado al bando {0}', { '0': a.forcedTeam + 1 })}
                    </p>
                  ))}
                </section>
              ),
            }
          : undefined
      }
      actions={actions}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <div className="mus-score">
        {[0, 1].map((team) => (
          <div key={team}>
            <strong>{t('Bando {0}', { '0': team + 1 })}</strong>
            <p>
              {s.players
                .filter((p) => p.team === team)
                .map((p) => name(p.id))
                .join(' + ')}
            </p>
            <b>
              {s.teamPoints[team]} / {s.targetPoints}
            </b>
            <span>
              {t('{0} amarrakos y {1} piedras', {
                '0': Math.floor(s.teamPoints[team] / 5),
                '1': s.teamPoints[team] % 5,
              })}
            </span>
          </div>
        ))}
      </div>
      <p className="board-caption">
        {t('Mano {0} · es mano: {1} · ocho reyes y ocho ases', {
          '0': s.handNumber,
          '1': name(s.players[s.mano].id),
        })}
      </p>

      <section className="mus-own">
        <h2>{t('Tu mano')}</h2>
        <div className="spanish-hand">
          {s.hand.map((card) => (
            <button
              key={card}
              disabled={!can || s.phase !== 'discard'}
              aria-label={spanishCardLabel(card)}
              aria-pressed={selected.includes(card)}
              onClick={() =>
                setDraft({
                  revision: s.revision,
                  cards: selected.includes(card)
                    ? selected.filter((c) => c !== card)
                    : [...selected, card],
                })
              }
            >
              <SpanishCardFace card={card} motion />
            </button>
          ))}
        </div>
        {s.summary && (
          <p className="board-caption">
            {t('Tu juego suma {0}; valor de pares: {1}. Los treses son reyes y los doses, ases.', {
              '0': s.summary.sum,
              '1': s.summary.pairBonus,
            })}
          </p>
        )}
        {s.phase === 'discard' && (
          <button
            className="button primary"
            disabled={!can || !selected.length}
            onClick={() => onAction({ type: 'DISCARD', cards: selected })}
          >
            {t('Descartar {0} carta(s)', { '0': selected.length })}
          </button>
        )}
      </section>

      {ordago === s.revision && (
        <Modal title={t('Confirmar órdago')} onClose={() => setOrdago(null)}>
          <p>
            {t(
              'Un órdago aceptado decide el juego completo en este lance, sin contar los envites pendientes.',
            )}
          </p>
          <button
            className="button danger"
            disabled={!can}
            onClick={() => {
              onAction({ type: s.bet?.offer === 'ordago' ? 'ACCEPT' : 'ORDAGO' });
              setOrdago(null);
            }}
          >
            {t(s.bet?.offer === 'ordago' ? 'Aceptar el órdago' : 'Lanzar el órdago')}
          </button>
        </Modal>
      )}
      {s.showHands && (
        <div className="mus-reveal">
          {s.players.map((p) => (
            <section key={p.id}>
              <h3>{name(p.id)}</h3>
              <div>
                {p.hand?.map((card) => (
                  <SpanishCardFace key={card} card={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {s.results.length > 0 && (
        <section className="mus-results">
          <h2>{t('Recuento de la mano')}</h2>
          {s.results.map((r, i) => (
            <p key={i}>
              {t('{0}: bando {1}, {2} piedras', {
                '0': lanceName(r.lance),
                '1': r.team + 1,
                '2': r.points,
              })}
            </p>
          ))}
        </section>
      )}

      <p className="board-caption">
        {t('Mazo: {0} · descartes: {1}', { '0': s.stockCount, '1': s.discardCount })}
      </p>
    </BoardFrame>
  );
}
