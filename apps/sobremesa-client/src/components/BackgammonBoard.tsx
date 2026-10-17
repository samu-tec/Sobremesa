import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { DiceFace, BoardFrame, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import type { BackgammonPublicState, BackgammonAction } from 'sobremesa-logic';
export function BackgammonBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<BackgammonPublicState, BackgammonAction>) {
  const [from, setFrom] = useState<number | null>(null),
    side = s.players.findIndex((p) => p.id === myPlayerId),
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !busy;
  useEffect(() => setFrom(null), [s.points, s.currentTurnPlayerId]);
  const motionRef = useBoardMotion(`${s.lastMove?.id || 0}-${s.rollNumber}`, {
    travel: s.lastMove ? [{ from: String(s.lastMove.from), to: String(s.lastMove.to) }] : [],
    rollDice: s.rollNumber > 1,
    diceKey: s.rollNumber,
    travelKey: s.lastMove?.id || 0,
  });
  const render = (i: number) => {
    const n = s.points[i],
      legal = s.legalMoves.some((m) => m.from === i);
    return (
      <button
        key={i}
        data-cell={i}
        disabled={!can || !legal}
        className={`bg-point ${i % 2 ? 'point-coral' : 'point-sand'} ${from === i ? 'point-selected' : ''}`}
        aria-label={t('Punto {0}: {1} fichas', { '0': i + 1, '1': Math.abs(n) })}
        aria-pressed={from === i}
        onClick={() => setFrom(from === i ? null : i)}
      >
        <small>{i + 1}</small>
        <span className="bg-stack">
          {Array.from({ length: Math.min(Math.abs(n), 5) }, (_, j) => (
            <i className={`motion-piece bg-checker ${n > 0 ? 'light' : 'dark'}`} key={j} />
          ))}
        </span>
        {Math.abs(n) > 0 && <strong>{Math.abs(n)}</strong>}
      </button>
    );
  };
  return (
    <BoardFrame
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p, i) => [
          p.id,
          t('{0}/15 fuera · {1} barra', { '0': s.off[i], '1': s.bar[i] }),
        ]),
      )}
    >
      <p className="board-instruction">
        {side === 0
          ? t('Llevas las fichas claras: avanzan del punto 24 al 1.')
          : t('Llevas las fichas oscuras: avanzan del punto 1 al 24.')}
      </p>
      <div className="backgammon-board" role="group" aria-label={t('Tablero de Backgammon')}>
        <div className="bg-row">{Array.from({ length: 12 }, (_, i) => render(i + 12))}</div>
        <div className="bg-bar" data-cell="-1">
          <span>
            {t('Barra')} · ⚪ {s.bar[0]} / ⚫ {s.bar[1]}
          </span>
          <span>
            {t('Fuera')} · ⚪ {s.off[0]} / ⚫ {s.off[1]}
          </span>
        </div>
        <div className="bg-row bg-bottom">
          {Array.from({ length: 12 }, (_, i) => render(11 - i))}
        </div>
      </div>
      <div className="dice-row">
        {(s.dice.length ? s.dice : s.lastDice).map((d, i) => (
          <DiceFace key={i} value={d} />
        ))}
      </div>
      {s.phase === 'roll' ? (
        <button
          className="button primary"
          disabled={!can}
          onClick={() => onAction({ type: 'ROLL' })}
        >
          {t('Tirar dados')}
        </button>
      ) : (
        <>
          <p className="board-caption">
            {t(
              'Toca una de tus fichas o elige una jugada de la lista. Cada movimiento usa un dado.',
            )}
          </p>
          <div className="bg-moves">
            {s.bar[side] > 0 && (
              <button
                className="button secondary"
                disabled={!can}
                onClick={() => setFrom(from === -1 ? null : -1)}
              >
                {t('Entrar desde la barra')}
              </button>
            )}
            {from !== null && (
              <button className="button secondary" onClick={() => setFrom(null)}>
                {t('Ver todos los movimientos')}
              </button>
            )}
            {s.legalMoves
              .filter((m) => from === null || m.from === from)
              .map((m) => (
                <button
                  className="button secondary"
                  key={`${m.from}-${m.die}`}
                  disabled={!can}
                  onClick={() => onAction(m)}
                >
                  {m.from === -1 ? t('Barra') : m.from + 1} → {m.to === 24 ? t('Fuera') : m.to + 1}{' '}
                  <span className="move-die">⚄ {m.die}</span>
                </button>
              ))}
          </div>
        </>
      )}
    </BoardFrame>
  );
}
