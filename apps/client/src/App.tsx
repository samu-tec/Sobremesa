import { t, useLocale } from './i18n';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { X, WifiOff } from 'lucide-react';
import type {
  GameType,
  RoomInfo,
  Result,
  RoomResult,
  MonopolyPublicState,
  ColorClashPublicState,
  TicTacToeState,
  Connect4State,
  ReversiState,
  PigState,
} from '@games/game-logic';
import { socket, sessionStore } from './services/socket';
import { useGuestProfile } from './hooks/useGuestProfile';
import { LobbyView } from './views/LobbyView';
import { Welcome } from './ui/Welcome';
import { Privacy } from './ui/Privacy';
import { WaitingRoomView } from './views/WaitingRoomView';
import { GameLayout } from './ui/GameLayout';
const MonopolyBoard = lazy(() =>
  import('./components/MonopolyBoard').then((m) => ({ default: m.MonopolyBoard })),
);
const ColorClashBoard = lazy(() =>
  import('./components/ColorClashBoard').then((m) => ({ default: m.ColorClashBoard })),
);
const TableBoards = lazy(() =>
  import('./components/TableBoards').then((m) => ({ default: m.TableBoards })),
);
type PublicState =
  | MonopolyPublicState
  | ColorClashPublicState
  | TicTacToeState
  | Connect4State
  | ReversiState
  | PigState;
