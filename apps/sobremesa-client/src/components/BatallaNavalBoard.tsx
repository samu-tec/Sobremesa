import { useState } from 'react';
import type { BatallaNavalPublicState, BatallaNavalAction } from 'sobremesa-logic';
import { FLEET_LENGTHS } from 'sobremesa-logic';
import { t } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
const coordinate = (i: number) => `${String.fromCharCode(65 + (i % 10))}${Math.floor(i / 10) + 1}`;

export function BatallaNavalBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<BatallaNavalPublicState, BatallaNavalAction>) {
  const [length, setLength] = useState(5),
    [horizontal, setHorizontal] = useState(true),
    [hover, setHover] = useState<number | null>(null),
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !busy,
    placing = s.phase === 'placement';
  const remaining = FLEET_LENGTHS.filter(
    (l, i) =>
      FLEET_LENGTHS.slice(0, i + 1).filter((v) => v === l).length >
      s.ships.filter((ship) => ship.cells.length === l).length,
  );
  const activeLength = remaining.includes(length) ? length : remaining[0];
  const placement = (index: number) => {
    if (!activeLength) return false;
    const cells = Array.from({ length: activeLength }, (_, i) => index + i * (horizontal ? 1 : 10));
    return (
      (horizontal
        ? (index % 10) + activeLength <= 10
        : Math.floor(index / 10) + activeLength <= 10) &&
      !s.ships.some((ship) => ship.cells.some((c) => cells.includes(c)))
    );
  };
  const own = (index: number) => {
    const ship = s.ships.find((ship) => ship.cells.includes(index)),
      shot = s.incoming.find((v) => v.index === index);
    return shot ? (shot.hit ? 'hit' : 'miss') : ship ? 'ship' : '';
  };
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          placing
            ? p.ready
              ? t('Flota lista')
              : t('{0}/5 barcos', { '0': p.shipCount })
            : t('{0}/5 hundidos', { '0': p.sunkCount }),
        ]),
      )}
    >
      {placing ? (
        <>
          <p className="board-instruction">{t('Coloca tus cinco barcos y confirma la flota.')}</p>
          <div className="fleet-controls">
            <label className="field">
              <span>{t('Longitud del barco')}</span>
              <select
                value={activeLength || ''}
                disabled={!can || !remaining.length}
                onChange={(e) => setLength(Number(e.target.value))}
              >
                {!remaining.length && <option value="">{t('Todos colocados')}</option>}
                {[...new Set(remaining)].map((l) => (
                  <option key={l} value={l}>
                    {l} · {remaining.filter((v) => v === l).length} {t('pendientes')}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={!can}
              onClick={() => setHorizontal(!horizontal)}
            >
              {horizontal ? t('Horizontal ↔') : t('Vertical ↕')}
            </button>
          </div>
          <div className="board-actions">
            <button
              className="button secondary"
              disabled={!can}
              onClick={() => onAction({ type: 'RANDOMIZE' })}
            >
              {t('Colocación aleatoria')}
            </button>
            <button
              className="button primary"
              disabled={!can || s.ships.length !== 5}
              onClick={() => onAction({ type: 'READY' })}
            >
              {t('Flota lista')}
            </button>
          </div>
        </>
      ) : (
        <p className="board-instruction" role="status">
          {s.lastShot
            ? t('Último disparo: {0} · {1}', {
                '0': coordinate(s.lastShot.index),
                '1': s.lastShot.sunk ? t('Hundido') : s.lastShot.hit ? t('Tocado') : t('Agua'),
              })
            : t('Elige una coordenada de la flota rival.')}
        </p>
      )}
      <div className="fleet-boards">
        {[true, ...(placing ? [] : [false])].map((isOwn) => (
          <section className="fleet-board-section" key={String(isOwn)}>
            <h2>{isOwn ? t('Tu flota') : t('Flota rival')}</h2>
            <div
              className="naval-grid"
              role="group"
              aria-label={isOwn ? t('Tu flota') : t('Flota rival')}
            >
              {Array.from({ length: 100 }, (_, index) => {
                const shot = s.shots.find((v) => v.index === index),
                  status = isOwn
                    ? own(index)
                    : shot
                      ? shot.sunk
                        ? 'sunk'
                        : shot.hit
                          ? 'hit'
                          : 'miss'
                      : s.revealedFleet?.some((ship) => ship.cells.includes(index))
                        ? 'ship'
                        : '',
                  preview =
                    isOwn &&
                    placing &&
                    hover !== null &&
                    activeLength &&
                    Array.from(
                      { length: activeLength },
                      (_, i) => hover + i * (horizontal ? 1 : 10),
                    ).includes(index);
                return (
                  <button
                    key={index}
                    disabled={!can || (isOwn ? !(placing && placement(index)) : !!shot)}
                    className={`${status} ${preview ? 'placement-preview' : ''} ${s.lastShot?.index === index && ((isOwn && s.lastShot.by !== myPlayerId) || (!isOwn && s.lastShot.by === myPlayerId)) ? 'latest-shot' : ''}`}
                    aria-label={`${coordinate(index)}: ${status === 'hit' ? t('Tocado') : status === 'sunk' ? t('Hundido') : status === 'miss' ? t('Agua') : status === 'ship' ? t('Barco') : t('sin explorar')}`}
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    onClick={() =>
                      onAction(
                        isOwn
                          ? { type: 'PLACE', start: index, horizontal, length: activeLength! }
                          : { type: 'FIRE', index },
                      )
                    }
                  >
                    <small>{coordinate(index)}</small>
                    <span aria-hidden="true">
                      {status === 'hit' || status === 'sunk'
                        ? '×'
                        : status === 'miss'
                          ? '•'
                          : status === 'ship'
                            ? '▪'
                            : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {placing && (
        <div className="board-actions">
          {s.ships.map((ship, index) => (
            <button
              className="button small secondary"
              key={index}
              disabled={!can}
              onClick={() => onAction({ type: 'REMOVE', index })}
            >
              {t('Retirar barco de {0}', { '0': ship.cells.length })} · {coordinate(ship.cells[0])}
            </button>
          ))}
        </div>
      )}
      <p className="board-caption">
        {placing
          ? t('Los barcos pueden tocarse, pero no solaparse. Tu rival no ve sus posiciones.')
          : s.hitKeepsTurn
            ? t('× Tocado · • Agua. Si aciertas, vuelves a disparar.')
            : t('× Tocado · • Agua. Cada disparo pasa el turno.')}
      </p>
    </BoardFrame>
  );
}
