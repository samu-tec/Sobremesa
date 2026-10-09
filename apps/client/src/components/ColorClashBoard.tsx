import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Card,
  ColorClashAction,
  ColorClashPublicState,
  PlayableColor,
  RoomInfo,
} from '@games/game-logic';
import { sound } from '../services/audio.js';
import { Trophy, RotateCcw, LogOut, Bot, User, Layers, ArrowRightLeft } from 'lucide-react';
import { AdBannerPlaceholder } from './AdBannerPlaceholder.js';

interface ColorClashBoardProps {
  room: RoomInfo;
  state: ColorClashPublicState;
  myPlayerId: string;
  onAction: (action: ColorClashAction) => void;
  onRestart: () => void;
  onLeave: () => void;
}

const COLOR_CONFIG: Record<
  string,
  { bg: string; border: string; text: string; glow: string; label: string }
> = {
  red: {
    bg: 'bg-red-600',
    border: 'border-red-400',
    text: 'text-white',
    glow: 'rgba(239, 68, 68, 0.5)',
    label: 'Rojo',
  },
  blue: {
    bg: 'bg-blue-600',
    border: 'border-blue-400',
    text: 'text-white',
    glow: 'rgba(59, 130, 246, 0.5)',
    label: 'Azul',
  },
  green: {
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-white',
    glow: 'rgba(16, 185, 129, 0.5)',
    label: 'Verde',
  },
  yellow: {
    bg: 'bg-amber-500',
    border: 'border-amber-300',
    text: 'text-slate-950',
    glow: 'rgba(245, 158, 11, 0.5)',
    label: 'Amarillo',
  },
  wild: {
    bg: 'bg-gradient-to-br from-purple-700 via-pink-600 to-indigo-700',
    border: 'border-pink-300',
    text: 'text-white',
    glow: 'rgba(168, 85, 247, 0.5)',
    label: 'Comodín',
  },
};

