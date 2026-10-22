import { useState } from 'react';
import {
  MYSTERY_CARDS,
  type MysteryTriple,
  type MysteryAction,
  type MysteryPublicState,
} from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { Modal } from '../ui/Modal';
import '../styles/mystery.css';
export function MysteryBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<MysteryPublicState, MysteryAction>) {
  const [cards, setCards] = useState<MysteryTriple>([0, 6, 12]),
    [notes, setNotes] = useState<number[]>([]),
    [confirm, setConfirm] = useState<{ revision: number; cards: MysteryTriple } | null>(null),
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    investigate = can && (s.phase === 'investigate' || s.phase === 'conclude'),
    name = (id: string) => room.players.find((p) => p.id === id)?.name ?? id,
    known = new Set([...s.hand, ...s.proofs.map((p) => p.card)]),
    categories = [t('Personaje'), t('Lugar'), t('Objeto')];
  const actions = (
    <>
      {s.phase === 'refute' && can && (
        <section>
          <h2>{t('Elige una carta para mostrar solo a {0}', { '0': name(s.investigatorId) })}</h2>
          <div className="board-actions">
            {s.showable.map((card) => (
              <button
                className="button primary"
                key={card}
                disabled={busy}
                onClick={() => onAction({ type: 'SHOW', card })}
              >
                {t(MYSTERY_CARDS[card])}
              </button>
            ))}
          </div>
        </section>
      )}
      {investigate && (
        <section>
          <h2>{t('Tu siguiente decisión')}</h2>
          <div className="mystery-selects">
            {categories.map((category, i) => (
              <label key={i}>
                {category}
                <select
                  value={cards[i]}
                  onChange={(e) =>
                    setCards(
                      cards.map((c, j) => (i === j ? Number(e.target.value) : c)) as MysteryTriple,
                    )
                  }
                >
                  {MYSTERY_CARDS.slice(i * 6, i * 6 + 6).map((card, j) => (
                    <option key={card} value={i * 6 + j}>
                      {t(card)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="board-actions">
            {s.phase === 'investigate' && (
              <button
                className="button primary"
                onClick={() => onAction({ type: 'HYPOTHESIS', cards })}
              >
                {t('Investigar hipótesis')}
              </button>
            )}
            <button
              className="button secondary"
              onClick={() => setConfirm({ revision: s.revision, cards: [...cards] })}
            >
              {t('Preparar acusación final')}
            </button>
            <button className="button secondary" onClick={() => onAction({ type: 'END_TURN' })}>
              {t('Terminar turno')}
            </button>
          </div>
        </section>
      )}
    </>
  );
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          p.eliminated ? t('Solo muestra pistas') : t('{0} pistas privadas', { '0': p.handCount }),
        ]),
      )}
      actions={actions}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p>{t('Investigación {0} · investiga {1}', { '0': s.turn, '1': name(s.investigatorId) })}</p>
      <section className="mystery-private">
        <h2>{t('Tus pistas privadas')}</h2>
        <ul>
          {s.hand.map((c) => (
            <li key={c}>{t(MYSTERY_CARDS[c])}</li>
          ))}
        </ul>
        {s.proofs.length > 0 && (
          <>
            <h3>{t('Pistas que te han mostrado')}</h3>
            <ul>
              {s.proofs.map((proof) => (
                <li key={proof.card}>
                  {t('{0} mostró {1} en la investigación {2}', {
                    '0': name(proof.by),
                    '1': t(MYSTERY_CARDS[proof.card]),
                    '2': proof.turn,
                  })}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {s.hypothesis && (
        <section className="mystery-hypothesis">
          <h2>{t('Hipótesis pública')}</h2>
          <p>{s.hypothesis.cards.map((c) => t(MYSTERY_CARDS[c])).join(' · ')}</p>
          <p>
            {t('No pudieron refutar: {0}', {
              '0': s.hypothesis.passedIds.map(name).join(', ') || t('Nadie todavía'),
            })}
          </p>
          <p>
            {s.hypothesis.refuterId
              ? t('Muestra una pista: {0}', { '0': name(s.hypothesis.refuterId) })
              : t('Ninguna otra mano contiene esas cartas.')}
          </p>
        </section>
      )}

      <section>
        <h2>{t('Cuaderno de deducción')}</h2>
        <p>
          {t(
            'Tus marcas son locales y se pierden al recargar. Una pista conocida no forma parte de la solución.',
          )}
        </p>
        <div className="mystery-notebook">
          {categories.map((category, i) => (
            <fieldset key={i}>
              <legend>{category}</legend>
              {MYSTERY_CARDS.slice(i * 6, i * 6 + 6).map((card, j) => {
                const c = i * 6 + j;
                return (
                  <label key={c} className={known.has(c) ? 'known' : ''}>
                    <input
                      type="checkbox"
                      checked={known.has(c) || notes.includes(c)}
                      disabled={known.has(c)}
                      onChange={() =>
                        setNotes(notes.includes(c) ? notes.filter((n) => n !== c) : [...notes, c])
                      }
                    />
                    <span>
                      {t(card)}
                      {known.has(c) ? ` · ${t('Pista conocida')}` : ''}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      </section>
      {s.lastAccusation && (
        <p>
          {t('Última acusación de {0}: {1}', {
            '0': name(s.lastAccusation.by),
            '1': s.lastAccusation.cards.map((c) => t(MYSTERY_CARDS[c])).join(' · '),
          })}
        </p>
      )}
      {s.solution && (
        <section className="mystery-solution">
          <h2>{t('Solución del misterio')}</h2>
          <p>{s.solution.map((c) => t(MYSTERY_CARDS[c])).join(' · ')}</p>
        </section>
      )}
      {confirm && confirm.revision === s.revision && investigate && (
        <Modal title={t('Confirmar acusación final')} onClose={() => setConfirm(null)}>
          <p>{confirm.cards.map((c) => t(MYSTERY_CARDS[c])).join(' · ')}</p>
          <p>
            {t(
              'Si fallas, dejas de investigar durante el resto de la partida. Seguirás mostrando tus pistas.',
            )}
          </p>
          <div className="board-actions">
            <button className="button secondary" onClick={() => setConfirm(null)}>
              {t('Cancelar')}
            </button>
            <button
              className="button primary"
              onClick={() => {
                onAction({ type: 'ACCUSE', cards: confirm.cards });
                setConfirm(null);
              }}
            >
              {t('Acusar')}
            </button>
          </div>
        </Modal>
      )}
    </BoardFrame>
  );
}
