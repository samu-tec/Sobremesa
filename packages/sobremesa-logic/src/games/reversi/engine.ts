import { message as msg, type GameText } from '../../messages.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
export interface ReversiState {
  board: (string | null)[];
  players: { id: string; isBot: boolean }[];
  currentTurnPlayerId: string;
  winner: string | null;
  isDraw: boolean;
  legalMoves: number[];
  lastMove: number | null;
  message: GameText;
}
export type ReversiAction = { type: 'PLACE'; index: number };
export function reversiFlips(board: ReversiState['board'], id: string, index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index]) return [];
  const row = Math.floor(index / 8),
    col = index % 8,
    flips: number[] = [];
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]) {
    let r = row + dr,
      c = col + dc;
    const line: number[] = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] && board[r * 8 + c] !== id) {
      line.push(r * 8 + c);
      r += dr;
      c += dc;
    }
    if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === id)
      flips.push(...line);
  }
  return flips;
}
const moves = (board: ReversiState['board'], id: string) =>
  board.flatMap((_, i) => (reversiFlips(board, id, i).length ? [i] : []));
export class ReversiEngine implements IGameEngine<ReversiState, ReversiAction, ReversiState> {
  initGame(players: { id: string; isBot: boolean }[]): ReversiState {
    if (players.length !== 2) throw new Error('Se necesitan dos jugadores.');
    const board: ReversiState['board'] = Array(64).fill(null);
    board[27] = board[36] = players[1].id;
    board[28] = board[35] = players[0].id;
    return {
      board,
      players: players.map((p) => ({ ...p })),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      legalMoves: moves(board, players[0].id),
      lastMove: null,
      message: msg('Las fichas oscuras empiezan.'),
    };
  }
  validateAction(state: ReversiState, id: string, action: ReversiAction): boolean {
    if (!action || typeof action !== 'object' || Array.isArray(action)) return false;
    return (
      !!action &&
      action.type === 'PLACE' &&
      !state.winner &&
      !state.isDraw &&
      state.currentTurnPlayerId === id &&
      reversiFlips(state.board, id, action.index).length > 0
    );
  }
  applyAction(state: ReversiState, id: string, action: ReversiAction): ReversiState {
    if (!this.validateAction(state, id, action)) return state;
    const board = [...state.board];
    const flips = reversiFlips(board, id, action.index);
    for (const index of [...flips, action.index]) board[index] = id;
    const rival = state.players.find((p) => p.id !== id)!.id;
    let legalMoves = moves(board, rival),
      nextId = rival,
      message = msg('Fichas cambiadas: {0}.', flips.length);
    if (!legalMoves.length) {
      legalMoves = moves(board, id);
      nextId = id;
      message = msg('Tu rival no tiene movimientos y pasa automáticamente.');
    }
    let winner: string | null = null,
      isDraw = false;
    if (!legalMoves.length) {
      const mine = board.filter((v) => v === id).length,
        theirs = board.filter((v) => v === rival).length;
      winner = mine === theirs ? null : mine > theirs ? id : rival;
      isDraw = mine === theirs;
      message = msg('Ya no hay movimientos. La partida ha terminado.');
    }
    return {
      ...state,
      board,
      currentTurnPlayerId: nextId,
      legalMoves,
      winner,
      isDraw,
      lastMove: action.index,
      message,
    };
  }
  getSanitizedState(state: ReversiState): ReversiState {
    return structuredClone(state);
  }
  checkWinner(state: ReversiState): string | null {
    return state.winner;
  }
  forfeitPlayer(state: ReversiState, id: string): ReversiState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    return {
      ...state,
      winner: state.players.find((p) => p.id !== id)!.id,
      message: msg('El rival abandonó la partida.'),
    };
  }
  getBotAction(state: ReversiState, id: string): ReversiAction | null {
    if (
      state.winner ||
      state.isDraw ||
      state.currentTurnPlayerId !== id ||
      !state.legalMoves.length
    )
      return null;
    const corners = [0, 7, 56, 63],
      danger = [1, 8, 9, 6, 14, 15, 48, 49, 57, 54, 55, 62];
    const rival = state.players.find((p) => p.id !== id)!.id;
    const scored = state.legalMoves
      .map((index) => {
        const next = this.applyAction(state, id, { type: 'PLACE', index });
        const mobility = moves(next.board, rival).length;
        const score =
          (corners.includes(index) ? 1000 : 0) -
          (danger.includes(index) ? 80 : 0) -
          mobility * 5 +
          reversiFlips(state.board, id, index).length;
        return { index, score };
      })
      .sort((a, b) => b.score - a.score);
    return { type: 'PLACE', index: scored[0].index };
  }
}