export const ColorClashBoard: React.FC<ColorClashBoardProps> = ({
  room,
  state,
  myPlayerId,
  onAction,
  onRestart,
  onLeave,
}) => {
  const [selectedWildCard, setSelectedWildCard] = useState<Card | null>(null);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winner;
  const isGameOver = Boolean(state.winner);
  const isWinner = state.winner === myPlayerId;

  const myPlayer = room.players.find(p => p.id === myPlayerId);
  const winnerPlayer = room.players.find(p => p.id === state.winner);

  // Victory / loss sound effects
  useEffect(() => {
    if (state.winner) {
      if (state.winner === myPlayerId) {
        sound.playWinFanfare();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.55 },
        });
      } else {
        sound.playErrorSound();
      }
    }
  }, [state.winner, myPlayerId]);

  // Turn alert sound
  useEffect(() => {
    if (isMyTurn) {
      sound.playTurnAlert();
    }
  }, [state.currentTurnPlayerId]);

  const isPlayable = (card: Card) => {
    if (!isMyTurn) return false;
    if (card.color === 'wild') return true;
    if (card.color === state.activeColor) return true;
    if (card.value === state.topDiscardCard.value) return true;
    return false;
  };

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) {
      sound.playErrorSound();
      return;
    }

    if (!isPlayable(card)) {
      sound.playErrorSound();
      return;
    }

    if (card.color === 'wild') {
      setSelectedWildCard(card);
    } else {
      sound.playCardSound();
      onAction({
        type: 'PLAY_CARD',
        cardId: card.id,
      });
    }
  };

  const handleChooseWildColor = (chosenColor: PlayableColor) => {
    if (!selectedWildCard) return;
    sound.playCardSound();
    onAction({
      type: 'PLAY_CARD',
      cardId: selectedWildCard.id,
      chosenColor,
    });
    setSelectedWildCard(null);
  };

  const handleDrawCard = () => {
    if (!isMyTurn || state.hasDrawnThisTurn) {
      sound.playErrorSound();
      return;
    }
    sound.playMoveSound();
    onAction({ type: 'DRAW_CARD' });
  };

  const handlePassTurn = () => {
    if (!isMyTurn || !state.hasDrawnThisTurn) {
      sound.playErrorSound();
      return;
    }
    sound.playMoveSound();
    onAction({ type: 'PASS_TURN' });
  };

  const renderCardBadge = (value: Card['value'] | string) => {
    switch (value) {
      case 'skip':
        return '🚫';
      case 'reverse':
        return '🔄';
      case 'draw2':
        return '+2';
      case 'wild':
        return '🎨';
      case 'wild_draw4':
        return '+4';
      default:
        return value;
    }
  };

  return (
    <div className="flex flex-col justify-between w-full max-w-4xl min-h-[100dvh] p-3 sm:p-5 mx-auto select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎴</span>
          <div>
            <h1 className="text-sm font-bold tracking-wide uppercase text-slate-200">Color Clash</h1>
            <span className="text-xs font-mono text-slate-400">Sala: {room.code}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
            <ArrowRightLeft className="w-3 h-3 text-slate-400" />
            <span>{state.turnDirection === 1 ? 'Horario' : 'Antihorario'}</span>
          </div>

          <button
            onClick={onLeave}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 rounded-lg border border-rose-900/60 transition-colors touch-target"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Opponents Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
        {state.opponents.map(opp => {
          const roomPlayer = room.players.find(p => p.id === opp.playerId);
          const isOpponentTurn = state.currentTurnPlayerId === opp.playerId;

          return (
            <div
              key={opp.playerId}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                isOpponentTurn
                  ? 'bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500/20'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs">
                  {opp.isBot ? (
                    <Bot className="w-4 h-4 text-amber-400" />
                  ) : (
                    <User className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {roomPlayer?.name || 'Oponente'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isOpponentTurn ? '● Jugando...' : `${opp.cardCount} cartas`}
                  </div>
                </div>
              </div>

              {/* Cards Count Badge */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-slate-200">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>{opp.cardCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Center Arena: Draw Pile & Discard Pile */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 p-4 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/80 shadow-2xl relative">
        {/* Active Color Banner */}
        <div className="flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 shadow-sm">
          <span className="text-xs text-slate-300">Color activo:</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-3.5 h-3.5 rounded-full shadow-sm ${
                state.activeColor === 'red'
                  ? 'bg-red-500'
                  : state.activeColor === 'blue'
                  ? 'bg-blue-500'
                  : state.activeColor === 'green'
                  ? 'bg-emerald-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-bold capitalize text-slate-200">
              {COLOR_CONFIG[state.activeColor]?.label || state.activeColor}
            </span>
          </div>
        </div>

        {/* Center Cards Layout */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Draw Pile Deck */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleDrawCard}
              disabled={!isMyTurn || state.hasDrawnThisTurn}
              className={`w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 flex flex-col items-center justify-center relative transition-all shadow-xl touch-target ${
                isMyTurn && !state.hasDrawnThisTurn
                  ? 'bg-gradient-to-br from-indigo-800 to-slate-900 border-indigo-400 hover:scale-105 active:scale-95 ring-2 ring-indigo-500/40 cursor-pointer animate-pulse-fast'
                  : 'bg-slate-800 border-slate-700 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="w-12 h-16 sm:w-16 sm:h-20 rounded-lg border border-dashed border-indigo-300/40 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black text-indigo-300">⚡</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-200 mt-1">ROBAR</span>
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              {state.drawPileCount} cartas
            </span>
          </div>

          {/* Top Discard Card */}
          <div className="flex flex-col items-center gap-1.5">
            {state.topDiscardCard && (
              <div
                className={`w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 flex flex-col items-center justify-between p-2 shadow-2xl relative transition-transform transform ${
                  COLOR_CONFIG[state.topDiscardCard.color]?.bg || 'bg-slate-700'
                } ${COLOR_CONFIG[state.topDiscardCard.color]?.border || 'border-slate-500'}`}
                style={{
                  boxShadow: `0 0 25px ${COLOR_CONFIG[state.activeColor]?.glow || 'rgba(0,0,0,0.5)'}`,
                }}
              >
                {/* Corner Value */}
                <div className="w-full flex justify-between text-xs sm:text-sm font-black text-white/90">
                  <span>{renderCardBadge(state.topDiscardCard.value)}</span>
                  <span>{renderCardBadge(state.topDiscardCard.value)}</span>
                </div>

                {/* Center Value */}
                <div className="text-2xl sm:text-4xl font-black text-white drop-shadow-md">
                  {renderCardBadge(state.topDiscardCard.value)}
                </div>

                {/* Bottom Value */}
                <div className="w-full flex justify-between text-xs sm:text-sm font-black text-white/90 rotate-180">
                  <span>{renderCardBadge(state.topDiscardCard.value)}</span>
                  <span>{renderCardBadge(state.topDiscardCard.value)}</span>
                </div>
              </div>
            )}
            <span className="text-[11px] text-slate-400 font-mono">Descarte</span>
          </div>
        </div>

        {/* Action Ticker */}
        {state.lastActionDescription && (
          <div className="mt-4 px-3 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 max-w-sm text-center">
            🔔 {state.lastActionDescription}
          </div>
        )}
      </div>

      {/* Player's Own Hand & Controls */}
      <div className="w-full">
        {/* Turn Status & Pass Button Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200">
              Tu mano ({state.myHand.length})
            </span>
            {isMyTurn && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-bold border border-blue-500/30 animate-pulse">
                ¡Tu Turno!
              </span>
            )}
          </div>

          {state.hasDrawnThisTurn && isMyTurn && (
            <button
              onClick={handlePassTurn}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all touch-target"
            >
              Pasar Turno ⏩
            </button>
          )}
        </div>

        {/* Horizontal Card Deck Ribbon */}
        <div className="w-full overflow-x-auto pb-2 flex gap-2 sm:gap-3 items-center min-h-[110px] px-1">
          {state.myHand.map(card => {
            const playable = isPlayable(card);
            const colorConf = COLOR_CONFIG[card.color] || COLOR_CONFIG.wild;

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card)}
                disabled={!isMyTurn || !playable}
                className={`flex-shrink-0 w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col justify-between p-1.5 sm:p-2 shadow-lg transition-all transform touch-target ${
                  colorConf.bg
                } ${colorConf.border} ${
                  playable
                    ? 'hover:-translate-y-2 hover:shadow-2xl cursor-pointer ring-2 ring-white/50 active:scale-95'
                    : 'opacity-40 grayscale-[40%] cursor-not-allowed'
                }`}
              >
                <div className="w-full flex justify-between text-[10px] sm:text-xs font-black text-white/90">
                  <span>{renderCardBadge(card.value)}</span>
                  <span>{renderCardBadge(card.value)}</span>
                </div>

                <div className="text-lg sm:text-2xl font-black text-white text-center drop-shadow-md">
                  {renderCardBadge(card.value)}
                </div>

                <div className="w-full flex justify-between text-[10px] sm:text-xs font-black text-white/90 rotate-180">
                  <span>{renderCardBadge(card.value)}</span>
                  <span>{renderCardBadge(card.value)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wild Color Selection Modal */}
      {selectedWildCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-center">
            <h3 className="text-base font-bold text-white mb-2">
              Elige el color para continuar:
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Todos los jugadores deberán responder a este color.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['red', 'blue', 'green', 'yellow'] as PlayableColor[]).map(color => (
                <button
                  key={color}
                  onClick={() => handleChooseWildColor(color)}
                  className={`py-4 rounded-xl font-black text-sm uppercase shadow-lg transition-transform active:scale-95 touch-target ${
                    COLOR_CONFIG[color].bg
                  } ${COLOR_CONFIG[color].text}`}
                >
                  {COLOR_CONFIG[color].label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedWildCard(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {isWinner ? (
                <>
                  <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
                  <span className="text-xl font-black text-yellow-400 tracking-wider">
                    ¡VICTORIA!
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl">💀</span>
                  <span className="text-xl font-black text-rose-400 tracking-wider">
                    PARTIDA TERMINADA
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-slate-300 mb-6">
              {isWinner
                ? '¡Te has quedado sin cartas y te coronas campeón!'
                : `${winnerPlayer?.name || 'Un rival'} se ha quedado sin cartas y gana la partida.`}
            </p>

            {myPlayer?.isHost ? (
              <button
                onClick={onRestart}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 touch-target mb-3"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jugar Otra Vez</span>
              </button>
            ) : (
              <div className="text-xs text-slate-400 italic mb-4">
                Esperando a que el anfitrión inicie otra partida...
              </div>
            )}

            <button
              onClick={onLeave}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Volver al Menú Principal
            </button>

            {/* Monetization / Rewarded Ad Hook */}
            <AdBannerPlaceholder position="modal" label="Espacio publicitario post-partida" />
          </div>
        </div>
      )}

      {/* Subtle bottom banner */}
      <div className="mt-2">
        <AdBannerPlaceholder label="Color Clash Multijugador en Línea" />
      </div>
    </div>
  );
};
