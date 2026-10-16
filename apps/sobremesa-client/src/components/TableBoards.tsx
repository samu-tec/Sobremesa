import { getGame, t, gameText } from '../i18n';
import {
  type TicTacToeState,
  type TicTacToeAction,
  type Connect4State,
  type Connect4Action,
  type ReversiState,
  type ReversiAction,
  type PigState,
  type PigAction,
} from 'sobremesa-logic';
import { ArrowDown, Circle, X, Dices, Download } from 'lucide-react';
import { DiceFace, GameTip, PlayersPanel, type BoardProps } from '../ui/GameLayout';
type State = TicTacToeState | Connect4State | ReversiState | PigState;
type Action = TicTacToeAction | Connect4Action | ReversiAction | PigAction;
export function TableBoards({
  room,
  state,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<State, Action>) {
  const game = getGame(room.gameType),
    turn = 'currentTurn' in state ? state.currentTurn : state.currentTurnPlayerId;
  const canPlay =
    turn === myPlayerId && !state.winner && !('isDraw' in state && state.isDraw) && !busy;
  const values: Record<string, string> = {};
  if (room.gameType === 'tictactoe')
    (state as TicTacToeState).players.forEach((p) => (values[p.id] = p.symbol));
  if (room.gameType === 'connect4')
    (state as Connect4State).players.forEach(
      (p, i) => (values[p.id] = i === 0 ? t('Coral') : t('Mostaza')),
    );
  if (room.gameType === 'reversi')
    (state as ReversiState).players.forEach(
      (p) =>
        (values[p.id] = t('{0} fichas', {
          '0': (state as ReversiState).board.filter((v) => v === p.id).length,
        })),
    );
  if (room.gameType === 'pig')
    (state as PigState).players.forEach((p) => (values[p.id] = `${p.score} / 100`));
  return (
    <div className="table-layout">
      <section className={`panel play-area play-${room.gameType}`}>
        {room.gameType === 'tictactoe' &&
          (() => {
            const s = state as TicTacToeState;
            return (
              <>
                <p className="board-instruction">
                  {t('Tres símbolos. Una línea. Tu próxima jugada.')}
                </p>
                <div className="ttt-board" role="group" aria-label={t('Tablero de Tres en Raya')}>
                  {s.board.map((cell, index) => (
                    <button
                      key={index}
                      disabled={!canPlay || !!cell}
                      className={`${cell === 'X' ? 'cell-x' : 'cell-o'} ${s.winningLine?.includes(index) ? 'winning-cell' : ''}`}
                      aria-label={t('Fila {0}, columna {1}: {2}', {
                        '0': Math.floor(index / 3) + 1,
                        '1': (index % 3) + 1,
                        '2': cell || t('vacía'),
                      })}
                      onClick={() => onAction({ type: 'MAKE_MOVE', index })}
                    >
                      {cell === 'X' ? (
                        <X size={54} />
                      ) : cell === 'O' ? (
                        <Circle size={45} />
                      ) : (
                        <span className="empty-cell-dot" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="board-caption">
                  {canPlay
                    ? t('Elige una casilla libre.')
                    : t('La siguiente jugada está en manos de tu rival.')}
                </p>
              </>
            );
          })()}
        {room.gameType === 'connect4' &&
          (() => {
            const s = state as Connect4State;
            return (
              <>
                <p className="board-instruction">{t('Una ficha puede cambiarlo todo.')}</p>
                <div className="connect-board-wrap">
                  <div className="column-controls">
                    {Array.from({ length: 7 }, (_, column) => (
                      <button
                        key={column}
                        disabled={!canPlay || !!s.board[column]}
                        onClick={() => onAction({ type: 'DROP', column })}
                        aria-label={t('Dejar caer ficha en columna {0}', { '0': column + 1 })}
                      >
                        <ArrowDown size={23} />
                      </button>
                    ))}
                  </div>
                  <div
                    className="connect-board"
                    role="group"
                    aria-label={t('Tablero de Cuatro en Línea')}
                  >
                    {s.board.map((id, index) => (
                      <div
                        key={index}
                        role="img"
                        aria-label={t('Fila {0}, columna {1}: {2}', {
                          '0': Math.floor(index / 7) + 1,
                          '1': (index % 7) + 1,
                          '2': id
                            ? `ficha de ${room.players.find((p) => p.id === id)?.name}`
                            : 'vacía',
                        })}
                        className={`connect-hole ${id ? `disc-${s.players.findIndex((p) => p.id === id)}` : ''} ${s.winningLine.includes(index) ? 'winning-disc' : ''} ${s.lastMove === index ? 'last-disc' : ''}`}
                      >
                        <span />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="board-caption">{t('Pulsa una flecha para dejar caer tu ficha.')}</p>
              </>
            );
          })()}
        {room.gameType === 'reversi' &&
          (() => {
            const s = state as ReversiState;
            return (
              <>
                <p className="board-instruction" aria-live="polite">
                  {gameText(s.message)}
                </p>
                <div className="reversi-board" role="group" aria-label={t('Tablero de Reversi')}>
                  {s.board.map((id, index) => (
                    <button
                      key={index}
                      disabled={!canPlay || !s.legalMoves.includes(index)}
                      aria-label={t('Fila {0}, columna {1}: {2}', {
                        '0': Math.floor(index / 8) + 1,
                        '1': (index % 8) + 1,
                        '2': id
                          ? s.players[0].id === id
                            ? t('oscura')
                            : t('clara')
                          : s.legalMoves.includes(index)
                            ? 'jugada válida'
                            : 'vacía',
                      })}
                      className={`${id ? `reversi-disc-${s.players.findIndex((p) => p.id === id)}` : ''} ${s.lastMove === index ? 'last-move' : ''}`}
                      onClick={() => onAction({ type: 'PLACE', index })}
                    >
                      {id ? <span /> : canPlay && s.legalMoves.includes(index) ? <i /> : null}
                    </button>
                  ))}
                </div>
                <p className="board-caption">
                  {t('Los puntos señalan dónde puedes colocar una ficha.')}
                </p>
              </>
            );
          })()}
        {room.gameType === 'pig' &&
          (() => {
            const s = state as PigState;
            return (
              <>
                <span className="eyebrow">{t('¿TE ATREVES CON OTRA?')}</span>
                <div className="pig-dice">
                  <DiceFace value={s.lastRoll || 1} large />
                </div>
                <div className="turn-total">
                  <span>{t('Puntos de este turno')}</span>
                  <strong>{s.turnTotal}</strong>
                  <small>{t('Aún sin guardar')}</small>
                </div>
                <p className="board-instruction" aria-live="polite">
                  {gameText(s.message)}
                </p>
                <div className="pig-actions">
                  <button
                    className="button primary"
                    disabled={!canPlay}
                    onClick={() => onAction({ type: 'ROLL' })}
                  >
                    <Dices size={19} /> {t('Tirar dado')}{' '}
                  </button>
                  <button
                    className="button secondary"
                    disabled={!canPlay || s.turnTotal === 0}
                    onClick={() => onAction({ type: 'HOLD' })}
                  >
                    <Download size={18} /> {t('Guardar')} {s.turnTotal > 0 ? s.turnTotal : ''}
                  </button>
                </div>
                <div className="score-tracks">
                  {s.players.map((p, i) => (
                    <div key={p.id}>
                      <div>
                        <span>
                          <i className={`color-${i}`} />
                          {room.players.find((v) => v.id === p.id)?.name}
                        </span>
                        <strong>
                          {p.score}
                          <small> / 100</small>
                        </strong>
                      </div>
                      <progress
                        value={p.score}
                        max={100}
                        aria-label={t('Puntos de {0}', {
                          '0': room.players.find((v) => v.id === p.id)?.name,
                        })}
                      />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
      </section>
      <aside className="table-sidebar">
        <PlayersPanel room={room} myPlayerId={myPlayerId} currentTurn={turn} values={values} />
        <GameTip text={game.tip} />
        <div className="game-mini-rules">
          <span className="eyebrow">{t('EL OBJETIVO')}</span>
          <p>
            {game.id === 'reversi'
              ? t('Termina con más fichas de tu color.')
              : game.id === 'connect4'
                ? t('Conecta cuatro fichas antes que tu rival.')
                : game.id === 'tictactoe'
                  ? t('Completa una fila, columna o diagonal.')
                  : t('Guarda 100 puntos antes que el resto.')}
          </p>
        </div>
      </aside>
    </div>
  );
}
