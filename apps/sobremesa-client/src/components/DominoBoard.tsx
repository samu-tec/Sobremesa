import { useEffect, useState } from 'react';
import type { DominoPublicState, DominoAction, Domino } from 'sobremesa-logic';
import { t, quantity } from '../i18n';
import { useBoardMotion } from '../hooks/useBoardMotion';
import { BoardFrame, RoundNotice, type BoardProps } from '../ui/GameLayout';
function DominoTile({ tile }: { tile: Domino }) {
  return (
    <span className="domino-tile" data-motion-id={`tile-${tile.id}`}>
      <span>{tile.a}</span>
      <span>{tile.b}</span>
    </span>
  );
}
export function DominoBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<DominoPublicState, DominoAction>) {
  const [selected, setSelected] = useState<number | null>(null),
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !s.isDraw && !busy;
  useEffect(() => setSelected(null), [s.chain, s.currentTurnPlayerId]);
  const motionRef = useBoardMotion(JSON.stringify([s.chain, s.hand, s.round]));
  const send = (a: DominoAction) => {
    onAction(a);
    setSelected(null);
  };
  return (
    <BoardFrame
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('{0} · {1}', {
            '0': quantity(p.score, 'puntos'),
            '1': quantity(p.handCount, 'fichas'),
          }),
        ]),
      )}
    >
      <div className="board-topline">
        <span className="eyebrow">{t('Ronda {0} de {1}', { '0': s.round, '1': s.maxRounds })}</span>
        <strong>{t('Objetivo: {0} puntos', { '0': s.targetScore })}</strong>
        <strong>{t('Pozo: {0}', { '0': quantity(s.stockCount, 'fichas') })}</strong>
      </div>
      {s.phase === 'round_end' ? (
        <RoundNotice
          round={s.round}
          winner={s.roundWinner}
          room={room}
          disabled={!can}
          onNext={() => send({ type: 'NEXT_ROUND' })}
        />
      ) : (
        <p className="board-instruction">
          {s.chain.length
            ? t('Elige una ficha y el extremo donde colocarla.')
            : t('Empieza con la ficha marcada: el doble más alto o la de mayor suma.')}
        </p>
      )}
      <div className="domino-table">
        <div className="domino-ends">
          <span>
            {t('Izquierda')} · {s.chain[0]?.a ?? '—'}
          </span>
          <span>
            {t('Derecha')} · {s.chain.at(-1)?.b ?? '—'}
          </span>
        </div>
        <div className="domino-chain" aria-label={t('Cadena de dominó')}>
          {s.chain.map((tile) => (
            <DominoTile key={tile.id} tile={tile} />
          ))}
          {!s.chain.length && (
            <span className="domino-empty">{t('Coloca aquí la primera ficha.')}</span>
          )}
        </div>
      </div>
      <div className="board-actions">
        {(['left', 'right'] as const).map((end) => (
          <button
            className="button primary"
            key={end}
            disabled={
              !can ||
              !s.legalActions.some((a) => a.type === 'PLAY' && a.tile === selected && a.end === end)
            }
            onClick={() => send({ type: 'PLAY', tile: selected!, end })}
          >
            {end === 'left' ? t('Colocar a la izquierda') : t('Colocar a la derecha')}
          </button>
        ))}
        <button
          className="button secondary"
          disabled={!can || !s.legalActions.some((a) => a.type === 'DRAW')}
          onClick={() => send({ type: 'DRAW' })}
        >
          {t('Robar ficha')}
        </button>
        <button
          className="button secondary"
          disabled={!can || !s.legalActions.some((a) => a.type === 'PASS')}
          onClick={() => send({ type: 'PASS' })}
        >
          {t('Pasar')}
        </button>
      </div>
      <section className="new-hand">
        <h2>
          {t('Tus fichas')} · {s.hand.length}
        </h2>
        <div className="domino-hand">
          {s.hand.map((tile) => (
            <button
              key={tile.id}
              disabled={
                !can || !s.legalActions.some((a) => a.type === 'PLAY' && a.tile === tile.id)
              }
              className={selected === tile.id ? 'selected-tile' : ''}
              aria-label={t('Ficha {0} y {1}', { '0': tile.a, '1': tile.b })}
              aria-pressed={selected === tile.id}
              onClick={() => setSelected(tile.id)}
            >
              <DominoTile tile={tile} />
            </button>
          ))}
        </div>
      </section>
    </BoardFrame>
  );
}
