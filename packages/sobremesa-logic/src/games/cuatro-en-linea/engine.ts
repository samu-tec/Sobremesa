import type { IGameEngine } from '../../engine/IGameEngine.js';

export interface CuatroEnLineaState {
  board: (string | null)[];
  players: { id: string; isBot: boolean }[];
  currentTurnPlayerId: string;
  winner: string | null;
  isDraw: boolean;
  winningLine: number[];
  lastMove: number | null;
}
export type CuatroEnLineaAction = { type: 'DROP'; column: number };

function landing(board: CuatroEnLineaState['board'], column: number): number {
  for (let row = 5; row >= 0; row--) if (!board[row * 7 + column]) return row * 7 + column;
  return -1;
}
function winningLine(board: CuatroEnLineaState['board']): number[] {
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 7; col++) {
      const id = board[row * 7 + col];
      if (!id) continue;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        const endRow = row + dr * 3,
          endCol = col + dc * 3;
        if (endRow < 0 || endRow > 5 || endCol < 0 || endCol > 6) continue;
        const line = Array.from({ length: 4 }, (_, i) => (row + dr * i) * 7 + col + dc * i);
        if (line.every((index) => board[index] === id)) return line;
      }
    }
  return [];
}

export class CuatroEnLineaEngine implements IGameEngine<
  CuatroEnLineaState,
  CuatroEnLineaAction,
  CuatroEnLineaState
> {
  initGame(players: { id: string; isBot: boolean }[]): CuatroEnLineaState {
    if (players.length !== 2) throw new Error('Se necesitan dos jugadores.');
    return {
      board: Array(42).fill(null),
      players: players.map((p) => ({ ...p })),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      winningLine: [],
      lastMove: null,
    };
  }
  validateAction(state: CuatroEnLineaState, id: string, action: CuatroEnLineaAction): boolean {
    return (
      !!action &&
      action.type === 'DROP' &&
      !state.winner &&
      !state.isDraw &&
      state.currentTurnPlayerId === id &&
      Number.isInteger(action.column) &&
      action.column >= 0 &&
      action.column < 7 &&
      landing(state.board, action.column) >= 0
    );
  }
  applyAction(
    state: CuatroEnLineaState,
    id: string,
    action: CuatroEnLineaAction,
  ): CuatroEnLineaState {
    const board = [...state.board],
      index = landing(board, action.column);
    board[index] = id;
    const line = winningLine(board);
    return {
      ...state,
      board,
      lastMove: index,
      winningLine: line,
      winner: line.length ? id : null,
      isDraw: !line.length && board.every(Boolean),
      currentTurnPlayerId: state.players.find((p) => p.id !== id)!.id,
    };
  }
  getSanitizedState(state: CuatroEnLineaState): CuatroEnLineaState {
    return structuredClone(state);
  }
  checkWinner(state: CuatroEnLineaState): string | null {
    return state.winner;
  }
  forfeitPlayer(state: CuatroEnLineaState, id: string): CuatroEnLineaState {
    return { ...state, winner: state.players.find((p) => p.id !== id)!.id };
  }
  getBotAction(state: CuatroEnLineaState, id: string): CuatroEnLineaAction | null {
    if (state.winner || state.isDraw || state.currentTurnPlayerId !== id) return null;
    const rival = state.players.find((p) => p.id !== id)!.id;
    const columns = [3, 2, 4, 1, 5, 0, 6].filter((col) => landing(state.board, col) >= 0);
    // Immediate wins and forced blocks, then a bounded minimax search.
    for (const player of [id, rival])
      for (const column of columns) {
        const board = [...state.board];
        board[landing(board, column)] = player;
        if (winningLine(board).length) return { type: 'DROP', column };
      }
    const evaluate = (
      board: CuatroEnLineaState['board'],
      depth: number,
      maximizing: boolean,
      alpha: number,
      beta: number,
    ): number => {
      const line = winningLine(board);
      if (line.length) return board[line[0]] === id ? 10000 + depth : -10000 - depth;
      const moves = [3, 2, 4, 1, 5, 0, 6].filter((c) => landing(board, c) >= 0);
      if (!moves.length) return 0;
      if (!depth)
        return board.reduce<number>(
          (score, value, index) =>
            score + (index % 7 === 3 ? (value === id ? 3 : value === rival ? -3 : 0) : 0),
          0,
        );
      let best = maximizing ? -Infinity : Infinity;
      for (const column of moves) {
        const next = [...board];
        next[landing(next, column)] = maximizing ? id : rival;
        const score = evaluate(next, depth - 1, !maximizing, alpha, beta);
        best = maximizing ? Math.max(best, score) : Math.min(best, score);
        if (maximizing) alpha = Math.max(alpha, best);
        else beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    };
    let best = -Infinity,
      choice = columns[0];
    for (const column of columns) {
      const board = [...state.board];
      board[landing(board, column)] = id;
      const score = evaluate(board, 3, false, -Infinity, Infinity);
      if (score > best) {
        best = score;
        choice = column;
      }
    }
    return { type: 'DROP', column: choice };
  }
}
