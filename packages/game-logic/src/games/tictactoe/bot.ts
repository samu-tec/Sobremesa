import { TicTacToeBoard, TicTacToeCell, TicTacToeSymbol } from './types.js';

const WINNING_COMBINATIONS: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkBoardWinner(board: TicTacToeBoard): { winnerSymbol: TicTacToeSymbol | null; line: [number, number, number] | null } {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winnerSymbol: board[a] as TicTacToeSymbol, line: combo };
    }
  }
  return { winnerSymbol: null, line: null };
}

export function isBoardFull(board: TicTacToeBoard): boolean {
  return board.every(cell => cell !== null);
}

/**
 * Minimax algorithm to determine the optimal move for a Tic-Tac-Toe bot.
 */
export function getBestTicTacToeMove(board: TicTacToeBoard, botSymbol: TicTacToeSymbol): number {
  const opponentSymbol: TicTacToeSymbol = botSymbol === 'X' ? 'O' : 'X';

  // If opening move and board is empty, pick center or random corner for natural play
  const emptyIndices = board.map((val, idx) => (val === null ? idx : null)).filter((idx): idx is number => idx !== null);
  if (emptyIndices.length === 9) {
    return 4; // center
  }

  let bestScore = -Infinity;
  let bestMove = emptyIndices[0];

  for (const move of emptyIndices) {
    board[move] = botSymbol;
    const score = minimax(board, 0, false, botSymbol, opponentSymbol);
    board[move] = null; // undo

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  board: TicTacToeBoard,
  depth: number,
  isMaximizing: boolean,
  botSymbol: TicTacToeSymbol,
  opponentSymbol: TicTacToeSymbol
): number {
  const { winnerSymbol } = checkBoardWinner(board);
  if (winnerSymbol === botSymbol) return 10 - depth;
  if (winnerSymbol === opponentSymbol) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = botSymbol;
        const evaluation = minimax(board, depth + 1, false, botSymbol, opponentSymbol);
        board[i] = null;
        maxEval = Math.max(maxEval, evaluation);
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = opponentSymbol;
        const evaluation = minimax(board, depth + 1, true, botSymbol, opponentSymbol);
        board[i] = null;
        minEval = Math.min(minEval, evaluation);
      }
    }
    return minEval;
  }
}
