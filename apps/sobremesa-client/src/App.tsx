import { PROTOCOL_VERSION, PROTOCOL_MISMATCH, getGame as getDefinition } from 'sobremesa-logic';
import { t, gameText, useLocale } from './i18n';
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, WifiOff } from 'lucide-react';
import type {
  GameType,
  RoomInfo,
  Result,
  RoomResult,
  GamePublicState,
  GameSnapshot,
  GameText,
  InactivityPrompt,
} from 'sobremesa-logic';
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
import { PlayerPreferencesProvider } from './ui/Preferences';
import { useGameResults } from './hooks/useGameResults';
import { GameBoard } from './components/GameBoard';
import { requestOnConnection } from './services/request';
import { clearMysteryNotes } from './services/mysteryNotebook';
import {
  actionSound,
  installSoundGestures,
  playSound,
  suppressRecoverySounds,
} from './services/sound';
type PublicState = GamePublicState;
function inviteCodeFrom(search: string) {
  const value = new URLSearchParams(search).get('room')?.replace(/\s/g, '');
  return value && /^[A-HJ-NP-Z2-9]{6}$/i.test(value) ? value.toUpperCase() : null;
}
function request<T>(send: (done: (result: T) => void) => void): Promise<T> {
  return requestOnConnection(socket, send, {
    offline: t('No hay conexión. Espera a que volvamos a conectar.'),
    timeout: t('El servidor tarda en responder. Comprueba tu conexión e inténtalo otra vez.'),
  });
}

