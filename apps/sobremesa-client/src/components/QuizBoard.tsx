import { useState } from 'react';
import type { QuizAction, QuizPublicState } from 'sobremesa-logic';
import { t, gameText, useLocale } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import '../styles/quiz.css';
export function QuizBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<QuizPublicState, QuizAction>) {
  const { locale } = useLocale(),
    [draft, setDraft] = useState<{ revision: number; index: number } | null>(null),
    selected = draft?.revision === s.revision ? draft.index : null,
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId;
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('{0} puntos · {1}/{2} preguntas', {
            '0': p.score,
            '1': p.answered,
            '2': s.questionsPerPlayer,
          }),
        ]),
      )}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <article className="quiz-question">
        <p className="quiz-category">{t(s.question.category)}</p>
        <h2>{s.question.prompt[locale]}</h2>
        <div className="quiz-choices">
          {s.question.choices[locale].map((choice, index) => (
            <button
              key={index}
              className={`button ${s.question.answer === index ? 'correct' : 'secondary'}`}
              aria-pressed={selected === index}
              disabled={!can || s.phase !== 'question'}
              onClick={() => setDraft({ revision: s.revision, index })}
            >
              <b>{String.fromCharCode(65 + index)}</b>
              <span>{choice}</span>
              {s.question.answer === index && <strong>{t('Correcta')}</strong>}
              {s.phase !== 'question' && s.chosen === index && (
                <span>{t('Respuesta elegida')}</span>
              )}
            </button>
          ))}
        </div>
        {s.phase === 'question' && (
          <button
            className="button primary"
            disabled={!can || selected === null}
            onClick={() => {
              if (selected !== null) onAction({ type: 'ANSWER', index: selected });
            }}
          >
            {t('Confirmar respuesta')}
          </button>
        )}
        {s.phase === 'review' && (
          <button
            className="button primary"
            disabled={!can}
            onClick={() => onAction({ type: 'NEXT' })}
          >
            {t('Continuar')}
          </button>
        )}
      </article>
      <p>{t('Preguntas pendientes: {0}', { '0': s.remainingQuestions })}</p>
    </BoardFrame>
  );
}
