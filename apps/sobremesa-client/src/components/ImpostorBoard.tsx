import { useEffect, useState } from 'react';
import type { ImpostorPublicState, ImpostorAction } from 'sobremesa-logic';
import { t, useLocale } from '../i18n';
import { Modal } from '../ui/Modal';
import '../styles/impostor-physical.css';
import { useBoardMotion } from '../hooks/useBoardMotion';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
export function ImpostorBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<ImpostorPublicState, ImpostorAction>) {
  const { locale } = useLocale(),
    [reveal, setReveal] = useState(false),
    [word, setWord] = useState(''),
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !busy;
  useEffect(() => {
    const hide = () => setReveal(false);
    const visibility = () => {
      if (document.hidden) hide();
    };
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => setWord(''), [s.phase, s.currentTurnPlayerId, s.clueRound]);
  const motionRef = useBoardMotion(s.clues.length);
  const submit = () => {
    onAction(
      s.phase === 'guess'
        ? { type: 'GUESS', word: word.trim() }
        : { type: 'CLUE', word: word.trim() },
    );
  };
  const valid =
    s.phase === 'guess'
      ? word.trim().length >= 2 && word.trim().length <= 40
      : /^[\p{L}]{2,30}$/u.test(word.trim());
  const actions = (
    <>
      {s.mode === 'physical' && (
        <PhysicalImpostorControls
          state={s}
          myPlayerId={myPlayerId}
          onAction={onAction}
          busy={busy}
        />
      )}
      {s.mode === 'online' && (s.phase === 'clue' || s.phase === 'guess') && (
        <form
          className="impostor-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (can && valid) submit();
          }}
        >
          <label className="field">
            <span>{s.phase === 'guess' ? t('¿Cuál es la palabra secreta?') : t('Tu pista')}</span>
            <input
              autoComplete="off"
              value={word}
              maxLength={s.phase === 'guess' ? 40 : 30}
              disabled={!can}
              onChange={(e) => setWord(e.target.value)}
              placeholder={
                s.phase === 'guess' ? t('Escribe la palabra secreta') : t('Una sola palabra…')
              }
            />
          </label>
          <button className="button primary" disabled={!can || !valid}>
            {s.phase === 'guess' ? t('Confirmar respuesta') : t('Enviar pista')}
          </button>
        </form>
      )}
      {s.phase === 'vote' && !s.physicalVoting && (
        <div className="vote-options">
          {s.players
            .filter((p) => p.id !== myPlayerId)
            .map((p) => (
              <button
                className="button secondary"
                key={p.id}
                disabled={!can || (!!s.runoff && !s.runoff.includes(p.id))}
                onClick={() => onAction({ type: 'VOTE', target: p.id })}
              >
                {t('Votar a {0}', { '0': p.name || room.players.find((v) => v.id === p.id)?.name })}
              </button>
            ))}
        </div>
      )}
    </>
  );
  return (
    <BoardFrame
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          s.phase === 'vote' && !s.physicalVoting
            ? s.votedIds.includes(p.id)
              ? t('Voto enviado')
              : t('Voto pendiente')
            : '',
        ]),
      )}
      actions={actions}
    >
      <div className="impostor-secret">
        <span className="eyebrow">{t('TU PAPEL SECRETO')}</span>
        <p>
          {t('Categoría')}:{' '}
          <strong>{s.category ? t(s.category) : t('Sin pista de categoría')}</strong>
        </p>
        <button
          className="button secondary"
          aria-expanded={reveal}
          onClick={() => setReveal(!reveal)}
        >
          {reveal ? t('Ocultar mi papel') : t('Ver mi papel')}
        </button>
        {reveal && (
          <div className="secret-reveal">
            <strong>{s.isImpostor ? t('Eres el impostor') : t('Eres inocente')}</strong>
            <p>
              {s.isImpostor
                ? t('No conoces la palabra. Escucha las pistas y disimula.')
                : s.word?.[locale]}
            </p>
          </div>
        )}
      </div>
      <div className="phase-steps">
        <span className={s.phase === 'clue' ? 'active' : ''}>1 · {t('Pistas')}</span>
        <span className={s.phase === 'vote' ? 'active' : ''}>2 · {t('Votación')}</span>
        <span className={s.phase === 'guess' ? 'active' : ''}>3 · {t('Último intento')}</span>
      </div>
      <p className="board-instruction" role="status">
        {s.mode === 'physical' && s.phase === 'clue'
          ? t('Las pistas se dicen en voz alta; no hace falta escribir.')
          : s.phase === 'clue'
            ? t('Vuelta {0} de {1}: da una pista de una sola palabra.', {
                '0': s.clueRound,
                '1': s.clueRounds,
              })
            : s.phase === 'vote'
              ? s.physicalVoting
                ? t('El grupo vota en persona; el anfitrión registra el recuento.')
                : s.runoff
                  ? t('Desempate: vota entre los candidatos marcados.')
                  : t('¿Quién no conoce la palabra? Tu voto es secreto.')
              : s.phase === 'guess'
                ? t('El impostor ha sido descubierto. Puede salvarse adivinando la palabra.')
                : t('La palabra y los votos ya se pueden revelar.')}
      </p>
      <div className="clue-list">
        {s.clues.map((clue, i) => (
          <div className="clue-card" key={i} data-motion-id={`clue-${i}`}>
            <small>
              {room.players.find((p) => p.id === clue.playerId)?.name} · {clue.round}
            </small>
            <strong>
              {clue.spoken
                ? t(clue.skipped ? 'Turno de pista agotado' : 'Pista hablada completada')
                : clue.bot
                  ? t(clue.word)
                  : clue.word}
            </strong>
          </div>
        ))}
      </div>

      <p className="board-caption">
        {t(
          s.mode === 'physical'
            ? 'Oculta tu papel antes de dejar el móvil sobre la mesa. Las pistas se dan en persona.'
            : 'No compartas tu pantalla al consultar tu papel. Las pistas de todos aparecen en la mesa.',
        )}
      </p>
    </BoardFrame>
  );
}

