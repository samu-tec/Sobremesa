import { useEffect, useState } from 'react';
import {
  SCORE_CATEGORIES,
  type ScoreCategory,
  type DadosDeCombinacionesPublicState,
  type DadosDeCombinacionesAction,
} from 'sobremesa-logic';
import { t, quantity } from '../i18n';
import { BoardFrame, DiceFace, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
const categoryName = (k: ScoreCategory) =>
  ({
    ones: t('Unos'),
    twos: t('Doses'),
    threes: t('Treses'),
    fours: t('Cuatros'),
    fives: t('Cincos'),
    sixes: t('Seises'),
    threeKind: t('Trío'),
    fourKind: t('Póquer'),
    fullHouse: t('Full'),
    smallStraight: t('Escalera corta'),
    largeStraight: t('Escalera larga'),
    fiveKind: t('Cinco iguales'),
    chance: t('Azar'),
  })[k];
export function DadosDeCombinacionesBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<DadosDeCombinacionesPublicState, DadosDeCombinacionesAction>) {
  const [keep, setKeep] = useState<number[]>([]),
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !s.isDraw && !busy;
  const motionRef = useBoardMotion(`${s.currentTurnPlayerId}-${s.round}-${s.rolls}`, {
    rollDice: s.rolls > 0,
  });
  useEffect(() => setKeep([]), [s.currentTurnPlayerId, s.round]);
  return (
    <BoardFrame
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(s.players.map((p) => [p.id, quantity(s.totals[p.id], 'puntos')]))}
    >
      <div className="board-topline">
        <span className="eyebrow">{t('Ronda {0} de 13', { '0': s.round })}</span>
        <strong>{t('Tirada {0} de {1}', { '0': s.rolls, '1': s.maxRolls })}</strong>
      </div>
      <div className="combination-dice">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            disabled={!can || s.rolls === 0 || s.rolls === s.maxRolls}
            aria-pressed={keep.includes(i)}
            className={keep.includes(i) ? 'kept-die' : ''}
            aria-label={t('Dado {0}: {1}. {2}', {
              '0': i + 1,
              '1': s.dice[i] || '—',
              '2': keep.includes(i) ? t('Guardado') : t('Se volverá a tirar'),
            })}
            onClick={() =>
              setKeep((ids) => (ids.includes(i) ? ids.filter((v) => v !== i) : [...ids, i]))
            }
          >
            <DiceFace value={s.dice[i] || 1} kept={keep.includes(i)} />
            <small>{keep.includes(i) ? t('Guardado') : s.rolls ? t('Tirar') : '—'}</small>
          </button>
        ))}
      </div>
      <div className="board-actions">
        <button
          className="button primary"
          disabled={!can || s.rolls >= s.maxRolls}
          onClick={() => onAction({ type: 'ROLL', keep: s.rolls ? keep : [] })}
        >
          {s.rolls ? t('Volver a tirar') : t('Tirar dados')}
        </button>
        <span>{t('Pulsa los dados para guardarlos. Después elige una categoría.')}</span>
      </div>
      <div className="scorecard-wrap">
        <table className="combination-scorecard">
          <caption>{t('Hoja de puntuación')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('Categoría')}</th>
              {s.players.map((p) => (
                <th scope="col" key={p.id}>
                  {p.name || room.players.find((v) => v.id === p.id)?.name}
                  {p.id === myPlayerId ? t(' (tú)') : ''}
                </th>
              ))}
              <th scope="col">{t('Anotar')}</th>
            </tr>
          </thead>
          <tbody>
            {SCORE_CATEGORIES.map((k) => (
              <tr key={k}>
                <th scope="row">{categoryName(k)}</th>
                {s.players.map((p) => (
                  <td key={p.id}>{p.scores[k] ?? '—'}</td>
                ))}
                <td>
                  <button
                    className="button small secondary"
                    disabled={!can || s.available[k] === undefined}
                    aria-label={t('Anotar {0}: {1} puntos', {
                      '0': categoryName(k),
                      '1': s.available[k] ?? 0,
                    })}
                    onClick={() => onAction({ type: 'SCORE', category: k })}
                  >
                    {s.available[k] !== undefined ? `${s.available[k]} ✓` : '—'}
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">{t('Sección superior')}</th>
              {s.players.map((p) => (
                <td key={p.id}>
                  {SCORE_CATEGORIES.slice(0, 6).reduce((n, k) => n + (p.scores[k] || 0), 0)} / 63
                </td>
              ))}
              <td />
            </tr>
            <tr>
              <th scope="row">{t('Bonificaciones')}</th>
              {s.players.map((p) => (
                <td key={p.id}>
                  {p.bonus +
                    (s.upperBonus &&
                    SCORE_CATEGORIES.slice(0, 6).reduce((n, k) => n + (p.scores[k] || 0), 0) >= 63
                      ? 35
                      : 0)}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{t('Total')}</th>
              {s.players.map((p) => (
                <td key={p.id}>{s.totals[p.id]}</td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </BoardFrame>
  );
}