export function App() {
  const { locale } = useLocale();
  useEffect(installSoundGestures, []);
  const { confirmed, playerId, playerName, updateName, updatePlayerId } = useGuestProfile();
  const playerIdRef = useRef(playerId);
  useLayoutEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);
  const [room, setRoom] = useState<RoomInfo | null>(null),
    [state, setState] = useState<PublicState | null>(null),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<GameText | null>(null);
  const [inactivityPrompt, setInactivityPrompt] = useState<InactivityPrompt | null>(null);
  useEffect(() => setNotification(null), [room?.matchId]);
  const activeRoom = useRef<RoomInfo | null>(null);
  const [incompatible, setIncompatible] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [tabConflict, setTabConflict] = useState<{ sameSession: boolean } | null>(null);
  const [tabConflictDeferred, setTabConflictDeferred] = useState(false);
  const replacement = useRef(true);
  const pending = useRef(false),
    recovering = useRef(false);
  const [inviteCode, setInviteCode] = useState(() => inviteCodeFrom(location.search));
  const pageKey =
    location.pathname === '/privacy' ? 'privacy' : room ? `${room.code}:${room.status}` : 'lobby';
  const updatePreferenceName = (name: string) => {
    updateName(name);
    if (room)
      socket.emit('room:update_name', { matchId: room.matchId, playerName: name }, () => {});
  };

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pageKey]);

  const clearRoom = useCallback((preserveInvite = false) => {
    const pendingInvite = preserveInvite ? inviteCodeFrom(location.search) : null;
    if (activeRoom.current?.gameType === 'mystery')
      clearMysteryNotes(playerIdRef.current, activeRoom.current.code, activeRoom.current.matchId);
    activeRoom.current = null;
    setRoom(null);
    setState(null);
    setInactivityPrompt(null);
    sessionStore.remove('sobremesa.room');
    setInviteCode(pendingInvite);
    history.replaceState(
      null,
      '',
      pendingInvite ? `${location.pathname}?room=${pendingInvite}` : location.pathname,
    );
  }, []);
  const saveRoom = useCallback((value: RoomInfo) => {
    const previous = activeRoom.current;
    if (
      previous?.gameType === 'mystery' &&
      (previous.matchId !== value.matchId || previous.code !== value.code)
    )
      clearMysteryNotes(playerIdRef.current, previous.code, previous.matchId);
    if (previous?.matchId !== value.matchId || value.status !== 'in_game')
      setInactivityPrompt(null);
    activeRoom.current = value;
    setRoom(value);
    sessionStore.set('sobremesa.room', value.code);
  }, []);
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
          if (disposed || replacement.current || sessionStore.get('sobremesa.room') !== code)
            return;
          if (result.success && result.room) {
            suppressRecoverySounds();
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
    const ready = ({
      playerId,
      protocolVersion,
    }: {
      playerId: string;
      protocolVersion: number;
    }) => {
      if (protocolVersion !== PROTOCOL_VERSION) {
        setIncompatible(true);
        replacement.current = true;
        socket.disconnect();
        return;
      }
      suppressRecoverySounds();
      setIncompatible(false);
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
    const inactivityPrompt = (prompt: InactivityPrompt) => {
      if (prompt.matchId === activeRoom.current?.matchId && activeRoom.current.status === 'in_game')
        setInactivityPrompt(prompt);
    };
    const inactivityPromptCleared = (prompt: Pick<InactivityPrompt, 'matchId' | 'promptId'>) => {
      setInactivityPrompt((current) =>
        current?.matchId === prompt.matchId && current.promptId === prompt.promptId
          ? null
          : current,
      );
    };
    const closed = (reason: string) => {
      clearRoom();
      setError(reason);
    };
    const update = (publicState: GameSnapshot) => {
      if (
        publicState.matchId === activeRoom.current?.matchId &&
        publicState.gameType === activeRoom.current.gameType
      )
        setState(publicState);
    };
    const started = ({ publicState }: { publicState: GameSnapshot }) => update(publicState);
    const disconnected = () => {
      suppressRecoverySounds();
      setConnected(false);
      setInactivityPrompt(null);
    };
    const connectError = (error: Error & { data?: { code?: string } }) => {
      setConnected(false);
      if (error.data?.code === PROTOCOL_MISMATCH) {
        replacement.current = true;
        setIncompatible(true);
        socket.disconnect();
      }
    };
    const incompatibleSession = () => {
      replacement.current = true;
      setIncompatible(true);
      socket.disconnect();
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
    socket.on('session:incompatible', incompatibleSession);
    socket.on('session:replaced', superseded);
    socket.on('session:ready', ready);
    socket.on('room:updated', updated);
    socket.on('room:inactivity_prompt', inactivityPrompt);
    socket.on('room:inactivity_prompt_cleared', inactivityPromptCleared);
    socket.on('room:closed', closed);
    socket.on('room:removed', closed);
    socket.on('game:started', started);
    socket.on('game:state_update', update);
    socket.on('disconnect', disconnected);
    socket.on('connect_error', connectError);
    const notify = ({ text }: { text: GameText }) => setNotification(text);
    socket.on('game:notification', notify);
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
      socket.off('session:incompatible', incompatibleSession);
      socket.off('session:replaced', superseded);
      socket.off('session:ready', ready);
      socket.off('room:updated', updated);
      socket.off('room:inactivity_prompt', inactivityPrompt);
      socket.off('room:inactivity_prompt_cleared', inactivityPromptCleared);
      socket.off('room:closed', closed);
      socket.off('room:removed', closed);
      socket.off('game:started', started);
      socket.off('game:state_update', update);
      socket.off('disconnect', disconnected);
      socket.off('connect_error', connectError);
      socket.off('game:notification', notify);
      socket.off('game:error', setError);
      socket.disconnect();
    };
  }, [clearRoom, saveRoom, updatePlayerId]);
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
          check(
            await request<Result>((done) =>
              socket.emit('room:add_bot', { matchId: result.room?.matchId || '' }, done),
            ),
          );
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
      check(
        await request<Result>((done) =>
          socket.emit('room:add_bot', { matchId: room?.matchId || '' }, done),
        ),
      );
    });
  const removeBot = (botId: string) =>
    run(async () => {
      check(
        await request<Result>((done) =>
          socket.emit('room:remove_bot', { botId, matchId: room?.matchId || '' }, done),
        ),
      );
    });
  const removePlayer = (playerId: string) =>
    run(async () => {
      check(
        await request<Result>((done) =>
          socket.emit('room:remove_player', { playerId, matchId: room?.matchId || '' }, done),
        ),
      );
    });
  const respondToInactivity = (decision: 'continue' | 'leave') => {
    const prompt = inactivityPrompt;
    if (!prompt) return Promise.resolve(false);
    return run(async () => {
      check(
        await request<Result>((done) =>
          socket.emit(
            'room:respond_inactivity',
            { matchId: prompt.matchId, promptId: prompt.promptId, decision },
            done,
          ),
        ),
      );
      setInactivityPrompt(null);
    });
  };
  const changeGame = (gameType: GameType) =>
    run(async () => {
      check(
        await request<Result>((done) =>
          socket.emit('room:change_game', { gameType, matchId: room?.matchId || '' }, done),
        ),
      );
    });
  const start = () =>
    run(async () => {
      check(
        await request<Result>((done) =>
          socket.emit('room:start_game', { matchId: room?.matchId || '' }, done),
        ),
      );
    });
  const restart = () =>
    run(async () => {
      check(
        await request<Result>((done) =>
          socket.emit('room:restart_game', { matchId: room?.matchId || '' }, done),
        ),
      );
    });
  const leave = () =>
    run(async () => {
      check(await request<Result>((done) => socket.emit('room:leave', done)));
      clearRoom();
    });
  const action = (value: unknown) =>
    run(async () => {
      const result = await request<Result>((done) =>
        socket.emit('game:action', { matchId: room?.matchId || '', action: value }, done),
      );
      if (!result.success || room?.gameType !== 'colorclash')
        playSound(result.success ? actionSound(value) : 'error');
      check(result);
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
      check(
        await request<Result>((done) =>
          socket.emit('room:update_rules', { matchId: room?.matchId || '', rules }, done),
        ),
      );
    });
  const publicProgress = useRef<{ matchId: string; phase: string; round: string } | null>(null);
  useEffect(() => {
    if (!room || !state) {
      publicProgress.current = null;
      return;
    }
    const phase = 'phase' in state ? String(state.phase) : '',
      round =
        'round' in state
          ? String(state.round)
          : 'handNumber' in state
            ? String(state.handNumber)
            : 'turnIndex' in state
              ? String(state.turnIndex)
              : '',
      previous = publicProgress.current;
    if (
      previous?.matchId === room.matchId &&
      room.status === 'in_game' &&
      ((phase !== previous.phase && ['vote', 'review', 'round_end', 'hand_end'].includes(phase)) ||
        round !== previous.round)
    )
      playSound('round');
    publicProgress.current = { matchId: room.matchId, phase, round };
  }, [room, state]);
  const gameResults = useGameResults(room, state);
  const turn = state
    ? 'currentTurn' in state
      ? state.currentTurn
      : state.currentTurnPlayerId
    : '';
  let phaseLabel: string | undefined;
  let activePlayerIds: string[] | undefined;
  let playerDetails: Record<string, string> | undefined;
  if (state && room?.status === 'in_game') {
    if ('auction' in state && state.auction) {
      const auction = state.auction;
      phaseLabel = t('Subasta abierta');
      activePlayerIds = state.players
        .filter(
          (p) =>
            !p.isBankrupt &&
            !auction.passedPlayerIds.includes(p.id) &&
            p.id !== auction.highestBidderId &&
            p.cash >= auction.currentBid + 10,
        )
        .map((p) => p.id);
    } else if ('votedIds' in state && state.phase === 'vote') {
      phaseLabel = t('Votación');
      activePlayerIds = state.physicalVoting
        ? [room.hostId]
        : room.players.filter((p) => !state.votedIds.includes(p.id)).map((p) => p.id);
      playerDetails = Object.fromEntries(
        room.players.map((p) => [
          p.id,
          state.physicalVoting
            ? p.id === room.hostId
              ? t('Recuento pendiente')
              : t('Recuento presencial')
            : state.votedIds.includes(p.id)
              ? t('Voto enviado')
              : t('Voto pendiente'),
        ]),
      );
    } else if ('strokes' in state && state.phase === 'draw') {
      phaseLabel = t('Dibujo y respuestas');
      activePlayerIds = state.players
        .filter(
          (p) =>
            !p.left &&
            (p.id === turn || (!state.guessed.includes(p.id) && (state.attempts[p.id] ?? 0) < 12)),
        )
        .map((p) => p.id);
      playerDetails = Object.fromEntries(
        room.players.map((p) => [
          p.id,
          p.id === turn
            ? t('Dibujando')
            : state.guessed.includes(p.id)
              ? t('Ya ha acertado')
              : (state.attempts[p.id] ?? 0) >= 12
                ? t('Sin intentos restantes')
                : t('Puede responder'),
        ]),
      );
    } else if ('incoming' in state && state.phase === 'placement') {
      phaseLabel = t('Preparación de flotas');
      activePlayerIds = state.players.filter((p) => !p.ready).map((p) => p.id);
      playerDetails = Object.fromEntries(
        state.players.map((p) => [p.id, p.ready ? t('Flota confirmada') : t('Preparando flota')]),
      );
    } else if ('wallCount' in state && state.phase === 'claim') phaseLabel = t('Reclamaciones');
  }
  return (
    <PlayerPreferencesProvider playerName={playerName} onUpdateName={updatePreferenceName}>
      <>
        {location.pathname === '/privacy' ? (
          <Privacy />
        ) : !room ? (
          <LobbyView
            playerName={playerName}
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
            onRemovePlayer={removePlayer}
            onChangeGame={changeGame}
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
            phaseLabel={phaseLabel}
            activePlayerIds={activePlayerIds}
            playerDetails={playerDetails}
            connectionNotice={
              !connected
                ? replaced
                  ? t('Esta sesión se ha abierto en otra conexión.')
                  : t('Reconectando… La partida continúa en automático mientras vuelves.')
                : undefined
            }
            onRecover={
              replaced
                ? () => {
                    replacement.current = false;
                    socket.connect();
                  }
                : undefined
            }
            information={notification ? gameText(notification) : undefined}
            onDismissInformation={() => setNotification(null)}
            error={error}
            onDismissError={() => setError(null)}
            winner={state.winner}
            isDraw={'isDraw' in state && state.isDraw}
            busy={busy || !connected}
            onRestart={restart}
            onRemovePlayer={removePlayer}
            inactivityPrompt={inactivityPrompt}
            onRespondToInactivity={respondToInactivity}
            onResolveAutoPlay={(playerId, decision) =>
              run(async () => {
                check(
                  await request<Result>((done) =>
                    socket.emit(
                      'room:resolve_autoplay',
                      { matchId: room.matchId, playerId, decision },
                      done,
                    ),
                  ),
                );
              })
            }
            onResumePlay={() =>
              run(async () => {
                check(
                  await request<Result>((done) =>
                    socket.emit('room:resume_play', { matchId: room.matchId }, done),
                  ),
                );
              })
            }
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
        {incompatible && (
          <Modal
            title={t('Hay una nueva versión de Sobremesa')}
            dismissable={false}
            onClose={() => {}}
          >
            <p>
              {t(
                'Actualiza la página para volver a conectar. Conservaremos tu sesión para intentar recuperar tu sala.',
              )}
            </p>
            <button className="button primary" onClick={() => location.reload()}>
              {t('Recargar la página')}
            </button>
          </Modal>
        )}
        {!connected && room && !(room.status === 'in_game' && state) && !incompatible && (
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
        {error && !(room?.status === 'in_game' && state) && (
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
    </PlayerPreferencesProvider>
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