export function PhysicalImpostorControls({
  state: s,
  myPlayerId,
  onAction,
  busy = false,
}: {
  state: ImpostorPublicState;
  myPlayerId: string;
  onAction: (a: ImpostorAction) => void;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState<{ key: string; counts: Record<string, number> }>({
      key: '',
      counts: {},
    }),
    key = `${s.phase}:${s.clues.length}:${s.runoff?.join(',') ?? ''}`,
    counts = draft.key === key ? draft.counts : {},
    [confirmation, setConfirmation] = useState<{ key: string; action: ImpostorAction } | null>(
      null,
    ),
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    moderator = s.moderatorId === myPlayerId,
    name = (id: string) => s.players.find((p) => p.id === id)?.name ?? id,
    recorded = s.players.map((p) => ({ playerId: p.id, count: counts[p.id] ?? 0 })),
    valid =
      recorded.every(
        (c) => Number.isInteger(c.count) && c.count >= 0 && c.count <= s.players.length,
      ) && recorded.reduce((sum, c) => sum + c.count, 0) <= s.players.length;
  return (
    <section className="physical-impostor">
      {s.phase === 'clue' && (
        <>
          <p className="board-instruction" role="status">
            {t('Vuelta {0}/{1}: {2} da su pista de viva voz.', {
              '0': s.clueRound,
              '1': s.clueRounds,
              '2': name(s.currentTurnPlayerId),
            })}
          </p>
          <button
            className="button primary"
            disabled={!can}
            onClick={() => onAction({ type: 'SPOKEN_CLUE' })}
          >
            {t('He dado mi pista')}
          </button>
        </>
      )}
      {s.phase === 'vote' && s.physicalVoting && (
        <>
          <h2>{s.runoff ? t('Recuento del desempate presencial') : t('Votación presencial')}</h2>
          <p>
            {t(
              'Votad en persona y registrad solo los totales. La aplicación no recoge votos individuales.',
            )}
          </p>
          <p>{t('Registra el recuento: {0}', { '0': name(s.moderatorId) })}</p>
          {moderator && (
            <>
              <div className="physical-counts">
                {s.players.map((p) => (
                  <label key={p.id}>
                    {name(p.id)}
                    <input
                      type="number"
                      min={0}
                      max={s.players.length}
                      value={counts[p.id] ?? 0}
                      disabled={!can || Boolean(s.runoff && !s.runoff.includes(p.id))}
                      onChange={(e) =>
                        setDraft({ key, counts: { ...counts, [p.id]: Number(e.target.value) } })
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                className="button primary"
                disabled={!can || !valid}
                onClick={() =>
                  setConfirmation({ key, action: { type: 'RECORD_VOTE', counts: recorded } })
                }
              >
                {t('Registrar recuento físico')}
              </button>
              <p>
                {t(
                  'La suma no puede superar el número de personas. Cero votos representa abstención.',
                )}
              </p>
            </>
          )}
        </>
      )}
      {s.phase === 'guess' && (
        <>
          <h2>{t('Último intento hablado')}</h2>
          <p>
            {t('{0} dice la palabra en voz alta. {1} confirma el resultado.', {
              '0': name(s.accused ?? ''),
              '1': name(s.moderatorId),
            })}
          </p>
          {moderator && (
            <div className="board-actions">
              <button
                className="button primary"
                disabled={!can}
                onClick={() =>
                  setConfirmation({ key, action: { type: 'CONFIRM_GUESS', correct: true } })
                }
              >
                {t('Ha acertado')}
              </button>
              <button
                className="button secondary"
                disabled={!can}
                onClick={() =>
                  setConfirmation({ key, action: { type: 'CONFIRM_GUESS', correct: false } })
                }
              >
                {t('No ha acertado')}
              </button>
            </div>
          )}
        </>
      )}
      {confirmation?.key === key && can && moderator && (
        <Modal title={t('Confirmar resultado presencial')} onClose={() => setConfirmation(null)}>
          <p>
            {t(
              'Comprueba el resultado con el grupo antes de confirmarlo. Esta decisión resuelve la fase.',
            )}
          </p>
          {confirmation.action.type === 'RECORD_VOTE' ? (
            <ul>
              {confirmation.action.counts.map((c) => (
                <li key={c.playerId}>
                  {name(c.playerId)}: {c.count}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {confirmation.action.type === 'CONFIRM_GUESS' &&
                t(confirmation.action.correct ? 'Ha acertado' : 'No ha acertado')}
            </p>
          )}
          <div className="board-actions">
            <button className="button secondary" onClick={() => setConfirmation(null)}>
              {t('Cancelar')}
            </button>
            <button
              className="button primary"
              onClick={() => {
                onAction(confirmation.action);
                setConfirmation(null);
              }}
            >
              {t('Confirmar resultado')}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
