import { t, quantity } from '../i18n';
import { BoardFrame, moveBoardFocus, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import type { MancalaState, MancalaAction } from 'sobremesa-logic';
export function MancalaBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<MancalaState, MancalaAction>) {
  const motionRef = useBoardMotion(s.lastSow?.id || 0, { sow: s.lastSow });
  const side = s.players.findIndex((p) => p.id === myPlayerId),
    own = side * 7,
    other = (1 - side) * 7,
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !s.isDraw && !busy;
  return (
    <BoardFrame
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p, i) => [p.id, quantity(s.pits[i * 7 + 6], 'semillas')]),
      )}
    >
      <p className="board-instruction" role="status">
        {s.captured
          ? t('Se han capturado {0} semillas.', { '0': s.captured })
          : s.extraTurn
            ? t('La última semilla ha caído en el almacén: el turno continúa.')
            : t('Elige un hoyo de tu fila para repartir sus semillas.')}
      </p>
      <div className="mancala-board" role="group" aria-label={t('Tablero de Mancala')}>
        <div className="seed-store" data-cell={other + 6}>
          <span>{t('Rival')}</span>
          <strong>{s.pits[other + 6]}</strong>
        </div>
        <div className="mancala-rows">
          {[[5, 4, 3, 2, 1, 0].map((i) => other + i), [0, 1, 2, 3, 4, 5].map((i) => own + i)].map(
            (row, r) => (
              <div
                className="mancala-row"
                role="group"
                onKeyDown={(event) => moveBoardFocus(event, 6)}
                key={r}
              >
                {row.map((i) => (
                  <button
                    key={i}
                    data-cell={i}
                    disabled={!can || r === 0 || !s.pits[i]}
                    className={`seed-pit ${s.lastPit === i ? 'last-pit' : ''}`}
                    aria-label={t('Hoyo {0}: {1} semillas', { '0': (i % 7) + 1, '1': s.pits[i] })}
                    onClick={() => onAction({ type: 'SOW', pit: i })}
                  >
                    <span className="seed-pile" aria-hidden="true">
                      {Array.from({ length: Math.min(s.pits[i], 8) }, (_, n) => (
                        <i key={n} />
                      ))}
                    </span>
                    <strong>{s.pits[i]}</strong>
                  </button>
                ))}
              </div>
            ),
          )}
        </div>
        <div className="seed-store own-store" data-cell={own + 6}>
          <span>{t('Tu almacén')}</span>
          <strong>{s.pits[own + 6]}</strong>
        </div>
      </div>
      <p className="board-caption">
        {t('Tu fila está abajo. Siembra hacia tu almacén, a la derecha.')} ↺
      </p>
    </BoardFrame>
  );
}
