import React, { useState, useEffect, useCallback } from 'react';
import { GameType, RoomInfo } from '@games/game-logic';
import { socket } from './services/socket.js';
import { useGuestProfile } from './hooks/useGuestProfile.js';
import { LobbyView } from './views/LobbyView.js';
import { WaitingRoomView } from './views/WaitingRoomView.js';
import { TicTacToeBoard } from './components/TicTacToeBoard.js';
import { ColorClashBoard } from './components/ColorClashBoard.js';
import { MonopolyBoard } from './components/MonopolyBoard.js';

export const App: React.FC = () => {
  const { playerId, playerName, updateName } = useGuestProfile();

  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup Socket listeners
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to game server. Socket ID:', socket.id);
    });

    socket.on('room:updated', (updatedRoom: RoomInfo) => {
      setCurrentRoom(updatedRoom);
    });

    socket.on('room:closed', (reason: string) => {
      alert(`Sala cerrada: ${reason}`);
      setCurrentRoom(null);
      setGameState(null);
    });

    socket.on('game:started', ({ publicState }) => {
      setGameState(publicState);
    });

    socket.on('game:state_update', (publicState) => {
      setGameState(publicState);
    });

    socket.on('game:ended', (endData) => {
      console.log('Game ended:', endData);
    });

    return () => {
      socket.off('connect');
      socket.off('room:updated');
      socket.off('room:closed');
      socket.off('game:started');
      socket.off('game:state_update');
      socket.off('game:ended');
    };
  }, []);

  // Check URL query parameters for invite link (?room=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !currentRoom) {
      handleJoinRoom(roomParam.toUpperCase());
    }
  }, []);

  const handleCreateRoom = (gameType: GameType) => {
    setIsConnecting(true);
    setErrorMessage(null);

    socket.emit(
      'room:create',
      {
        playerName,
        playerId,
        gameType,
      },
      (res) => {
        setIsConnecting(false);
        if (res.success && res.room) {
          setCurrentRoom(res.room);
          setGameState(null);
        } else {
          setErrorMessage(res.error || 'No se pudo crear la sala');
        }
      }
    );
  };

  const handleJoinRoom = (roomCode: string) => {
    setIsConnecting(true);
    setErrorMessage(null);

    socket.emit(
      'room:join',
      {
        roomCode,
        playerName,
        playerId,
      },
      (res) => {
        setIsConnecting(false);
        if (res.success && res.room) {
          setCurrentRoom(res.room);
        } else {
          setErrorMessage(res.error || 'No se pudo unir a la sala');
        }
      }
    );
  };

  const handleQuickPlayVsBot = (gameType: GameType) => {
    setIsConnecting(true);
    setErrorMessage(null);

    socket.emit(
      'room:create',
      {
        playerName,
        playerId,
        gameType,
      },
      (res) => {
        if (!res.success || !res.room) {
          setIsConnecting(false);
          setErrorMessage(res.error || 'Error al iniciar');
          return;
        }

        setCurrentRoom(res.room);

        // Add 1 bot (for TicTacToe) or 2 bots (for Color Clash)
        socket.emit('room:add_bot', (botRes) => {
          if (!botRes.success) {
            setIsConnecting(false);
            setErrorMessage(botRes.error || 'Error al añadir bot');
            return;
          }

          // In Color Clash, we can optionally add a second bot or start right away with 2 players
          socket.emit('room:start_game', (startRes) => {
            setIsConnecting(false);
            if (!startRes.success) {
              setErrorMessage(startRes.error || 'Error al iniciar partida');
            }
          });
        });
      }
    );
  };

  const handleAddBot = () => {
    socket.emit('room:add_bot', (res) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Error al añadir bot');
      }
    });
  };

  const handleRemoveBot = (botId: string) => {
    socket.emit('room:remove_bot', { botId }, (res) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Error al eliminar bot');
      }
    });
  };

  const handleStartGame = () => {
    socket.emit('room:start_game', (res) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Error al empezar la partida');
      }
    });
  };

  const handleRestartGame = () => {
    socket.emit('room:restart_game', (res) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Error al reiniciar la partida');
      }
    });
  };

  const handleGameAction = (action: any) => {
    socket.emit('game:action', action, (res) => {
      if (res && !res.success) {
        console.warn('Game action rejected by server:', res.error);
      }
    });
  };

  const handleUpdateRules = (rules: any) => {
    socket.emit('room:update_rules', rules, (res) => {
      if (res && !res.success) {
        setErrorMessage(res.error || 'Error al actualizar las reglas');
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('room:leave', () => {
      setCurrentRoom(null);
      setGameState(null);
      // Clean query parameter if present
      if (window.history.pushState) {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.pushState({ path: cleanUrl }, '', cleanUrl);
      }
    });
  };

  // View routing
  if (!currentRoom) {
    return (
      <LobbyView
        playerName={playerName}
        onUpdatePlayerName={updateName}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onQuickPlayVsBot={handleQuickPlayVsBot}
        isConnecting={isConnecting}
        errorMessage={errorMessage}
        onClearError={() => setErrorMessage(null)}
      />
    );
  }

  if (currentRoom.status === 'waiting') {
    return (
      <WaitingRoomView
        room={currentRoom}
        myPlayerId={playerId}
        onAddBot={handleAddBot}
        onRemoveBot={handleRemoveBot}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
        onUpdateRules={handleUpdateRules}
      />
    );
  }

  if (gameState) {
    if (currentRoom.gameType === 'tictactoe') {
      return (
        <TicTacToeBoard
          room={currentRoom}
          state={gameState}
          myPlayerId={playerId}
          onAction={handleGameAction}
          onRestart={handleRestartGame}
          onLeave={handleLeaveRoom}
        />
      );
    }

    if (currentRoom.gameType === 'colorclash') {
      return (
        <ColorClashBoard
          room={currentRoom}
          state={gameState}
          myPlayerId={playerId}
          onAction={handleGameAction}
          onRestart={handleRestartGame}
          onLeave={handleLeaveRoom}
        />
      );
    }

    if (currentRoom.gameType === 'monopoly') {
      return (
        <MonopolyBoard
          room={currentRoom}
          state={gameState}
          myPlayerId={playerId}
          onAction={handleGameAction}
          onRestart={handleRestartGame}
          onLeave={handleLeaveRoom}
        />
      );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] text-slate-400 gap-3">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Sincronizando estado con el servidor...</span>
    </div>
  );
};
