import React, { useState } from 'react';
import { RoomInfo } from '@games/game-logic';
import {
  Crown,
  Bot,
  User,
  UserPlus,
  Play,
  Copy,
  Check,
  LogOut,
  Trash2,
  Share2,
  Sliders,
} from 'lucide-react';
import { AdBannerPlaceholder } from '../components/AdBannerPlaceholder.js';

interface WaitingRoomViewProps {
  room: RoomInfo;
  myPlayerId: string;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onUpdateRules?: (rules: any) => void;
}

export const WaitingRoomView: React.FC<WaitingRoomViewProps> = ({
  room,
  myPlayerId,
  onAddBot,
  onRemoveBot,
  onStartGame,
  onLeaveRoom,
  onUpdateRules,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = room.hostId === myPlayerId;
  const canStart = room.players.length >= room.minPlayers;
  const canAddBot = room.players.length < room.maxPlayers;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[100dvh] w-full max-w-lg mx-auto p-4 select-none">
      {/* Header */}
      <div className="w-full">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Sala de Espera
            </span>
            <h1 className="text-base font-bold text-white">
              {room.gameType === 'monopoly'
                ? '🎩 Capital Clash (Monopoly)'
                : room.gameType === 'colorclash'
                ? '🎴 Color Clash'
                : '⚔️ 3 en Raya'}
            </h1>
          </div>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 rounded-lg border border-rose-900/60 transition-colors touch-target"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abandonar</span>
          </button>
        </div>

        {/* Big Room Code Capsule */}
        <div className="my-5 p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center shadow-xl">
          <span className="text-xs text-slate-400 font-medium">Código de Invitación:</span>
          <div className="text-4xl font-mono font-black tracking-widest text-indigo-400 my-2 select-all">
            {room.code}
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors touch-target"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-xs font-semibold text-indigo-200 transition-colors touch-target"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
            </button>
          </div>
        </div>

        {/* Players List Card */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Jugadores ({room.players.length} / {room.maxPlayers})
            </h2>
            <span className="text-[11px] text-slate-400">
              Mínimo requerido: {room.minPlayers}
            </span>
          </div>

          <div className="space-y-2">
            {room.players.map((p) => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-indigo-950/30 border-indigo-500/40'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                      {p.isBot ? (
                        <Bot className="w-4 h-4 text-amber-400" />
                      ) : p.isHost ? (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <User className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {p.name} {isMe && '(Tú)'}
                        </span>
                        {p.isHost && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 font-bold">
                            Host
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {p.isBot ? 'Bot automatizado' : p.connected ? 'Conectado' : 'Reconectando...'}
                      </span>
                    </div>
                  </div>

                  {/* Remove bot button (host only) */}
                  {isHost && p.isBot && (
                    <button
                      onClick={() => onRemoveBot(p.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors touch-target"
                      title="Eliminar bot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty Slots Fillers */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-800 text-slate-600 text-xs"
              >
                <div className="w-8 h-8 rounded-lg border border-dashed border-slate-800 flex items-center justify-center">
                  +
                </div>
                <span>Esperando jugador...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Rules Configuration (Monopoly / Capital Clash) */}
        {room.gameType === 'monopoly' && (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 mb-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Reglas de la Partida {isHost ? '(Personalizables)' : ''}
                </h2>
              </div>
              {isHost ? (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Host Control
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  Configurado por el anfitrión
                </span>
              )}
            </div>

            {/* Starting Cash */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Dinero Inicial:
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {room.customRules?.startingCash ?? 1500}€
                </span>
              </div>
              {isHost && (
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {[1000, 1500, 2000, 2500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => onUpdateRules?.({ startingCash: amt })}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        (room.customRules?.startingCash ?? 1500) === amt
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {amt}€
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Salary GO */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Salario al pasar por la Salida:
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {room.customRules?.salaryGO ?? 200}€
                </span>
              </div>
              {isHost && (
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {[200, 300, 400].map(salary => (
                    <button
                      key={salary}
                      type="button"
                      onClick={() => onUpdateRules?.({ salaryGO: salary })}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        (room.customRules?.salaryGO ?? 200) === salary
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {salary}€
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              {/* Free Parking Jackpot */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Bote de Parking Gratuito</div>
                  <div className="text-[10px] text-slate-400">Impuestos y multas se acumulan en el bote</div>
                </div>
                {isHost ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRules?.({
                        freeParkingPool: !(room.customRules?.freeParkingPool ?? true),
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      (room.customRules?.freeParkingPool ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        (room.customRules?.freeParkingPool ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                ) : (
                  <span className={`text-xs font-bold ${room.customRules?.freeParkingPool ?? true ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {(room.customRules?.freeParkingPool ?? true) ? 'Sí' : 'No'}
                  </span>
                )}
              </div>

              {/* Double on GO */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Doble Sueldo al caer en Salida</div>
                  <div className="text-[10px] text-slate-400">2x salario si caes exactamente en la casilla 0</div>
                </div>
                {isHost ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRules?.({
                        doubleGoSalary: !(room.customRules?.doubleGoSalary ?? false),
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      room.customRules?.doubleGoSalary ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        room.customRules?.doubleGoSalary ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                ) : (
                  <span className={`text-xs font-bold ${room.customRules?.doubleGoSalary ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {room.customRules?.doubleGoSalary ? 'Sí' : 'No'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Host Controls & Start Button */}
      <div className="w-full space-y-3 mt-4">
        {isHost ? (
          <>
            {canAddBot && (
              <button
                onClick={onAddBot}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-target"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>+ Añadir Bot</span>
              </button>
            )}

            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-target"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Empezar Partida</span>
            </button>
          </>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            ⏳ Esperando a que el anfitrión comience la partida...
          </div>
        )}

        <AdBannerPlaceholder label="Partida patrocinada" />
      </div>
    </div>
  );
};
