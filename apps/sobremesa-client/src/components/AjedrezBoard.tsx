import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { BoardFrame, moveBoardFocus, type BoardProps } from '../ui/GameLayout';
import { Modal } from '../ui/Modal';
import { useBoardMotion } from '../hooks/useBoardMotion';
import type { AjedrezPublicState, AjedrezAction } from 'sobremesa-logic';
const chessGlyphs: Record<string, string> = {
  wk: '♔',
  wq: '♕',
  wr: '♖',
  wb: '♗',
  wn: '♘',
  wp: '♙',
  bk: '♚',
  bq: '♛',
  br: '♜',
  bb: '♝',
  bn: '♞',
  bp: '♟',
};
const pieceName = (p: string) =>
  ({ p: t('Peón'), n: t('Caballo'), b: t('Alfil'), r: t('Torre'), q: t('Dama'), k: t('Rey') })[p];
export function AjedrezBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<AjedrezPublicState, AjedrezAction>) {
  const [selected, setSelected] = useState<string | null>(null),
    [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null),
    [resign, setResign] = useState(false);
  const side = s.players.findIndex((p) => p.id === myPlayerId),
    can = s.currentTurnPlayerId === myPlayerId && !s.winner && !s.isDraw && !busy;
  useEffect(() => {
    setSelected(null);
    setPromotion(null);
  }, [s.fen]);
  const motionRef = useBoardMotion(s.history.length, {
    travel: s.lastMove
      ? [
          { from: s.lastMove.from, to: s.lastMove.to },
          ...(s.lastMove.rookFrom ? [{ from: s.lastMove.rookFrom, to: s.lastMove.rookTo! }] : []),
        ]
      : [],
  });
  const squares = side === 1 ? [...s.board].reverse() : s.board;
  const choose = (square: string) => {
    const moves = s.legalMoves.filter((m) => m.from === selected && m.to === square);
    if (moves.length) {
      if (moves.some((m) => m.promotion)) setPromotion({ from: selected!, to: square });
      else onAction({ type: 'MOVE', from: selected!, to: square });
    } else {
      const p = s.board.find((p) => p?.square === square);
      setSelected(square !== selected && p && p.color === (side === 0 ? 'w' : 'b') ? square : null);
    }
  };
  const actions = (
    <>
      <div className="board-actions">
        {s.canClaimDraw && (
          <button
            className="button primary"
            disabled={!can}
            onClick={() => onAction({ type: 'CLAIM_DRAW' })}
          >
            {t('Reclamar tablas')}
          </button>
        )}
        <button
          className="button secondary"
          disabled={!can || !!s.drawOffer}
          onClick={() => onAction({ type: 'OFFER_DRAW' })}
        >
          {t('Ofrecer tablas')}
        </button>
        <button
          className="button secondary"
          disabled={busy || !!s.winner || s.isDraw}
          onClick={() => setResign(true)}
        >
          {t('Rendirse')}
        </button>
      </div>
      {resign && (
        <Modal title={t('¿Quieres rendirte?')} onClose={() => setResign(false)}>
          <p>{t('Tu rival ganará esta partida.')}</p>
          <div className="board-actions">
            <button className="button secondary" onClick={() => setResign(false)}>
              {t('Seguir jugando')}
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => {
                setResign(false);
                onAction({ type: 'RESIGN' });
              }}
            >
              {t('Rendirse')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
  return (
    <BoardFrame
      selectionActive={selected !== null}
      onCancelSelection={() => setSelected(null)}
      motionRef={motionRef}
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(
        s.players.map((p, i) => [p.id, i === 0 ? t('Blancas') : t('Negras')]),
      )}
      sidebarDetails={{
        label: `${t('Historial de jugadas')} · ${s.history.length}`,
        title: t('Historial de jugadas'),
        content: (
          <div className="move-history">
            <ol>
              {Array.from({ length: Math.ceil(s.history.length / 2) }, (_, i) => (
                <li key={i}>{s.history.slice(i * 2, i * 2 + 2).join(' · ')}</li>
              ))}
            </ol>
          </div>
        ),
      }}
      actions={actions}
    >
      <div className="board-topline">
        <span className="eyebrow">
          {side === 0 ? t('JUEGAS CON BLANCAS') : t('JUEGAS CON NEGRAS')}
        </span>
        <span role="status">
          {s.inCheck ? t('¡Jaque!') : t('Selecciona una pieza y su destino.')}
        </span>
      </div>
      <div
        className="square-board chess-board"
        onKeyDown={(event) => moveBoardFocus(event, 8)}
        role="group"
        aria-label={t('Tablero de Ajedrez')}
      >
        {squares.map((p, index) => {
          const original = side === 1 ? 63 - index : index,
            square = `${'abcdefgh'[original % 8]}${8 - Math.floor(original / 8)}`,
            legal = s.legalMoves.some((m) => m.from === selected && m.to === square);
          return (
            <button
              key={square}
              data-cell={square}
              className={`${(Math.floor(original / 8) + (original % 8)) % 2 ? 'dark-square' : 'light-square'} ${selected === square ? 'selected-square' : ''} ${legal ? 'legal-square' : ''}`}
              disabled={!can}
              aria-label={`${square}: ${p ? `${p.color === 'w' ? t('Blancas') : t('Negras')} ${pieceName(p.type)}` : t('vacía')}${legal ? `, ${t('jugada válida')}` : ''}`}
              aria-pressed={selected === square}
              onClick={() => choose(square)}
            >
              <small className="square-coordinate">{square}</small>
              {p ? (
                <span className={`motion-piece chess-piece piece-${p.color}`}>
                  {chessGlyphs[p.color + p.type]}
                </span>
              ) : legal ? (
                <i className="move-dot" />
              ) : null}
            </button>
          );
        })}
      </div>
      {s.drawOffer && s.drawOffer !== myPlayerId && (
        <div className="round-notice">
          <p>{t('Tu rival ofrece tablas.')}</p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => onAction({ type: 'ACCEPT_DRAW' })}
          >
            {t('Aceptar tablas')}
          </button>
        </div>
      )}

      {promotion && (
        <Modal title={t('Elige tu promoción')} onClose={() => setPromotion(null)}>
          <div className="promotion-options">
            {['q', 'r', 'b', 'n'].map((p) => (
              <button
                className="button secondary"
                key={p}
                disabled={busy}
                onClick={() => onAction({ type: 'MOVE', ...promotion, promotion: p })}
              >
                <span>{chessGlyphs[(side === 0 ? 'w' : 'b') + p]}</span>
                {pieceName(p)}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </BoardFrame>
  );
}
