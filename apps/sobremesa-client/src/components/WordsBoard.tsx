import { useState } from 'react';
import {
  analyzeWordsMove,
  letterPoints,
  type WordPlacement,
  type WordsAction,
  type WordsPublicState,
} from 'sobremesa-logic';
import { t, gameText } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import { useBoardMotion } from '../hooks/useBoardMotion';
import '../styles/words.css';
export function WordsBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<WordsPublicState, WordsAction>) {
  const [draft, setDraft] = useState<{
      revision: number;
      tiles: WordPlacement[];
      selected: number | null;
      exchange: number[];
    }>({ revision: -1, tiles: [], selected: null, exchange: [] }),
    active =
      draft.revision === s.revision
        ? draft
        : { revision: s.revision, tiles: [], selected: null, exchange: [] },
    [row, setRow] = useState(6),
    [col, setCol] = useState(6),
    can = !busy && !s.winner && !s.isDraw && s.currentTurnPlayerId === myPlayerId,
    preview = analyzeWordsMove(s, s.hand, active.tiles),
    motionRef = useBoardMotion(s.revision),
    put = (r: number, c: number) => {
      const old = active.tiles.find((p) => p.row === r && p.col === c);
      if (old) {
        setDraft({
          ...active,
          tiles: active.tiles.filter((p) => p !== old),
          selected: old.rackIndex,
        });
        return;
      }
      if (active.selected === null || s.board[r * 11 + c] !== null) return;
      setDraft({
        ...active,
        tiles: [
          ...active.tiles.filter((p) => p.rackIndex !== active.selected),
          { row: r, col: c, rackIndex: active.selected },
        ],
        selected: null,
        exchange: [],
      });
    };
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      motionRef={motionRef}
      values={Object.fromEntries(
        s.players.map((p) => [
          p.id,
          t('{0} puntos · {1} letras', { '0': p.score, '1': p.handCount }),
        ]),
      )}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p>
        {t('Diccionario: {0} · bolsa: {1}', {
          '0': s.language === 'es' ? t('Español') : t('Inglés'),
          '1': s.bagCount,
        })}
      </p>
      <h2>{t('Tu atril privado')}</h2>
      <div className="words-rack">
        {s.hand.map((letter, i) => {
          const placed = active.tiles.some((p) => p.rackIndex === i);
          return (
            <div key={i}>
              <button
                disabled={!can || placed}
                aria-pressed={active.selected === i}
                aria-label={t('Letra {0}, valor {1}', { '0': letter, '1': letterPoints(letter) })}
                onClick={() => setDraft({ ...active, selected: active.selected === i ? null : i })}
              >
                {letter}
                <small>{letterPoints(letter)}</small>
              </button>
              <label>
                <input
                  type="checkbox"
                  disabled={!can || placed || s.bagCount < 7}
                  checked={active.exchange.includes(i)}
                  onChange={() =>
                    setDraft({
                      ...active,
                      exchange: active.exchange.includes(i)
                        ? active.exchange.filter((n) => n !== i)
                        : [...active.exchange, i],
                    })
                  }
                />
                <span className="sr-only">
                  {t('Cambiar letra {0} del puesto {1}', { '0': letter, '1': i + 1 })}
                </span>
              </label>
            </div>
          );
        })}
      </div>
      <p className="board-caption">
        {t('Elige una letra y su casilla. Para retirarla del borrador, pulsa la casilla otra vez.')}
      </p>
      <form
        className="words-coordinates"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            can &&
            Number.isInteger(row) &&
            Number.isInteger(col) &&
            row >= 1 &&
            row <= 11 &&
            col >= 1 &&
            col <= 11
          )
            put(row - 1, col - 1);
        }}
      >
        <label>
          {t('Fila')}
          <input
            type="number"
            min={1}
            max={11}
            value={row}
            onChange={(e) => setRow(Number(e.target.value))}
          />
        </label>
        <label>
          {t('Columna')}
          <input
            type="number"
            min={1}
            max={11}
            value={col}
            onChange={(e) => setCol(Number(e.target.value))}
          />
        </label>
        <button className="button secondary" disabled={!can || active.selected === null}>
          {t('Colocar en coordenadas')}
        </button>
      </form>
      <p role="status">
        {preview
          ? t('Borrador: {0} · {1} puntos antes de validar el diccionario', {
              '0': preview.words.map((w) => w.word).join(', '),
              '1': preview.score,
            })
          : t('Forma palabras conectadas, sin huecos, en una sola fila o columna.')}
      </p>
      <div className="board-actions">
        <button
          className="button primary"
          disabled={!can || !preview}
          onClick={() => onAction({ type: 'PLACE', tiles: active.tiles })}
        >
          {t('Validar y jugar palabras')}
        </button>
        <button
          className="button secondary"
          disabled={!can || !active.tiles.length}
          onClick={() => setDraft({ ...active, tiles: [], selected: null })}
        >
          {t('Vaciar borrador')}
        </button>
        <button
          className="button secondary"
          disabled={!can || !active.exchange.length || active.tiles.length > 0 || s.bagCount < 7}
          onClick={() => onAction({ type: 'EXCHANGE', indices: active.exchange })}
        >
          {t('Cambiar letras marcadas')}
        </button>
        <button
          className="button secondary"
          disabled={!can}
          onClick={() => onAction({ type: 'PASS' })}
        >
          {t('Pasar')}
        </button>
      </div>
      <div
        className="words-scroll"
        tabIndex={0}
        role="group"
        aria-label={t('Tablero de palabras, once filas y once columnas')}
      >
        <div className="words-grid">
          {s.board.map((letter, pos) => {
            const tile = active.tiles.find((p) => p.row * 11 + p.col === pos),
              shown = tile ? s.hand[tile.rackIndex] : letter;
            return (
              <button
                key={pos}
                className={`${tile ? 'draft' : ''} ${pos === 60 ? 'center' : ''}`}
                disabled={!can || letter !== null || (active.selected === null && !tile)}
                aria-label={t('Fila {0}, columna {1}: {2}', {
                  '0': Math.floor(pos / 11) + 1,
                  '1': (pos % 11) + 1,
                  '2': shown ?? t('Vacía'),
                })}
                onClick={() => put(Math.floor(pos / 11), pos % 11)}
              >
                {shown ?? (pos === 60 ? '✦' : '·')}
                {shown && <small>{letterPoints(shown)}</small>}
              </button>
            );
          })}
        </div>
      </div>
      {s.lastWords.length > 0 && (
        <p>
          {t('Últimas palabras: {0}', {
            '0': s.lastWords.map((w) => `${w.word} (${w.score})`).join(', '),
          })}
        </p>
      )}
    </BoardFrame>
  );
}
