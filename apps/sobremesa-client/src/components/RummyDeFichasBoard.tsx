import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  analyzeRummyDeFichasSet,
  checkRummyDeFichasPlay,
  rummyMeldOptions,
  type RummyDeFichasPublicState,
  type RummyDeFichasAction,
  type RummyDeFichasTile,
  type RummyDeFichasProblem,
} from 'sobremesa-logic';
import { t, quantity } from '../i18n';
import { useBoardMotion } from '../hooks/useBoardMotion';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
function scrollTiles(event: KeyboardEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key))
    return;
  event.preventDefault();
  event.currentTarget.scrollLeft += event.key === 'ArrowRight' ? 80 : -80;
}
const marks = ['●', '◆', '■', '▲'];
const colour = (n: number) => [t('Rojo'), t('Azul'), t('Negro'), t('Mostaza')][n] || t('Comodín');
const tileName = (tile: RummyDeFichasTile) =>
  tile.joker
    ? t('Comodín {0}', { '0': tile.id - 103 })
    : t('Ficha {0} {1}', { '0': tile.value, '1': colour(tile.color) });
function Tile({ tile, last = false }: { tile: RummyDeFichasTile; last?: boolean }) {
  return (
    <span
      data-motion-id={`tile-${tile.id}`}
      className={`number-tile tile-colour-${tile.color} ${last ? 'tile-just-played' : ''}`}
    >
      <strong>{tile.joker ? '★' : tile.value}</strong>
      <small aria-hidden="true">{tile.joker ? '☺' : marks[tile.color]}</small>
    </span>
  );
}
const problemText = (reason: RummyDeFichasProblem, openingPoints: number) =>
  ({
    invalid: t('Todas las combinaciones deben ser grupos o escaleras válidos.'),
    duplicate: t('Una ficha no puede estar en dos sitios a la vez.'),
    missing: t('Quedan fichas de la mesa sueltas. Inclúyelas en una combinación.'),
    foreign: t('Solo puedes usar tus fichas y las que ya están en la mesa.'),
    no_new: t('Añade al menos una ficha de tu atril para confirmar.'),
    opening: t('Para abrir, baja al menos {0} puntos con las fichas de tu atril.', {
      '0': openingPoints,
    }),
  })[reason || 'no_new'];
