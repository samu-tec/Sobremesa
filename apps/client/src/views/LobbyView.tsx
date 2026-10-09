import React, { useState } from 'react';
import { GameType } from '@games/game-logic';
import { Sparkles, Users, Bot, Gamepad2, Play, UserCircle, Edit3, Check } from 'lucide-react';
import { AdBannerPlaceholder } from '../components/AdBannerPlaceholder.js';

interface LobbyViewProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onCreateRoom: (gameType: GameType) => void;
  onJoinRoom: (roomCode: string) => void;
  onQuickPlayVsBot: (gameType: GameType) => void;
  isConnecting: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  playerName,
  onUpdatePlayerName,
  onCreateRoom,
  onJoinRoom,
  onQuickPlayVsBot,
  isConnecting,
  errorMessage,
  onClearError,
}) => {
  const [selectedGame, setSelectedGame] = useState<GameType>('colorclash');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdatePlayerName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCodeInput.trim().length === 5) {
      onJoinRoom(roomCodeInput.trim().toUpperCase());
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[100dvh] w-full max-w-lg mx-auto p-4 select-none">
      {/* Top Header */}
      <div className="w-full">
        <header className="flex items-center justify-between py-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-white">games.samuelciocan.com</h1>
              <p className="text-[10px] text-slate-400 font-medium">Multijugador en Tiempo Real</p>
            </div>
          </div>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full py-1 px-2.5">
            <UserCircle className="w-4 h-4 text-indigo-400" />
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  maxLength={15}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-24 bg-slate-950 text-xs px-1.5 py-0.5 rounded text-white border border-indigo-500 focus:outline-none"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-emerald-400 hover:text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsEditingName(true)}>
                <span className="text-xs font-bold text-slate-200 truncate max-w-[90px]">{playerName}</span>
                <Edit3 className="w-3 h-3 text-slate-400" />
              </div>
            )}
          </div>
        </header>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={onClearError} className="font-bold text-rose-400 hover:text-rose-200">
              ✕
            </button>
          </div>
        )}

        {/* Game Selector Section */}
        <section className="mt-5">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Selecciona un Juego
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Capital Clash (Monopoly) */}
            <div
              onClick={() => setSelectedGame('monopoly')}
              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden sm:col-span-1 ${
                selectedGame === 'monopoly'
                  ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎩</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  2 - 6 Jugadores
                </span>
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Capital Clash</h3>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Negocios inmobiliarios estilo Monopoly: calles, hoteles, alquileres, tratos y cárcel.
              </p>
            </div>

            {/* Color Clash */}
            <div
              onClick={() => setSelectedGame('colorclash')}
              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                selectedGame === 'colorclash'
                  ? 'bg-gradient-to-b from-purple-950/40 to-slate-900 border-purple-500 shadow-lg shadow-purple-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎴</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  2 - 4 Jugadores
                </span>
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Color Clash</h3>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Juego de cartas tipo UNO: colores, +2, +4, cambios de sentido y comodines.
              </p>
            </div>

            {/* 3 en Raya */}
            <div
              onClick={() => setSelectedGame('tictactoe')}
              className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                selectedGame === 'tictactoe'
                  ? 'bg-gradient-to-b from-blue-950/40 to-slate-900 border-blue-500 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">⚔️</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  1v1 Clásico
                </span>
              </div>
              <h3 className="font-bold text-sm text-white mb-1">3 en Raya</h3>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Estrategia 1v1 rápida online o contra nuestro Bot Minimax.
              </p>
            </div>
          </div>
        </section>

        {/* Room Actions */}
        <section className="mt-5 space-y-3">
          {/* Create Room Button */}
          <button
            onClick={() => onCreateRoom(selectedGame)}
            disabled={isConnecting}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-target"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Crear Sala Online</span>
          </button>

          {/* Quick Play vs Bot */}
          <button
            onClick={() => onQuickPlayVsBot(selectedGame)}
            disabled={isConnecting}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-target"
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>Partida Rápida vs Bot</span>
          </button>
        </section>

        {/* Join With Code Form */}
        <section className="mt-5 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
          <h2 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unirse con Código de Sala</span>
          </h2>
          <form onSubmit={handleJoinSubmit} className="flex gap-2">
            <input
              type="text"
              maxLength={5}
              placeholder="CÓDIGO (EJ: K9X2P)"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-center font-mono font-bold tracking-widest text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase touch-target"
            />
            <button
              type="submit"
              disabled={roomCodeInput.trim().length !== 5 || isConnecting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all touch-target"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Entrar</span>
            </button>
          </form>
        </section>
      </div>

      {/* Footer & Monetization Hook */}
      <footer className="w-full mt-6 text-center">
        <AdBannerPlaceholder label="Patrocinador de la plataforma" />
        <p className="text-[10px] text-slate-600 mt-2 font-mono">
          games.samuelciocan.com • Monorepo pnpm • TypeScript • Socket.IO
        </p>
      </footer>
    </div>
  );
};