function request<T>(send: (done: (result: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error(t('No hay conexión. Espera a que volvamos a conectar.')));
      return;
    }
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            t('El servidor tarda en responder. Comprueba tu conexión e inténtalo otra vez.'),
          ),
        ),
      10000,
    );
    send((result) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
}
export function App() {
  useLocale();
  const { confirmed, playerId, playerName, updateName, updatePlayerId } = useGuestProfile();
  const [room, setRoom] = useState<RoomInfo | null>(null),
    [state, setState] = useState<PublicState | null>(null),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false);
  const replacement = useRef(false);
  const pending = useRef(false),
    recovering = useRef(false);
  const [inviteCode, setInviteCode] = useState(() => {
    const value = new URLSearchParams(location.search).get('room');
    return value && /^[A-HJ-NP-Z2-9]{6}$/i.test(value) ? value.toUpperCase() : null;
  });
  const clearRoom = useCallback(() => {
    setRoom(null);
    setState(null);
    sessionStore.remove('sobremesa.room');
    setInviteCode(null);
    history.replaceState(null, '', location.pathname);
  }, []);
  const saveRoom = (value: RoomInfo) => {
    setRoom(value);
    sessionStore.set('sobremesa.room', value.code);
  };
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const recover = () => {
      const code = sessionStore.get('sobremesa.room');
      if (!code || recovering.current || !socket.connected || replacement.current || disposed)
        return;
      recovering.current = true;
      let again = false;
      request<RoomResult>((done) => socket.emit('game:reconnect', { roomCode: code }, done))
        .then((result) => {
          if (disposed) return;
          if (result.success && result.room) {
            saveRoom(result.room);
            setState((result.state as PublicState) || null);
            setError(null);
          } else if (
            result.errorCode === 'ROOM_UNAVAILABLE' ||
            result.errorCode === 'NOT_A_MEMBER'
          ) {
            clearRoom();
            setError(result.error || 'Tu sala ya no está disponible. Puedes crear una nueva.');
          } else {
            again = true;
            setError(result.error || 'No se pudo completar la acción.');
          }
        })
        .catch((err) => {
          if (!disposed) {
            setError(err.message);
            again = true;
          }
        })
        .finally(() => {
          recovering.current = false;
          if (!disposed && again) retry = setTimeout(recover, 3000);
        });
    };
    const ready = ({ playerId }: { playerId: string }) => {
      updatePlayerId(playerId);
      setConnected(true);
      setReplaced(false);
      replacement.current = false;
      recover();
    };
    const updated = (next: RoomInfo) => {
      saveRoom(next);
      if (next.status === 'waiting') setState(null);
    };
    const closed = (reason: string) => {
      clearRoom();
      setError(reason);
    };
    const started = ({ publicState }: { publicState: unknown }) =>
      setState(publicState as PublicState);
    const update = (publicState: unknown) => setState(publicState as PublicState);
    const disconnected = () => setConnected(false);
    const connectError = () => {
      setConnected(false);
    };
    const superseded = () => {
      replacement.current = true;
      setReplaced(true);
      setConnected(false);
    };
    const offline = () => {
      setConnected(false);
      socket.disconnect();
    };
    const wake = () => {
      if (navigator.onLine && !replacement.current && !socket.connected) socket.connect();
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', wake);
    window.addEventListener('pageshow', wake);
    document.addEventListener('visibilitychange', wake);
    socket.on('session:replaced', superseded);
    socket.on('session:ready', ready);
    socket.on('room:updated', updated);
    socket.on('room:closed', closed);
    socket.on('game:started', started);
    socket.on('game:state_update', update);
    socket.on('disconnect', disconnected);
    socket.on('connect_error', connectError);
    socket.on('game:error', setError);
    socket.connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', wake);
      window.removeEventListener('pageshow', wake);
      document.removeEventListener('visibilitychange', wake);
      socket.off('session:replaced', superseded);
      socket.off('session:ready', ready);
      socket.off('room:updated', updated);
      socket.off('room:closed', closed);
      socket.off('game:started', started);
      socket.off('game:state_update', update);
      socket.off('disconnect', disconnected);
      socket.off('connect_error', connectError);
      socket.off('game:error', setError);
      socket.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);
  const run = async (work: () => Promise<void>) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await work();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la acción.'));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const check = <T extends Result>(result: T): T => {
    if (!result.success) throw new Error(result.error || 'No se pudo completar la acción.');
    return result;
  };
  const create = (gameType: GameType, quick = false) =>
    run(async () => {
      const result = check(
        await request<RoomResult>((done) =>
          socket.emit('room:create', { playerName, gameType }, done),
        ),
      );
      if (result.room) {
        saveRoom(result.room);
        setState(null);
      }
      if (quick) {
        check(await request<Result>((done) => socket.emit('room:add_bot', done)));
      }
    });
  const join = (roomCode: string) =>
    run(async () => {
      const result = check(
        await request<RoomResult>((done) =>
          socket.emit('room:join', { playerName, roomCode }, done),
        ),
      );
      if (result.room) {
        saveRoom(result.room);
        setState((result.state as PublicState) || null);
        history.replaceState(null, '', `?room=${result.room.code}`);
      }
    });
  const addBot = () =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:add_bot', done)));
    });
  const removeBot = (botId: string) =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:remove_bot', { botId }, done)));
    });
  const start = () =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:start_game', done)));
    });
  const restart = () =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:restart_game', done)));
    });
  const leave = () =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:leave', done)));
      clearRoom();
    });
  const action = (value: unknown) =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('game:action', value, done)));
    });
  const updateRules = (rules: unknown) =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:update_rules', rules, done)));
    });
  const turn = state
    ? 'currentTurn' in state
      ? state.currentTurn
      : state.currentTurnPlayerId
    : '';
  return (
    <>
      {location.pathname === '/privacy' ? (
        <Privacy />
      ) : !room ? (
        <LobbyView
          playerName={playerName}
          onUpdatePlayerName={updateName}
          connected={connected}
          onCreateRoom={(g) => create(g)}
          onJoinRoom={join}
          onQuickPlayVsBot={(g) => create(g, true)}
          isConnecting={busy}
          inviteCode={inviteCode}
        />
      ) : room.status === 'waiting' ? (
        <WaitingRoomView
          room={room}
          myPlayerId={playerId}
          busy={busy || !connected}
          onAddBot={addBot}
          onRemoveBot={removeBot}
          onStartGame={start}
          onLeaveRoom={leave}
          onUpdateRules={updateRules}
          onError={setError}
        />
      ) : state ? (
        <GameLayout
          room={room}
          myPlayerId={playerId}
          currentTurn={'auction' in state && state.auction ? state.auction.currentBidderId : turn}
          winner={state.winner}
          isDraw={'isDraw' in state && state.isDraw}
          busy={busy || !connected}
          onRestart={restart}
          onLeave={leave}
          onError={setError}
        >
          <Suspense fallback={<Loading />}>
            {room.gameType === 'monopoly' ? (
              <MonopolyBoard
                room={room}
                state={state as MonopolyPublicState}
                myPlayerId={playerId}
                onAction={action}
                busy={busy || !connected}
              />
            ) : room.gameType === 'colorclash' ? (
              <ColorClashBoard
                room={room}
                state={state as ColorClashPublicState}
                myPlayerId={playerId}
                onAction={action}
                busy={busy || !connected}
              />
            ) : (
              <TableBoards
                room={room}
                state={state as TicTacToeState | Connect4State | ReversiState | PigState}
                myPlayerId={playerId}
                onAction={action}
                busy={busy || !connected}
              />
            )}
          </Suspense>
        </GameLayout>
      ) : (
        <Loading />
      )}
      {!confirmed && location.pathname !== '/privacy' && (
        <Welcome initialName={playerName} onConfirm={updateName} />
      )}
      {!connected && room && (
        <div className="offline-banner" role="status">
          <WifiOff size={17} />{' '}
          {replaced
            ? t('Esta sesión se ha abierto en otra conexión.')
            : t('Reconectando… Tu sitio se reserva durante {0} segundos.', {
                '0': Math.round(room.reconnectGraceMs / 1000),
              })}
          {replaced && (
            <button
              className="text-button"
              onClick={() => {
                replacement.current = false;
                socket.connect();
              }}
            >
              {t('Recuperar aquí')}
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="toast" role="alert">
          <span>{t(error)}</span>
          <button
            className="icon-button"
            aria-label={t('Cerrar aviso')}
            onClick={() => setError(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
function Loading() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      <p>{t('Preparando la mesa…')}</p>
    </div>
  );
}