export function RummyDeFichasBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<RummyDeFichasPublicState, RummyDeFichasAction>) {
  const base = useMemo(() => s.table.map((set) => set.map((tile) => tile.id)), [s.table]),
    [draft, setDraft] = useState<number[][]>(base),
    [selected, setSelected] = useState<number[]>([]),
    [undo, setUndo] = useState<number[][][]>([]),
    [sort, setSort] = useState<'color' | 'value'>('color');
  const me = s.players.find((p) => p.id === myPlayerId)!,
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !s.isDraw && !busy,
    lookup = new Map([...s.table.flat(), ...s.hand].map((tile) => [tile.id, tile]));
  useEffect(() => {
    setDraft(base);
    setSelected([]);
    setUndo([]);
  }, [base, s.currentTurnPlayerId, s.turnNumber]);
  const validDraft = draft.every((set) => set.every((id) => lookup.has(id))),
    safeDraft = validDraft ? draft : base,
    used = new Set(safeDraft.flat()),
    loose = s.table.flat().filter((tile) => !used.has(tile.id)),
    hand = s.hand
      .filter((tile) => !used.has(tile.id))
      .sort((a, b) =>
        sort === 'color'
          ? a.color - b.color || a.value - b.value
          : a.value - b.value || a.color - b.color,
      ),
    played = s.hand.filter((tile) => used.has(tile.id));
  const check = checkRummyDeFichasPlay(
      s.table,
      s.hand,
      me.opened,
      safeDraft,
      s.rules.openingPoints,
    ),
    changed = JSON.stringify(base) !== JSON.stringify(safeDraft);
  const motionRef = useBoardMotion(JSON.stringify([safeDraft, hand.map((t) => t.id)]));
  const toggle = (id: number) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]));
  const normalize = (ids: number[]) =>
    analyzeRummyDeFichasSet(ids.map((id) => lookup.get(id)!))?.tiles.map((tile) => tile.id) || ids;
  const update = (next: number[][]) => {
    setUndo((history) => [...history, safeDraft.map((set) => [...set])].slice(-30));
    setDraft(next);
    setSelected([]);
  };
  const move = (target: number | null) => {
    if (!selected.length) return;
    const next = safeDraft.map((set) => set.filter((id) => !selected.includes(id)));
    if (target === null) next.push(normalize(selected));
    else next[target] = normalize([...next[target], ...selected]);
    update(next.filter((set) => set.length));
  };
  const editable = (index: number) => me.opened || index >= base.length;
  const renderTile = (tile: RummyDeFichasTile, disabled = false) => (
    <button
      key={tile.id}
      type="button"
      disabled={!can || disabled}
      className={selected.includes(tile.id) ? 'selected-number-tile' : ''}
      aria-label={tileName(tile)}
      aria-pressed={selected.includes(tile.id)}
      onClick={() => toggle(tile.id)}
    >
      <Tile tile={tile} last={s.lastPlayedIds.includes(tile.id)} />
    </button>
  );
  const suggest = () => {
    const candidate = rummyMeldOptions(hand)[0];
    if (candidate) setSelected(candidate);
  };
  const actions = (
    <>
      <div className="tile-draft-tools">
        <button
          className="button secondary"
          disabled={!can || !selected.length}
          onClick={() => move(null)}
        >
          {t('Crear combinación')} {selected.length ? `(${selected.length})` : ''}
        </button>
        <button
          className="button secondary"
          disabled={
            !can ||
            !selected.length ||
            selected.some((id) => !s.hand.some((tile) => tile.id === id))
          }
          onClick={() =>
            update(
              safeDraft
                .map((set) => set.filter((id) => !selected.includes(id)))
                .filter((set) => set.length),
            )
          }
        >
          {t('Devolver al atril')}
        </button>
        <button
          className="button secondary"
          disabled={!can || !undo.length}
          onClick={() => {
            setDraft(undo.at(-1)!);
            setUndo((history) => history.slice(0, -1));
            setSelected([]);
          }}
        >
          {t('Deshacer')}
        </button>
        <button
          className="button secondary"
          disabled={!can || !changed}
          onClick={() => {
            setDraft(base);
            setUndo([]);
            setSelected([]);
          }}
        >
          {t('Restaurar mesa')}
        </button>
      </div>
      <div className="tile-confirm-panel">
        <p role="status">
          {changed
            ? check.reason
              ? problemText(check.reason, s.rules.openingPoints)
              : t('Jugada válida: colocarás {0} fichas.', { '0': check.playedIds.length })
            : t('Selecciona fichas del atril o de la mesa y crea o amplía combinaciones.')}
        </p>
        <div className="board-actions">
          <button
            className="button primary"
            disabled={!can || !!check.reason}
            onClick={() => onAction({ type: 'PLAY_TABLE', sets: safeDraft })}
          >
            {t('Confirmar jugada')}
          </button>
          <button
            className="button secondary"
            disabled={!can}
            onClick={() => onAction({ type: s.poolCount ? 'DRAW' : 'PASS' })}
          >
            {s.poolCount ? t('Robar una ficha y pasar') : t('Pasar sin robar')}
          </button>
        </div>
        <small>
          {t(
            'Tus cambios son un borrador hasta confirmar. Robar o agotar el reloj descarta el borrador.',
          )}
        </small>
      </div>
    </>
  );
  return (
    <BoardFrame
      selectionActive={selected.length > 0}
      onCancelSelection={() => setSelected([])}
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('{0} · {1}', {
            '0': quantity(p.handCount, 'fichas'),
            '1': p.opened ? t('Apertura hecha') : t('Aún sin abrir'),
          }),
        ]),
      )}
      actions={actions}
    >
      <div className="board-topline">
        <span className="eyebrow">
          {t('{0} FICHAS · {1} COMODINES', {
            '0': s.rules.useJokers ? 106 : 104,
            '1': s.rules.useJokers ? 2 : 0,
          })}
        </span>
        <strong>{t('Pozo: {0}', { '0': quantity(s.poolCount, 'fichas') })}</strong>
      </div>
      <div className="tile-opening-status">
        <strong>
          {me.opened
            ? t('Ya puedes reorganizar la mesa.')
            : t('Para abrir necesitas {0} puntos.', { '0': s.rules.openingPoints })}
        </strong>
        <p>
          {me.opened
            ? t(
                'Puedes separar, unir y mover fichas entre combinaciones. Al confirmar, todas deben ser válidas.',
              )
            : t(
                'Prepara uno o más grupos o escaleras con tus fichas. Hasta abrir no puedes usar la mesa.',
              )}
        </p>
        {!me.opened && played.length > 0 && (
          <span>
            {t('Puntos de tu apertura: {0} / {1}', {
              '1': s.rules.openingPoints,
              '0': safeDraft
                .slice(base.length)
                .reduce(
                  (sum, set) =>
                    sum + (analyzeRummyDeFichasSet(set.map((id) => lookup.get(id)!))?.points || 0),
                  0,
                ),
            })}
          </span>
        )}
      </div>
      <section className="number-tile-table" tabIndex={0} aria-label={t('Mesa de Rummy')}>
        <div className="section-row">
          <h2>{t('La mesa')}</h2>
          <span>{quantity(safeDraft.length, 'combinaciones')}</span>
        </div>
        {!safeDraft.length && (
          <p className="tile-table-empty">{t('Las primeras combinaciones empiezan aquí.')}</p>
        )}
        <div className="number-tile-sets">
          {safeDraft.map((set, index) => {
            const analysis = analyzeRummyDeFichasSet(set.map((id) => lookup.get(id)!));
            return (
              <div
                className={`number-tile-set ${analysis ? 'valid-tile-set' : 'invalid-tile-set'}`}
                key={index}
              >
                <div className="tile-set-top">
                  <small>
                    {analysis
                      ? analysis.kind === 'group'
                        ? t('Grupo')
                        : t('Escalera')
                      : t('Combinación incompleta')}{' '}
                    · {index + 1}
                  </small>
                  <button
                    className="tile-reset-group"
                    disabled={!can || !editable(index)}
                    onClick={() => update(safeDraft.filter((_, i) => i !== index))}
                    aria-label={t('Separar combinación {0}', { '0': index + 1 })}
                  >
                    ↶
                  </button>
                </div>
                <div
                  className="tile-set-row"
                  onKeyDown={scrollTiles}
                  tabIndex={0}
                  role="group"
                  aria-label={t('Combinación {0}', { '0': index + 1 })}
                >
                  {set.map((id) => renderTile(lookup.get(id)!, !editable(index)))}
                </div>
                {selected.length > 0 && (
                  <button
                    className="button small secondary"
                    disabled={!can || !editable(index)}
                    onClick={() => move(index)}
                  >
                    {t('Colocar aquí')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {loose.length > 0 && (
          <div className="loose-tiles" role="status">
            <strong>{t('Fichas pendientes de colocar')}</strong>
            <div
              className="tile-set-row"
              onKeyDown={scrollTiles}
              tabIndex={0}
              role="group"
              aria-label={t('Fichas pendientes de colocar')}
            >
              {loose.map((tile) => renderTile(tile))}
            </div>
          </div>
        )}
      </section>

      <section className="tile-rack-section">
        <div className="section-row">
          <h2>
            {t('Tu atril')} · {hand.length}
          </h2>
          <button
            className="button small secondary"
            onClick={() => setSort(sort === 'color' ? 'value' : 'color')}
          >
            {sort === 'color' ? t('Ordenar por número') : t('Ordenar por color')}
          </button>
        </div>
        <div className="number-tile-rack">{hand.map((tile) => renderTile(tile))}</div>
        <button
          className="button small secondary"
          disabled={!can || !rummyMeldOptions(hand).length}
          onClick={suggest}
        >
          {t('Buscar una combinación')}
        </button>
      </section>
    </BoardFrame>
  );
}
