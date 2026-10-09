import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  BOARD_TILES,
  BoardTile,
  MonopolyAction,
  MonopolyPlayer,
  MonopolyPublicState,
  MonopolyTradeOffer,
  PropertyGroup,
  RoomInfo,
} from '@games/game-logic';
import { sound } from '../services/audio.js';
import {
  Trophy,
  RotateCcw,
  LogOut,
  Bot,
  User,
  Building,
  Dice5,
  Home,
  ShieldAlert,
  Coins,
  ArrowRight,
  Handshake,
  Check,
  X,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { AdBannerPlaceholder } from './AdBannerPlaceholder.js';

interface MonopolyBoardProps {
  room: RoomInfo;
  state: MonopolyPublicState;
  myPlayerId: string;
  onAction: (action: MonopolyAction) => void;
  onRestart: () => void;
  onLeave: () => void;
}

const COLOR_MAP: Record<PropertyGroup, { bg: string; text: string; name: string }> = {
  brown: { bg: 'bg-amber-900', text: 'text-amber-200', name: 'Marrón' },
  light_blue: { bg: 'bg-sky-400', text: 'text-sky-950', name: 'Azul Claro' },
  pink: { bg: 'bg-pink-500', text: 'text-white', name: 'Rosa' },
  orange: { bg: 'bg-orange-500', text: 'text-white', name: 'Naranja' },
  red: { bg: 'bg-red-600', text: 'text-white', name: 'Rojo' },
  yellow: { bg: 'bg-yellow-400', text: 'text-yellow-950', name: 'Amarillo' },
  green: { bg: 'bg-emerald-600', text: 'text-white', name: 'Verde' },
  dark_blue: { bg: 'bg-blue-800', text: 'text-white', name: 'Azul Oscuro' },
  station: { bg: 'bg-slate-700', text: 'text-white', name: 'Estación' },
  utility: { bg: 'bg-stone-600', text: 'text-white', name: 'Servicio' },
};

const PLAYER_COLORS = [
  'bg-blue-500 ring-blue-300 text-white',
  'bg-rose-500 ring-rose-300 text-white',
  'bg-amber-500 ring-amber-300 text-slate-950',
  'bg-emerald-500 ring-emerald-300 text-white',
  'bg-purple-500 ring-purple-300 text-white',
  'bg-cyan-500 ring-cyan-300 text-slate-950',
];

export const MonopolyBoard: React.FC<MonopolyBoardProps> = ({
  room,
  state,
  myPlayerId,
  onAction,
  onRestart,
  onLeave,
}) => {
  const [activeTab, setActiveTab] = useState<'board' | 'properties' | 'trade' | 'logs'>('board');
  const [inspectedTile, setInspectedTile] = useState<BoardTile | null>(null);

  // Trade Proposal State
  const [tradeTargetId, setTradeTargetId] = useState<string>('');
  const [tradeOfferedCash, setTradeOfferedCash] = useState<number>(0);
  const [tradeRequestedCash, setTradeRequestedCash] = useState<number>(0);
  const [tradeOfferedProps, setTradeOfferedProps] = useState<number[]>([]);
  const [tradeRequestedProps, setTradeRequestedProps] = useState<number[]>([]);

  const isMyTurn = state.currentTurnPlayerId === myPlayerId && !state.winner;
  const myPlayer = state.players.find(p => p.id === myPlayerId);
  const isGameOver = Boolean(state.winner);
  const isWinner = state.winner === myPlayerId;
  const currentTurnPlayer = state.players.find(p => p.id === state.currentTurnPlayerId);

  // Victory / Loss effects
  useEffect(() => {
    if (state.winner) {
      if (state.winner === myPlayerId) {
        sound.playWinFanfare();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
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

  const handleRollDice = () => {
    if (!isMyTurn) return;
    sound.playDiceSound();
    onAction({ type: 'ROLL_DICE' });
  };

  const handleBuyProperty = () => {
    if (!isMyTurn) return;
    sound.playCashSound();
    onAction({ type: 'BUY_PROPERTY' });
  };

  const handlePassProperty = () => {
    if (!isMyTurn) return;
    sound.playMoveSound();
    onAction({ type: 'PASS_PROPERTY' });
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    sound.playMoveSound();
    onAction({ type: 'END_TURN' });
  };

  const handlePayJailFine = () => {
    if (!isMyTurn) return;
    sound.playCashSound();
    onAction({ type: 'PAY_JAIL_FINE' });
  };

  const handleUseJailCard = () => {
    if (!isMyTurn) return;
    sound.playJailDoorSound();
    onAction({ type: 'USE_JAIL_CARD' });
  };

  const handleBuildHouse = (tileIndex: number) => {
    sound.playBuyHouseSound();
    onAction({ type: 'BUILD_HOUSE', tileIndex });
  };

  const handleSellHouse = (tileIndex: number) => {
    sound.playCashSound();
    onAction({ type: 'SELL_HOUSE', tileIndex });
  };

  const handleMortgage = (tileIndex: number) => {
    sound.playCashSound();
    onAction({ type: 'MORTGAGE_PROPERTY', tileIndex });
  };

  const handleUnmortgage = (tileIndex: number) => {
    sound.playCashSound();
    onAction({ type: 'UNMORTGAGE_PROPERTY', tileIndex });
  };

  const handleProposeTradeSubmit = () => {
    if (!tradeTargetId) return;
    onAction({
      type: 'PROPOSE_TRADE',
      trade: {
        fromPlayerId: myPlayerId,
        toPlayerId: tradeTargetId,
        offeredCash: tradeOfferedCash,
        offeredPropertyIndices: tradeOfferedProps,
        requestedCash: tradeRequestedCash,
        requestedPropertyIndices: tradeRequestedProps,
      },
    });
    // Reset inputs
    setTradeOfferedProps([]);
    setTradeRequestedProps([]);
    setTradeOfferedCash(0);
    setTradeRequestedCash(0);
    setActiveTab('board');
  };

  const myOwnedProperties = BOARD_TILES.filter(
    t => state.properties[t.index]?.ownerId === myPlayerId
  );

  const getTileOwner = (tileIndex: number): MonopolyPlayer | undefined => {
    const ownerId = state.properties[tileIndex]?.ownerId;
    return ownerId ? state.players.find(p => p.id === ownerId) : undefined;
  };

  return (
    <div className="flex flex-col justify-between w-full max-w-4xl min-h-[100dvh] p-3 sm:p-5 mx-auto select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎩</span>
          <div>
            <h1 className="text-sm font-bold tracking-wide uppercase text-slate-200">Capital Clash</h1>
            <span className="text-xs font-mono text-slate-400">Sala: {room.code}</span>
          </div>
        </div>

        {/* Free Parking Jackpot Badge */}
        {state.customRules?.freeParkingPool && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/40 border border-amber-600/40 rounded-xl text-xs text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Bote Parking:</span>
            <span className="font-mono font-bold">{state.freeParkingPool}€</span>
          </div>
        )}

        <button
          onClick={onLeave}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 rounded-lg border border-rose-900/60 transition-colors touch-target"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>

      {/* Players Header Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {state.players.map((p, idx) => {
          const isTurn = p.id === state.currentTurnPlayerId;
          const isMe = p.id === myPlayerId;
          const pColor = PLAYER_COLORS[idx % PLAYER_COLORS.length];

          return (
            <div
              key={p.id}
              className={`p-2 rounded-xl border transition-all ${
                p.isBankrupt
                  ? 'bg-slate-950/40 border-slate-900 opacity-40'
                  : isTurn
                  ? 'bg-emerald-950/30 border-emerald-500/80 ring-2 ring-emerald-500/20'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-3 h-3 rounded-full ${pColor}`} />
                  <span className="text-xs font-bold truncate text-slate-200">
                    {p.name} {isMe && '(Tú)'}
                  </span>
                </div>
                {p.isBot && <Bot className="w-3 h-3 text-amber-400 flex-shrink-0" />}
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">{p.cash}€</span>
                {p.inJail && (
                  <span className="text-[10px] text-rose-400 font-sans flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Cárcel
                  </span>
                )}
                {p.isBankrupt && (
                  <span className="text-[10px] text-slate-500 font-sans">Eliminado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Interactive Arena: Tabs */}
      <div className="flex border-b border-slate-800 mb-3 gap-1">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex-1 py-2 text-xs font-bold rounded-t-xl transition-colors flex items-center justify-center gap-1.5 touch-target ${
            activeTab === 'board'
              ? 'bg-slate-900 text-white border-t border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Dice5 className="w-3.5 h-3.5" />
          <span>Tablero</span>
        </button>

        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2 text-xs font-bold rounded-t-xl transition-colors flex items-center justify-center gap-1.5 touch-target ${
            activeTab === 'properties'
              ? 'bg-slate-900 text-white border-t border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Propiedades ({myOwnedProperties.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('trade')}
          className={`flex-1 py-2 text-xs font-bold rounded-t-xl transition-colors flex items-center justify-center gap-1.5 touch-target ${
            activeTab === 'trade'
              ? 'bg-slate-900 text-white border-t border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>Negociar</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2 text-xs font-bold rounded-t-xl transition-colors flex items-center justify-center gap-1.5 touch-target ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white border-t border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Historial</span>
        </button>
      </div>

      {/* TAB CONTENT: 1. BOARD & ACTIONS */}
      {activeTab === 'board' && (
        <div className="flex-1 flex flex-col justify-between">
          {/* Action Control Panel */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl mb-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Dice & Turn Banner */}
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-mono font-black text-white shadow-inner">
                    {state.lastDice[0]}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-mono font-black text-white shadow-inner">
                    {state.lastDice[1]}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total:</span>
                    <span className="text-sm font-bold text-white font-mono">{state.lastDiceSum}</span>
                    {state.isDouble && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        ¡DOBLES!
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-300">
                    {isMyTurn ? (
                      <span className="text-emerald-400 font-bold animate-pulse">● ¡Es tu turno!</span>
                    ) : (
                      `Turno de ${currentTurnPlayer?.name || 'Rival'}`
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Roll Dice Button */}
                {isMyTurn && state.turnPhase === 'roll' && !state.hasRolled && (
                  <button
                    onClick={handleRollDice}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 touch-target"
                  >
                    <Dice5 className="w-4 h-4" />
                    <span>Tirar Dados</span>
                  </button>
                )}

                {/* Jail Actions */}
                {isMyTurn && myPlayer?.inJail && state.turnPhase === 'roll' && !state.hasRolled && (
                  <>
                    <button
                      onClick={handlePayJailFine}
                      disabled={myPlayer.cash < (state.customRules?.jailFine || 50)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl border border-slate-700 touch-target"
                    >
                      Pagar Fianza ({state.customRules?.jailFine || 50}€)
                    </button>
                    {myPlayer.getOutOfJailFreeCards > 0 && (
                      <button
                        onClick={handleUseJailCard}
                        className="px-3 py-2 bg-indigo-800 hover:bg-indigo-700 text-xs font-bold rounded-xl text-white touch-target"
                      >
                        Usar Carta Libertad
                      </button>
                    )}
                  </>
                )}

                {/* Buy / Pass Property */}
                {isMyTurn && state.turnPhase === 'tile_action' && state.pendingTileAction?.actionType === 'buy_property' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleBuyProperty}
                      disabled={myPlayer && myPlayer.cash < (state.pendingTileAction.amount || 0)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 touch-target shadow-lg shadow-emerald-600/20"
                    >
                      <Building className="w-4 h-4" />
                      <span>Comprar ({state.pendingTileAction.amount}€)</span>
                    </button>
                    <button
                      onClick={handlePassProperty}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs touch-target"
                    >
                      Pasar
                    </button>
                  </div>
                )}

                {/* End Turn */}
                {isMyTurn && state.turnPhase === 'end_turn' && (
                  <button
                    onClick={handleEndTurn}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 touch-target shadow-lg shadow-indigo-600/20"
                  >
                    <span>Terminar Turno</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 40-Tile Visual Board Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 p-2 bg-slate-900/40 rounded-2xl border border-slate-800 max-h-[460px] overflow-y-auto">
            {BOARD_TILES.map((tile) => {
              const prop = state.properties[tile.index];
              const owner = getTileOwner(tile.index);
              const playersOnTile = state.players.filter(p => p.position === tile.index && !p.isBankrupt);
              const colorInfo = tile.group ? COLOR_MAP[tile.group] : undefined;

              return (
                <div
                  key={tile.index}
                  onClick={() => setInspectedTile(tile)}
                  className={`min-h-[64px] sm:min-h-[72px] p-1 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] relative touch-target ${
                    prop?.isMortgaged
                      ? 'bg-stone-900 border-dashed border-stone-700 opacity-60'
                      : owner
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  {/* Top Color Stripe / Badge */}
                  {colorInfo ? (
                    <div className={`w-full h-2 rounded-t-lg ${colorInfo.bg} -mt-1 -mx-1`} />
                  ) : (
                    <div className="w-full h-1" />
                  )}

                  {/* Tile Name & Price */}
                  <div className="text-[10px] font-bold text-slate-200 truncate leading-tight mt-0.5">
                    {tile.name}
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>{tile.price ? `${tile.price}€` : tile.type.toUpperCase().slice(0, 4)}</span>
                    {prop && prop.houses > 0 && (
                      <span className="text-yellow-400 font-bold">
                        {prop.houses === 5 ? '★' : `${prop.houses}H`}
                      </span>
                    )}
                  </div>

                  {/* Player Token Markers */}
                  {playersOnTile.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 justify-center">
                      {playersOnTile.map(p => {
                        const pIdx = state.players.findIndex(x => x.id === p.id);
                        return (
                          <div
                            key={p.id}
                            title={p.name}
                            className={`w-3 h-3 rounded-full border border-white/60 shadow-sm ${PLAYER_COLORS[pIdx % PLAYER_COLORS.length]}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. MY PROPERTIES & BUILDING */}
      {activeTab === 'properties' && (
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
          {myOwnedProperties.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Aún no posees propiedades. Tira los dados y compra calles cuando caigas en ellas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myOwnedProperties.map(tile => {
                const prop = state.properties[tile.index];
                const colorInfo = tile.group ? COLOR_MAP[tile.group] : undefined;
                const groupTiles = tile.group ? BOARD_TILES.filter(t => t.group === tile.group) : [];
                const ownsFullMonopoly =
                  tile.group &&
                  groupTiles.every(t => state.properties[t.index]?.ownerId === myPlayerId);

                return (
                  <div
                    key={tile.index}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {colorInfo && <div className={`w-3 h-3 rounded-full ${colorInfo.bg}`} />}
                          <span className="font-bold text-sm text-slate-200">{tile.name}</span>
                        </div>
                        {prop.isMortgaged ? (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            Hipotecada
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {prop.houses === 5 ? 'Hotel' : `${prop.houses} casa(s)`}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>Alquiler actual:</span>
                          <span className="font-mono text-white">
                            {prop.houses > 0
                              ? `${tile.rent?.[prop.houses]}€`
                              : ownsFullMonopoly
                              ? `${(tile.rent?.[0] || 0) * 2}€ (Monopolio)`
                              : `${tile.rent?.[0] || 0}€`}
                          </span>
                        </div>
                        {tile.houseCost && (
                          <div className="flex justify-between">
                            <span>Coste edificación:</span>
                            <span className="font-mono text-white">{tile.houseCost}€ / casa</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Build, Sell, Mortgage */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      {ownsFullMonopoly && !prop.isMortgaged && tile.houseCost && prop.houses < 5 && (
                        <button
                          onClick={() => handleBuildHouse(tile.index)}
                          disabled={!isMyTurn || (myPlayer?.cash || 0) < tile.houseCost}
                          className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold touch-target"
                        >
                          + Edificar ({tile.houseCost}€)
                        </button>
                      )}

                      {prop.houses > 0 && (
                        <button
                          onClick={() => handleSellHouse(tile.index)}
                          disabled={!isMyTurn}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-bold touch-target"
                        >
                          Vender Edificio
                        </button>
                      )}

                      {!prop.isMortgaged ? (
                        <button
                          onClick={() => handleMortgage(tile.index)}
                          disabled={!isMyTurn || prop.houses > 0}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 rounded-lg text-xs font-bold touch-target"
                        >
                          Hipotecar (+{tile.mortgageValue}€)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnmortgage(tile.index)}
                          disabled={!isMyTurn || (myPlayer?.cash || 0) < Math.round((tile.mortgageValue || 0) * 1.1)}
                          className="py-1.5 px-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold touch-target"
                        >
                          Levantar (-{Math.round((tile.mortgageValue || 0) * 1.1)}€)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. TRADING SYSTEM */}
      {activeTab === 'trade' && (
        <div className="flex-1 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-y-auto max-h-[500px]">
          <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-emerald-400" />
            <span>Negociar e Intercambiar Propiedades</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Selecciona un oponente, el dinero y las calles a ofrecer e intercambiar.
          </p>

          {/* Select Opponent */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Negociar con:
            </label>
            <div className="flex flex-wrap gap-2">
              {state.players
                .filter(p => p.id !== myPlayerId && !p.isBankrupt)
                .map(opp => (
                  <button
                    key={opp.id}
                    onClick={() => setTradeTargetId(opp.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      tradeTargetId === opp.id
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {opp.name} ({opp.cash}€)
                  </button>
                ))}
            </div>
          </div>

          {tradeTargetId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* You Offer */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold text-emerald-400 block mb-2">Tú Ofreces:</span>
                <div className="mb-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Dinero (€):</label>
                  <input
                    type="number"
                    min="0"
                    max={myPlayer?.cash || 0}
                    value={tradeOfferedCash}
                    onChange={e => setTradeOfferedCash(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Tus Propiedades:</label>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {myOwnedProperties.map(t => (
                      <label key={t.index} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tradeOfferedProps.includes(t.index)}
                          onChange={e => {
                            if (e.target.checked) setTradeOfferedProps([...tradeOfferedProps, t.index]);
                            else setTradeOfferedProps(tradeOfferedProps.filter(x => x !== t.index));
                          }}
                        />
                        <span>{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* You Request */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold text-amber-400 block mb-2">Pides a Cambio:</span>
                <div className="mb-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Dinero (€):</label>
                  <input
                    type="number"
                    min="0"
                    value={tradeRequestedCash}
                    onChange={e => setTradeRequestedCash(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Propiedades del Rival:</label>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {BOARD_TILES.filter(t => state.properties[t.index]?.ownerId === tradeTargetId).map(t => (
                      <label key={t.index} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tradeRequestedProps.includes(t.index)}
                          onChange={e => {
                            if (e.target.checked) setTradeRequestedProps([...tradeRequestedProps, t.index]);
                            else setTradeRequestedProps(tradeRequestedProps.filter(x => x !== t.index));
                          }}
                        />
                        <span>{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleProposeTradeSubmit}
            disabled={!tradeTargetId || (tradeOfferedCash === 0 && tradeOfferedProps.length === 0 && tradeRequestedCash === 0 && tradeRequestedProps.length === 0)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 touch-target"
          >
            Enviar Oferta de Negociación
          </button>
        </div>
      )}

      {/* TAB CONTENT: 4. GAME LOGS */}
      {activeTab === 'logs' && (
        <div className="flex-1 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-y-auto max-h-[500px]">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Historial de Acciones y Eventos
          </h2>
          <div className="space-y-2">
            {state.logs.map((log, i) => (
              <div key={i} className="text-xs text-slate-300 py-1.5 border-b border-slate-800/60 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TILE INSPECTOR MODAL */}
      {inspectedTile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                {inspectedTile.group && (
                  <div className={`w-3.5 h-3.5 rounded-full ${COLOR_MAP[inspectedTile.group]?.bg}`} />
                )}
                <h3 className="text-sm font-bold text-white">{inspectedTile.name}</h3>
              </div>
              <button onClick={() => setInspectedTile(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 mb-4 font-mono">
              <div className="flex justify-between">
                <span>Tipo:</span>
                <span className="capitalize">{inspectedTile.type}</span>
              </div>
              {inspectedTile.price && (
                <div className="flex justify-between">
                  <span>Precio de compra:</span>
                  <span className="font-bold text-emerald-400">{inspectedTile.price}€</span>
                </div>
              )}
              {inspectedTile.rent && inspectedTile.type === 'property' && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Alquiler base:</span>
                    <span>{inspectedTile.rent[0]}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Con 1 casa:</span>
                    <span>{inspectedTile.rent[1]}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Con 2 casas:</span>
                    <span>{inspectedTile.rent[2]}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Con 3 casas:</span>
                    <span>{inspectedTile.rent[3]}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Con 4 casas:</span>
                    <span>{inspectedTile.rent[4]}€</span>
                  </div>
                  <div className="flex justify-between font-bold text-yellow-400">
                    <span>Con Hotel:</span>
                    <span>{inspectedTile.rent[5]}€</span>
                  </div>
                </div>
              )}
              {inspectedTile.mortgageValue && (
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span>Valor de hipoteca:</span>
                  <span>{inspectedTile.mortgageValue}€</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectedTile(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold rounded-xl"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE TRADE INCOMING MODAL */}
      {state.activeTrade && state.activeTrade.toPlayerId === myPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-5 bg-slate-900 border border-emerald-500 rounded-3xl shadow-2xl text-center">
            <h3 className="text-base font-bold text-white mb-2">
              ¡Propuesta de Negociación Recibida!
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {state.players.find(p => p.id === state.activeTrade!.fromPlayerId)?.name} te ofrece:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono text-left bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div>
                <span className="text-emerald-400 font-bold block mb-1">Te Entrega:</span>
                <div>{state.activeTrade.offeredCash}€</div>
                {state.activeTrade.offeredPropertyIndices.map(idx => (
                  <div key={idx} className="text-slate-300">• {BOARD_TILES[idx].name}</div>
                ))}
              </div>
              <div>
                <span className="text-amber-400 font-bold block mb-1">Te Pide:</span>
                <div>{state.activeTrade.requestedCash}€</div>
                {state.activeTrade.requestedPropertyIndices.map(idx => (
                  <div key={idx} className="text-slate-300">• {BOARD_TILES[idx].name}</div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onAction({ type: 'RESPOND_TRADE', tradeId: state.activeTrade!.id, accept: true })}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs touch-target shadow-lg shadow-emerald-600/20"
              >
                Aceptar Trato ✅
              </button>
              <button
                onClick={() => onAction({ type: 'RESPOND_TRADE', tradeId: state.activeTrade!.id, accept: false })}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold rounded-xl text-xs touch-target"
              >
                Rechazar ❌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {isWinner ? (
                <>
                  <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
                  <span className="text-xl font-black text-yellow-400 tracking-wider">¡MAGNATE DEL CAPITAL!</span>
                </>
              ) : (
                <>
                  <span className="text-3xl">💀</span>
                  <span className="text-xl font-black text-rose-400 tracking-wider">PARTIDA TERMINADA</span>
                </>
              )}
            </div>

            <p className="text-sm text-slate-300 mb-6">
              {isWinner
                ? '¡Has llevado a la bancarrota a tus oponentes y dominas la ciudad!'
                : `${state.players.find(p => p.id === state.winner)?.name || 'Un rival'} ha ganado la partida.`}
            </p>

            {room.hostId === myPlayerId ? (
              <button
                onClick={onRestart}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 touch-target mb-3"
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
          </div>
        </div>
      )}

      {/* Bottom Ad Placeholder */}
      <div className="mt-2">
        <AdBannerPlaceholder label="Capital Clash Multiplayer" />
      </div>
    </div>
  );
};
