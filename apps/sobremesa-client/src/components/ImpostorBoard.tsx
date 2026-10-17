import { useEffect, useState } from 'react';
import type { ImpostorPublicState, ImpostorAction } from 'sobremesa-logic';
import { t, useLocale } from '../i18n';
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
  return (
    <BoardFrame
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          s.phase === 'vote'
            ? s.votedIds.includes(p.id)
              ? t('Voto enviado')
              : t('Voto pendiente')
            : '',
        ]),
      )}
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
        {s.phase === 'clue'
          ? t('Vuelta {0} de {1}: da una pista de una sola palabra.', {
              '0': s.clueRound,
              '1': s.clueRounds,
            })
          : s.phase === 'vote'
            ? s.runoff
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
            <strong>{clue.bot ? t(clue.word) : clue.word}</strong>
          </div>
        ))}
      </div>
      {(s.phase === 'clue' || s.phase === 'guess') && (
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
      {s.phase === 'vote' && (
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
      <p className="board-caption">
        {t(
          'No compartas tu pantalla al consultar tu papel. Las pistas de todos aparecen en la mesa.',
        )}
      </p>
    </BoardFrame>
  );
}
