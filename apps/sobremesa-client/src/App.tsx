import { getGame as getDefinition } from 'sobremesa-logic';
import { t, useLocale } from './i18n';
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, WifiOff } from 'lucide-react';
import type { GameType, RoomInfo, Result, RoomResult, GamePublicState } from 'sobremesa-logic';
import {
  findOtherSobremesaTab,
  socket,
  sessionStore,
  startNewGuestSession,
} from './services/socket';
import { useGuestProfile } from './hooks/useGuestProfile';
import { LobbyView } from './views/LobbyView';
import { randomName, Welcome } from './ui/Welcome';
import { Modal } from './ui/Modal';
import { Privacy } from './ui/Privacy';
import { WaitingRoomView } from './views/WaitingRoomView';
import { GameLayout } from './ui/GameLayout';
import { useGameResults } from './hooks/useGameResults';
import { GameBoard } from './components/GameBoard';
type PublicState = GamePublicState;
function inviteCodeFrom(search: string) {
  const value = new URLSearchParams(search).get('room');
  return value && /^[A-HJ-NP-Z2-9]{6}$/i.test(value) ? value.toUpperCase() : null;
}
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
  const { locale } = useLocale();
  const { confirmed, playerId, playerName, updateName, updatePlayerId } = useGuestProfile();
  const [room, setRoom] = useState<RoomInfo | null>(null),
    [state, setState] = useState<PublicState | null>(null),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [tabConflict, setTabConflict] = useState<{ sameSession: boolean } | null>(null);
  const [tabConflictDeferred, setTabConflictDeferred] = useState(false);
  const replacement = useRef(true);
  const pending = useRef(false),
    recovering = useRef(false);
  const [inviteCode, setInviteCode] = useState(() => inviteCodeFrom(location.search));
  const pageKey =
    location.pathname === '/privacy' ? 'privacy' : room ? `${room.code}:${room.status}` : 'lobby';

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pageKey]);

  const clearRoom = useCallback((preserveInvite = false) => {
    const pendingInvite = preserveInvite ? inviteCodeFrom(location.search) : null;
    setRoom(null);
    setState(null);
    sessionStore.remove('sobremesa.room');
    setInviteCode(pendingInvite);
    history.replaceState(
      null,
      '',
      pendingInvite ? `${location.pathname}?room=${pendingInvite}` : location.pathname,
    );
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
            clearRoom(true);
            setError(t('La sala ha caducado o se ha cerrado. Crea otra o pide un enlace nuevo.'));
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
      setTabConflict(null);
      setTabConflictDeferred(false);
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
    if (location.pathname !== '/privacy') {
      findOtherSobremesaTab()
        .then((otherTab) => {
          if (disposed) return;
          if (otherTab) {
            setTabConflict(otherTab);
            return;
          }
          const invitation = inviteCodeFrom(location.search);
          const previousRoom = sessionStore.get('sobremesa.room');
          if (invitation && previousRoom && invitation !== previousRoom) {
            // A new invitation takes precedence over a stale room restored by the browser.
            startNewGuestSession();
          }
          replacement.current = false;
          if (navigator.onLine) socket.connect();
        })
        .catch(() => {
          if (disposed) return;
          replacement.current = false;
          if (navigator.onLine) socket.connect();
        });
    }
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
    if (!result.success) {
      if (result.errorCode === 'ROOM_UNAVAILABLE')
        throw new Error(
          t('La sala ha caducado o se ha cerrado. Crea otra o pide un enlace nuevo.'),
        );
      if (result.errorCode === 'ROOM_CREATE_RATE_LIMITED')
        throw new Error(
          t('Has alcanzado el límite de creación de salas. Espera un poco y vuelve a intentarlo.'),
        );
      throw new Error(result.error || t('No se pudo completar la acción.'));
    }
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
        for (let i = 1; i < getDefinition(gameType).minPlayers; i++) {
          check(await request<Result>((done) => socket.emit('room:add_bot', done)));
        }
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
  const continueInThisTab = () => {
    setTabConflict(null);
    setTabConflictDeferred(false);
    replacement.current = false;
    if (navigator.onLine) socket.connect();
  };
  const enterAsNewGuest = () => {
    startNewGuestSession();
    updateName(randomName(locale));
    setTabConflict(null);
    setTabConflictDeferred(false);
    replacement.current = false;
    if (navigator.onLine) socket.connect();
  };
  const keepOtherTab = () => {
    setTabConflictDeferred(true);
    try {
      if (window.opener && !window.opener.closed) window.close();
    } catch {
      /* The browser may prevent scripts from closing a tab. */
    }
  };
  const updateRules = (rules: unknown) =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:update_rules', rules, done)));
    });
  const gameResults = useGameResults(room, state);
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
          {...gameResults}
          room={room}
          myPlayerId={playerId}
          currentTurn={turn}
          isAuction={'auction' in state && !!state.auction}
          winner={state.winner}
          isDraw={'isDraw' in state && state.isDraw}
          busy={busy || !connected}
          onRestart={restart}
          onLeave={leave}
          onError={setError}
        >
          <Suspense fallback={<Loading />}>
            <GameBoard
              room={room}
              state={state}
              myPlayerId={playerId}
              onAction={action}
              busy={busy || !connected}
            />
          </Suspense>
        </GameLayout>
      ) : (
        <Loading />
      )}
      {!confirmed && location.pathname !== '/privacy' && (
        <Welcome initialName={playerName} onConfirm={updateName} />
      )}
      {tabConflict && (
        <Modal
          title={t('Ya tienes Sobremesa abierto en otra pestaña')}
          dismissable={false}
          onClose={() => {}}
        >
          <p>
            {tabConflict.sameSession
              ? t(
                  'Esta pestaña comparte la misma sesión que otra. Si continúas aquí, la anterior se desconectará y esta intentará recuperar su sala actual. Para entrar a la invitación sin interrumpirla, elige un invitado nuevo.',
                )
              : t(
                  'Hay otra pestaña abierta en Sobremesa. Si usas el mismo apodo, aparecerás con ese nombre en ambas. Puedes crear un invitado nuevo para que los jugadores se distingan.',
                )}
          </p>
          {tabConflictDeferred && (
            <p role="status">
              {t(
                'Esta pestaña no se ha conectado. Puedes cerrarla desde el navegador y volver a la pestaña anterior.',
              )}
            </p>
          )}
          <div className="choice-buttons">
            {!tabConflictDeferred && (
              <button className="button primary full" onClick={continueInThisTab}>
                {tabConflict.sameSession
                  ? t('Usar esta sesión aquí')
                  : t('Entrar como {0}', { '0': playerName })}
              </button>
            )}
            <button className="button secondary full" onClick={enterAsNewGuest}>
              {t('Entrar como invitado nuevo')}
            </button>
            {!tabConflictDeferred && (
              <button className="text-button" onClick={keepOtherTab}>
                {t('Ahora no')}
              </button>
            )}
          </div>
        </Modal>
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
