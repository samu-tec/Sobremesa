import { useState } from 'react';
import { mahjongType, type MahjongAction, type MahjongPublicState } from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/mahjong.css';
const winds = () => [t('Este'), t('Sur'), t('Oeste'), t('Norte')];
const tileName = (tile: number) => {
  const type = mahjongType(tile);
  if (type < 9) return t('{0} de círculos', { '0': type + 1 });
  if (type < 18) return t('{0} de bambú', { '0': type - 8 });
  if (type < 27) return t('{0} de caracteres', { '0': type - 17 });
  return type < 31
    ? winds()[type - 27]
    : [t('Dragón rojo'), t('Dragón verde'), t('Dragón blanco')][type - 31];
};
function TileFace({ tile, motion = false }: { tile: number | null; motion?: boolean }) {
  if (tile === null)
    return (
      <span className="mahjong-tile back" aria-label={t('Ficha oculta')} role="img">
        ◆
      </span>
    );
  const type = mahjongType(tile),
    number = (type % 9) + 1;
  return (
    <span
      className={`mahjong-tile suit-${Math.floor(type / 9)}`}
      role="img"
      aria-label={tileName(tile)}
      data-motion-id={motion ? `mahjong-${tile}` : undefined}
    >
      {type < 18 ? (
        <>
          <b aria-hidden="true">{number}</b>
          <svg viewBox="0 0 30 42" aria-hidden="true">
            {Array.from({ length: number }, (_, i) =>
              type < 9 ? (
                <circle key={i} cx={5 + (i % 3) * 10} cy={10 + Math.floor(i / 3) * 12} r="3.2" />
              ) : (
                <path
                  key={i}
                  d={`M${5 + (i % 3) * 10} ${5 + Math.floor(i / 3) * 12}v8m-2-6h4m-4 4h4`}
                />
              ),
            )}
          </svg>
        </>
      ) : (
        <>
          <b aria-hidden="true">{type < 27 ? number : ''}</b>
          <strong aria-hidden="true">
            {type < 27 ? '萬' : ['東', '南', '西', '北', '中', '發', '白'][type - 27]}
          </strong>
        </>
      )}
    </span>
  );
}
export function MahjongBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<MahjongPublicState, MahjongAction>) {
  const [selection, setSelection] = useState<{ revision: number; tile: number | null }>({
      revision: -1,
      tile: null,
    }),
    selected = selection.revision === s.revision ? selection.tile : null,
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    legal = can ? s.legalActions : [],
    motionRef = useBoardMotion(s.revision),
    has = (type: MahjongAction['type']) => legal.some((a) => a.type === type),
    name = (id: string) => room.players.find((p) => p.id === id)?.name ?? id;
  const claimText = (a: Extract<MahjongAction, { type: 'CLAIM' }>) =>
    t(
      a.kind === 'chow'
        ? 'Reclamar escalera: {0}'
        : a.kind === 'pung'
          ? 'Reclamar trío: {0}'
          : 'Reclamar kong: {0}',
      { '0': a.tiles.map(tileName).join(', ') },
    );
  const actions = (
    <div className="board-actions mahjong-actions">
      {has('WIN') && (
        <button
          className="button primary"
          disabled={!can}
          onClick={() => onAction({ type: 'WIN' })}
        >
          {t('Declarar Mahjong')}
        </button>
      )}
      {s.phase === 'discard' && (
        <button
          className="button primary"
          disabled={!can || selected === null}
          onClick={() => {
            if (selected !== null) onAction({ type: 'DISCARD', tile: selected });
          }}
        >
          {t('Descartar ficha')}
        </button>
      )}
      {has('DRAW') && (
        <button
          className="button primary"
          disabled={!can}
          onClick={() => onAction({ type: 'DRAW' })}
        >
          {t('Robar del muro')}
        </button>
      )}
      {has('PASS') && (
        <button
          className="button secondary"
          disabled={!can}
          onClick={() => onAction({ type: 'PASS' })}
        >
          {t('Pasar reclamación')}
        </button>
      )}
      {legal.flatMap((a, i) =>
        a.type === 'CLAIM' ? (
          <button
            key={i}
            className="button secondary mahjong-claim"
            disabled={!can}
            onClick={() => onAction(a)}
            aria-label={claimText(a)}
          >
            <span>
              {t(
                a.kind === 'chow'
                  ? 'Reclamar escalera'
                  : a.kind === 'pung'
                    ? 'Reclamar trío'
                    : 'Reclamar kong',
              )}
            </span>
            <span className="mahjong-claim-tiles">
              {[...a.tiles, s.pending!.tile]
                .sort((a, b) => a - b)
                .map((tile) => (
                  <TileFace key={tile} tile={tile} />
                ))}
            </span>
          </button>
        ) : a.type === 'KONG' ? (
          <button key={i} className="button secondary" disabled={!can} onClick={() => onAction(a)}>
            {t(a.added ? 'Ampliar trío a kong: {0}' : 'Kong oculto: {0}', {
              '0': tileName(a.tile),
            })}
          </button>
        ) : (
          []
        ),
      )}
    </div>
  );
  return (
    <BoardFrame
      actions={actions}
      selectionActive={selected !== null}
      onCancelSelection={() => setSelection({ revision: s.revision, tile: null })}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p, i) => [
          p.id,
          s.phase === 'finished'
            ? t('{0} puntos', { '0': p.score })
            : t('{0} · {1} fichas', { '0': winds()[i], '1': p.handCount }),
        ]),
      )}
      sidebarDetails={{
        label: t('Ver descartes'),
        title: t('Descartes de los jugadores'),
        content: s.players.map((p) => (
          <section className="mahjong-river" key={p.id}>
            <h3>
              {t('Descartes: {0}', { '0': s.rivers[p.id].length })} · {name(p.id)}
            </h3>
            <div>
              {s.rivers[p.id].map((tile) => (
                <TileFace key={tile} tile={tile} />
              ))}
            </div>
          </section>
        )),
      }}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p className="board-caption">
        {t('Hong Kong antiguo · sin flores · mínimo {0} fan · límite 4', { '0': s.minimumFan })}
      </p>
      {s.pending && (
        <div className="mahjong-pending" role="status">
          <TileFace tile={s.pending.tile} motion />
          <div>
            <strong>{name(s.pending.from)}</strong>
            <p>
              {t(
                s.pending.kind === 'kong'
                  ? 'Kong añadido: se puede reclamar Mahjong.'
                  : 'Último descarte: decide si lo reclamas.',
              )}
            </p>
            <small>{t('Respuestas recibidas: {0}/3', { '0': s.respondedIds.length })}</small>
          </div>
        </div>
      )}

      <section className="mahjong-own" aria-label={t('Tu mano de Mahjong')}>
        <h2>{t('Tu mano')}</h2>
        <p>
          {t(
            'Selecciona una ficha y confirma el descarte. Las combinaciones reclamadas quedan fijas.',
          )}
        </p>
        <div className="mahjong-hand">
          {[...s.hand]
            .sort((a, b) => a - b)
            .map((tile) => (
              <button
                key={tile}
                disabled={!can || s.phase !== 'discard'}
                aria-pressed={selected === tile}
                aria-label={t('{0}, copia {1}', { '0': tileName(tile), '1': (tile % 4) + 1 })}
                onClick={() =>
                  setSelection({ revision: s.revision, tile: selected === tile ? null : tile })
                }
              >
                <TileFace tile={tile} motion />
              </button>
            ))}
        </div>
        {s.drawn !== null && (
          <p className="board-caption">
            {t('Última ficha robada: {0}', { '0': tileName(s.drawn) })}
          </p>
        )}
        {selected !== null && (
          <p role="status">{t('Ficha seleccionada: {0}', { '0': tileName(selected) })}</p>
        )}
      </section>

      <div className="mahjong-table" role="group" tabIndex={0} aria-label={t('Mesa de Mahjong')}>
        <div className="mahjong-wall">
          <span aria-hidden="true">東</span>
          <div>
            <strong>{t('Muro: {0} fichas', { '0': s.wallCount })}</strong>
            <p>{t('Ronda Este · una mano por partida')}</p>
          </div>
        </div>
        <div className="mahjong-seats">
          {s.players.map((p, i) => (
            <section
              key={p.id}
              className={`mahjong-seat${p.id === s.currentTurnPlayerId ? ' active' : ''}`}
              aria-label={t('Asiento {0}: {1}', { '0': winds()[i], '1': name(p.id) })}
            >
              <h2>
                <span aria-hidden="true">{['東', '南', '西', '北'][i]}</span>
                {name(p.id)} <small>{winds()[i]}</small>
              </h2>
              <p>{t('{0} fichas en mano', { '0': p.handCount })}</p>
              <div
                className="mahjong-backs"
                style={{ width: `${Math.min(p.handCount, 14) * 12}px` }}
                aria-hidden="true"
              />
              {p.melds.map((m, n) => (
                <div key={n} className="mahjong-meld">
                  <span>
                    {t(
                      m.concealed
                        ? 'Kong oculto'
                        : m.kind === 'chow'
                          ? 'Escalera'
                          : m.kind === 'pung'
                            ? 'Trío'
                            : 'Kong',
                    )}
                  </span>
                  <div>
                    {m.tiles.map((tile, k) => (
                      <TileFace key={k} tile={tile} motion />
                    ))}
                  </div>
                </div>
              ))}
              {p.revealedHand && (
                <div
                  className="mahjong-revealed"
                  aria-label={t('Mano revelada de {0}', { '0': name(p.id) })}
                >
                  {p.revealedHand.map((tile) => (
                    <TileFace key={tile} tile={tile} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      {!can && s.phase !== 'finished' && (
        <p className="board-caption">
          {t('Espera a tu turno para robar, descartar o responder a una reclamación.')}
        </p>
      )}
      {s.result && (
        <section className="mahjong-result" aria-label={t('Puntuación de Mahjong')}>
          <h2>{t('{0} fan · {1} puntos base', { '0': s.result.fan, '1': s.result.base })}</h2>
          <ul>
            {s.result.patterns.map((pattern, i) => (
              <li key={i}>{gameText(pattern)}</li>
            ))}
          </ul>
          <p>{t('El marcador muestra los puntos ganados y cedidos en esta mano.')}</p>
        </section>
      )}
    </BoardFrame>
  );
}
