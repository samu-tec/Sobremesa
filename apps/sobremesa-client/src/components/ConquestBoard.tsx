import { useState } from 'react';
import {
  CONQUEST_MAP,
  CONQUEST_EDGES,
  CONQUEST_REGIONS,
  conquestNeighbors,
  conquestConnected,
  type ConquestAction,
  type ConquestPublicState,
} from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import '../styles/conquest.css';
const colors = ['#b74d42', '#39779c', '#6d853b', '#9165a2', '#b17b24', '#447c72'];
export function ConquestBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<ConquestPublicState, ConquestAction>) {
  const [selectedFrom, setFrom] = useState(-1),
    [selectedTo, setTo] = useState(-1),
    [quantity, setQuantity] = useState(1),
    [enlarged, setEnlarged] = useState(false),
    owned = s.territories.flatMap((ter, i) => (ter.owner === myPlayerId ? [i] : [])),
    from = owned.includes(selectedFrom) ? selectedFrom : (owned[0] ?? -1),
    targets =
      from < 0
        ? []
        : s.phase === 'attack'
          ? conquestNeighbors(from).filter((i) => s.territories[i].owner !== myPlayerId)
          : owned.filter((i) => i !== from && conquestConnected(s, from, i, myPlayerId)),
    to = targets.includes(selectedTo) ? selectedTo : (targets[0] ?? -1),
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    max =
      from < 0
        ? 0
        : s.phase === 'reinforce'
          ? Math.min(s.reinforcements, 30 - s.territories[from].armies)
          : s.phase === 'attack'
            ? Math.min(3, s.territories[from].armies - 1)
            : to < 0
              ? 0
              : Math.min(s.territories[from].armies - 1, 30 - s.territories[to].armies),
    amount = Math.min(quantity, Math.max(1, max)),
    valid = Number.isInteger(amount) && amount >= 1 && amount <= max,
    name = (id: string | null) =>
      id === null ? t('Neutral') : (room.players.find((p) => p.id === id)?.name ?? id),
    territoryLabel = (i: number) =>
      `${i + 1}. ${t(CONQUEST_MAP[i].name)} (${s.territories[i].armies})`;
  const actions = (
    <>
      {can && (
        <section className="conquest-controls">
          <h2>
            {s.phase === 'reinforce'
              ? t('Repartir refuerzos')
              : s.phase === 'attack'
                ? t('Combate o reorganización')
                : t('Traslado final')}
          </h2>
          <div className="conquest-inputs">
            <label>
              {s.phase === 'reinforce' ? t('Territorio propio') : t('Origen')}
              <select
                value={from}
                onChange={(e) => {
                  setFrom(Number(e.target.value));
                  setQuantity(1);
                }}
              >
                {owned.map((i) => (
                  <option value={i} key={i}>
                    {territoryLabel(i)}
                  </option>
                ))}
              </select>
            </label>
            {s.phase !== 'reinforce' && (
              <label>
                {t('Destino')}
                <select
                  value={to}
                  onChange={(e) => {
                    setTo(Number(e.target.value));
                    setQuantity(1);
                  }}
                >
                  {targets.length ? (
                    targets.map((i) => (
                      <option value={i} key={i}>
                        {territoryLabel(i)}
                      </option>
                    ))
                  ) : (
                    <option value={-1}>{t('Sin destinos disponibles')}</option>
                  )}
                </select>
              </label>
            )}
            <label>
              {t('Unidades')}
              <input
                type="number"
                min={1}
                max={max}
                value={amount}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="board-actions">
            {s.phase === 'reinforce' && (
              <button
                className="button primary"
                disabled={!valid}
                onClick={() => onAction({ type: 'REINFORCE', territory: from, amount })}
              >
                {t('Añadir refuerzos')}
              </button>
            )}
            {s.phase === 'attack' && (
              <>
                <button
                  className="button primary"
                  disabled={!valid || to < 0}
                  onClick={() => onAction({ type: 'ATTACK', from, to, troops: amount })}
                >
                  {t('Confirmar combate')}
                </button>
                <button className="button secondary" onClick={() => onAction({ type: 'FORTIFY' })}>
                  {t('Pasar a traslado')}
                </button>
              </>
            )}
            {s.phase === 'fortify' && (
              <button
                className="button primary"
                disabled={!valid || to < 0 || s.moved}
                onClick={() => onAction({ type: 'MOVE', from, to, amount })}
              >
                {t('Trasladar unidades')}
              </button>
            )}
            {s.phase !== 'reinforce' && (
              <button className="button secondary" onClick={() => onAction({ type: 'END_TURN' })}>
                {t('Terminar turno')}
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [p.id, t('{0} puntos de control', { '0': p.score })]),
      )}
      sidebarDetails={{
        label: t('Territorios y control'),
        title: t('Territorios y control'),
        content: (
          <>
            {s.lastBattle && (
              <section className="conquest-battle">
                <h2>{t('Último combate')}</h2>
                <p>
                  {t('{0} → {1}', {
                    '0': t(CONQUEST_MAP[s.lastBattle.from].name),
                    '1': t(CONQUEST_MAP[s.lastBattle.to].name),
                  })}
                </p>
                <p>
                  {t('Ataque: dado {0} + {1} unidades · defensa: dado {2}', {
                    '0': s.lastBattle.attackDie,
                    '1': s.lastBattle.troops,
                    '2': s.lastBattle.defendDie,
                  })}
                </p>
                <p>
                  {t('Bajas: atacante {0}, defensor {1}', {
                    '0': s.lastBattle.attackerLost,
                    '1': s.lastBattle.defenderLost,
                  })}
                  {s.lastBattle.captured ? ` · ${t('Territorio conquistado')}` : ''}
                </p>
              </section>
            )}
            <section className="conquest-regions">
              {CONQUEST_REGIONS.map((region, r) => (
                <div key={region}>
                  <h3>{t(region)}</h3>
                  <ul>
                    {CONQUEST_MAP.slice(r * 6, r * 6 + 6).map((ter, j) => {
                      const i = r * 6 + j;
                      return (
                        <li key={i}>
                          <strong>
                            {i + 1}. {t(ter.name)}
                          </strong>
                          <span>
                            {name(s.territories[i].owner)} ·{' '}
                            {t('{0} unidades', { '0': s.territories[i].armies })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          </>
        ),
      }}
      actions={actions}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p>
        {t('Ronda {0}/{1} · combates {2}/3 · refuerzos {3}', {
          '0': s.round,
          '1': s.maxRounds,
          '2': s.attacks,
          '3': s.reinforcements,
        })}
      </p>

      <button
        className="button secondary"
        aria-pressed={enlarged}
        onClick={() => setEnlarged(!enlarged)}
      >
        {enlarged ? t('Ajustar mapa') : t('Ampliar mapa')}
      </button>
      <div
        className={`conquest-map ${enlarged ? 'enlarged' : ''}`}
        tabIndex={0}
        role="group"
        aria-label={t('Mapa de tres regiones; los números corresponden a la lista de territorios')}
      >
        <svg viewBox="0 0 700 520" role="img" aria-label={t('Mapa del Archipiélago de Bruma')}>
          <rect x="0" y="0" width="700" height="520" rx="24" fill="#d9e6e4" />
          <path d="M26 54 195 12 301 72 315 218 144 276 12 188Z" fill="#e7d9b4" />
          <path d="M353 46 528 13 664 81 645 246 474 274 343 182Z" fill="#d4dfbb" />
          <path d="M170 315 329 277 515 319 543 457 361 501 183 470Z" fill="#d6d1df" />
          {CONQUEST_EDGES.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={CONQUEST_MAP[a].x}
              y1={CONQUEST_MAP[a].y}
              x2={CONQUEST_MAP[b].x}
              y2={CONQUEST_MAP[b].y}
              stroke="#6b8279"
              strokeWidth={3}
              strokeDasharray={Math.floor(a / 6) !== Math.floor(b / 6) ? '8 5' : undefined}
            />
          ))}
          {CONQUEST_MAP.map((ter, i) => {
            const seat = s.players.findIndex((p) => p.id === s.territories[i].owner);
            return (
              <g key={i}>
                <title>
                  {t('{0}: {1}, {2} unidades', {
                    '0': t(ter.name),
                    '1': name(s.territories[i].owner),
                    '2': s.territories[i].armies,
                  })}
                </title>
                <circle
                  cx={ter.x}
                  cy={ter.y}
                  r={25}
                  fill={seat < 0 ? '#6d746e' : colors[seat]}
                  stroke={i === from ? '#202e29' : '#fff9e9'}
                  strokeWidth={i === from ? 5 : 3}
                />
                <text
                  x={ter.x}
                  y={ter.y - 3}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="700"
                >
                  {seat < 0 ? 'N' : `P${seat + 1}`} · {i + 1}
                </text>
                <text
                  x={ter.x}
                  y={ter.y + 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize="17"
                  fontWeight="700"
                >
                  {s.territories[i].armies}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </BoardFrame>
  );
}
