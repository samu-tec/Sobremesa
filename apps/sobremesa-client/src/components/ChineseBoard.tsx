import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  CHINESE_HOLES,
  chinesePaths,
  type ChineseAction,
  type ChinesePublicState,
} from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/chinese.css';
const colors = ['#386d50', '#35618a', '#a35c23', '#a1445a', '#705397', '#79661c'];
export function ChineseBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<ChinesePublicState, ChineseAction>) {
  const [enlarged, setEnlarged] = useState(false),
    [canTap, setCanTap] = useState(false),
    boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(([entry]) => setCanTap(entry.contentRect.width >= 480));
    observer.observe(board);
    return () => observer.disconnect();
  }, []);
  const [selection, setSelection] = useState<{
    revision: number;
    from: number | null;
    to: number | null;
  }>({ revision: -1, from: null, to: null });
  const from = selection.revision === s.revision ? selection.from : null,
    to = selection.revision === s.revision ? selection.to : null,
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    paths = can ? chinesePaths(s, myPlayerId) : [],
    routes = paths.filter((p) => p[0] === from),
    route = routes.find((p) => p.at(-1) === to),
    motionRef = useBoardMotion(s.revision, { layoutKey: `${enlarged}:${canTap}` }),
    own = s.board.flatMap((p, i) => (p?.owner === myPlayerId ? [i] : []));
  const choose = (index: number) => {
    if (!can) return;
    if (s.board[index]?.owner === myPlayerId)
      setSelection({ revision: s.revision, from: index, to: null });
    else if (routes.some((p) => p.at(-1) === index))
      setSelection({ revision: s.revision, from, to: index });
  };
  const progress = (id: string, arm: number) =>
    s.board.filter((p, i) => p?.owner === id && CHINESE_HOLES[i].arm === (arm + 3) % 6).length;
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [p.id, t('{0}/10 en destino', { '0': progress(p.id, p.arm) })]),
      )}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p className="board-caption">
        {t('Selecciona una ficha, elige un destino resaltado y confirma el recorrido.')}
      </p>
      {!canTap && (
        <p className="board-caption">
          {t('Vista general: usa los selectores o amplía el tablero para tocar las fichas.')}
        </p>
      )}
      {(!canTap || enlarged) && (
        <button
          className="button secondary chinese-zoom"
          aria-pressed={enlarged}
          onClick={() => setEnlarged(!enlarged)}
        >
          {t(enlarged ? 'Ver tablero completo' : 'Ampliar tablero')}
        </button>
      )}
      <div className="chinese-scroll">
        <div
          className={`chinese-board${enlarged ? ' enlarged' : ''}`}
          ref={boardRef}
          role="group"
          aria-label={t('Tablero de Damas chinas')}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M50 2 63 27 94 27 78 50 94 73 63 73 50 98 37 73 6 73 22 50 6 27 37 27Z" />
            {[
              '50,2 35,26 65,26',
              '94,27 65,27 79,50',
              '94,73 79,50 65,73',
              '50,98 35,74 65,74',
              '6,73 35,73 21,50',
              '6,27 21,50 35,27',
            ].map((points, arm) => (
              <polygon key={arm} points={points} fill={colors[arm]} opacity=".18" stroke="none" />
            ))}
            {[
              [50, 3.7],
              [92, 29],
              [92, 73],
              [50, 97],
              [8, 73],
              [8, 29],
            ].map(([x, y], arm) => (
              <text
                key={arm}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize="3.2"
                fontWeight="700"
                fill="#273824"
                stroke="none"
              >
                {arm + 1}
              </text>
            ))}
          </svg>
          {CHINESE_HOLES.map((h, i) => {
            const pawn = s.board[i],
              player = s.players.find((p) => p.id === pawn?.owner),
              legal = routes.some((p) => p.at(-1) === i),
              chosen = from === i || to === i;
            return (
              <button
                key={i}
                disabled={!canTap}
                className={`chinese-hole${legal ? ' legal' : ''}${chosen ? ' selected' : ''}${route?.includes(i) ? ' route' : ''}`}
                style={
                  {
                    left: `${50 + (h.q + h.r / 2) * 6.65}%`,
                    top: `${50 + h.r * 5.45}%`,
                    '--pawn-color': player ? colors[player.arm] : 'transparent',
                  } as CSSProperties
                }
                aria-pressed={chosen}
                aria-disabled={!can || (!legal && pawn?.owner !== myPlayerId)}
                aria-label={
                  pawn
                    ? t('Hueco {0}: ficha {1} de {2}', {
                        '0': i + 1,
                        '1': pawn.number,
                        '2': room.players.find((p) => p.id === pawn.owner)?.name ?? pawn.owner,
                      })
                    : t('Hueco vacío {0}', { '0': i + 1 })
                }
                onClick={() => choose(i)}
              >
                {pawn ? (
                  <span className="chinese-pawn" data-motion-id={`${pawn.owner}-${pawn.number}`}>
                    {pawn.number}
                  </span>
                ) : legal ? (
                  <span aria-hidden="true">·</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="chinese-controls">
        <label>
          {t('Ficha')}
          <select
            disabled={!can}
            value={from ?? ''}
            onChange={(e) =>
              setSelection({
                revision: s.revision,
                from: e.target.value === '' ? null : Number(e.target.value),
                to: null,
              })
            }
          >
            <option value="">{t('Seleccionar ficha')}</option>
            {own.map((i) => (
              <option key={i} value={i}>
                {t('Ficha {0} · hueco {1}', { '0': s.board[i]!.number, '1': i + 1 })}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Destino')}
          <select
            disabled={!can || from === null}
            value={to ?? ''}
            onChange={(e) =>
              setSelection({
                revision: s.revision,
                from,
                to: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          >
            <option value="">{t('Seleccionar destino')}</option>
            {routes.map((p) => (
              <option key={p.at(-1)} value={p.at(-1)}>
                {t('Hueco {0} · {1} tramo(s)', { '0': p.at(-1)! + 1, '1': p.length - 1 })}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button primary"
          disabled={!can || !route}
          onClick={() => {
            if (route) onAction({ type: 'MOVE', path: route });
          }}
        >
          {t('Confirmar movimiento')}
        </button>
        {can && !paths.length && (
          <button className="button secondary" onClick={() => onAction({ type: 'PASS' })}>
            {t('Pasar')}
          </button>
        )}
      </div>
      {route && (
        <p className="board-caption" role="status">
          {t('Recorrido: {0}', { '0': route.map((i) => i + 1).join(' → ') })}
        </p>
      )}
      <ul className="chinese-legend">
        {s.players.map((p) => (
          <li key={p.id}>
            <span style={{ background: colors[p.arm] }} aria-hidden="true" />
            {room.players.find((r) => r.id === p.id)?.name ?? p.id}:{' '}
            {t('punta {0} → {1}', { '0': p.arm + 1, '1': ((p.arm + 3) % 6) + 1 })}
            {s.eliminated.includes(p.id) ? t(' · fuera de la partida') : ''}
          </li>
        ))}
      </ul>
    </BoardFrame>
  );
}
