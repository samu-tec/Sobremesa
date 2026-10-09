import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RoomInfo, TicTacToeAction, TicTacToePublicState } from '@games/game-logic';
import { sound } from '../services/audio.js';
import { Trophy, RotateCcw, LogOut, Bot, User } from 'lucide-react';
import { AdBannerPlaceholder } from './AdBannerPlaceholder.js';

interface TicTacToeBoardProps {
  room: RoomInfo;
  state: TicTacToePublicState;
  myPlayerId: string;
  onAction: (action: TicTacToeAction) => void;
  onRestart: () => void;
  onLeave: () => void;
}

export const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  room,
  state,
  myPlayerId,
  onAction,
  onRestart,
  onLeave,
}) => {
  const myPlayer = room.players.find(p => p.id === myPlayerId);
  const myStatePlayer = state.players.find(p => p.id === myPlayerId);
  const mySymbol = myStatePlayer?.symbol || 'X';

  const opponentStatePlayer = state.players.find(p => p.id !== myPlayerId);
  const opponentRoomPlayer = room.players.find(p => p.id === opponentStatePlayer?.id);

  const isMyTurn = state.currentTurn === myPlayerId && !state.winner && !state.isDraw;
  const isGameOver = Boolean(state.winner || state.isDraw);
  const isWinner = state.winner === myPlayerId;

  // Sound & Confetti on game end
  useEffect(() => {
    if (state.winner) {
      if (state.winner === myPlayerId) {
        sound.playWinFanfare();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        sound.playErrorSound();
      }
    } else if (state.isDraw) {
      sound.playMoveSound();
    }
  }, [state.winner, state.isDraw, myPlayerId]);

  // Turn alert sound
  useEffect(() => {
    if (isMyTurn) {
      sound.playTurnAlert();
    }
  }, [state.currentTurn]);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || state.board[index] !== null) {
      sound.playErrorSound();
      return;
    }
    sound.playMoveSound();
    onAction({ type: 'MAKE_MOVE', index });
  };

  const getCellHighlight = (index: number) => {
    if (state.winningLine && state.winningLine.includes(index)) {
      return 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400 scale-[1.03]';
    }
    return 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-700/80 text-white';
  };

  return (
    <div className="flex flex-col items-center justify-between w-full max-w-lg min-h-[100dvh] p-4 mx-auto select-none">
      {/* Top Header / Player Status */}
      <div className="w-full">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300">3 en Raya</h2>
              <span className="text-xs font-mono text-slate-400">Sala: {room.code}</span>
            </div>
          </div>
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg border border-rose-900/60 transition-colors touch-target"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>

        {/* Players Card Indicator */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Me */}
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
              isMyTurn
                ? 'bg-blue-950/40 border-blue-500/80 ring-2 ring-blue-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-lg border border-blue-500/30">
              {mySymbol}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold truncate text-slate-200">
                  {myPlayer?.name || 'Tú'} (Tú)
                </span>
              </div>
              <span className="text-[11px] text-blue-400 font-medium">
                {isMyTurn ? '● Tu turno' : 'Esperando...'}
              </span>
            </div>
          </div>

          {/* Opponent */}
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
              !isMyTurn && !isGameOver
                ? 'bg-amber-950/40 border-amber-500/80 ring-2 ring-amber-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/30">
              {mySymbol === 'X' ? 'O' : 'X'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {opponentRoomPlayer?.isBot ? (
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="text-xs font-bold truncate text-slate-200">
                  {opponentRoomPlayer?.name || 'Rival'}
                </span>
              </div>
              <span className="text-[11px] text-amber-400 font-medium">
                {!isMyTurn && !isGameOver ? '● Pensando...' : 'En espera'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3x3 Grid */}
      <div className="w-full max-w-[340px] aspect-square p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center">
        <div className="grid grid-cols-3 gap-2.5 w-full h-full">
          {state.board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={!isMyTurn || cell !== null}
              className={`rounded-xl border flex items-center justify-center text-4xl sm:text-5xl font-black transition-all shadow-md touch-target ${getCellHighlight(
                index
              )} ${
                isMyTurn && cell === null
                  ? 'hover:scale-[1.02] active:scale-95 cursor-pointer ring-1 ring-blue-500/30'
                  : 'cursor-default'
              }`}
            >
              {cell && (
                <span
                  className={
                    cell === 'X'
                      ? 'text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                      : 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  }
                >
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Status & Game Over Banner */}
      <div className="w-full mt-4">
        {isGameOver ? (
          <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-center shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 mb-2">
              {isWinner ? (
                <>
                  <Trophy className="w-6 h-6 text-yellow-400 animate-bounce" />
                  <span className="text-lg font-black text-yellow-400 tracking-wide">¡VICTORIA!</span>
                </>
              ) : state.isDraw ? (
                <>
                  <span className="text-2xl">🤝</span>
                  <span className="text-lg font-black text-slate-200">¡EMPATE!</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">💀</span>
                  <span className="text-lg font-black text-rose-400">DERROTA</span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-4">
              {isWinner
                ? '¡Has ganado la partida!'
                : state.isDraw
                ? 'Tablero completo sin alineación ganadora.'
                : `${opponentRoomPlayer?.name || 'El rival'} se lleva la victoria.`}
            </p>

            {myPlayer?.isHost ? (
              <button
                onClick={onRestart}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 touch-target"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jugar Revancha</span>
              </button>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Esperando a que el anfitrión inicie la revancha...
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
            {isMyTurn ? (
              <span className="text-blue-400 font-bold animate-pulse">
                👉 Selecciona una casilla libre para tu jugada
              </span>
            ) : (
              <span>⏳ Esperando la jugada de tu oponente...</span>
            )}
          </div>
        )}

        {/* Monetization / Ad Hook Placeholder */}
        <AdBannerPlaceholder label="Patrocinador oficial de 3 en Raya" />
      </div>
    </div>
  );
};
