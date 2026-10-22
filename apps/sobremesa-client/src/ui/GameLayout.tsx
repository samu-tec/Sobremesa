import { getGame, t, LanguageSelector } from '../i18n';
import { TurnClock } from './TurnClock';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { type RoomInfo } from 'sobremesa-logic';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Trophy,
  RotateCcw,
  LogOut,
  Bot,
  Dice5,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Settings2,
  X,
} from 'lucide-react';
import { Modal } from './Modal';
import { Rules } from './Rules';
import {
  playSound,
  readSoundPreferences,
  setSoundPreferences,
  unlockSound,
} from '../services/sound';
interface GamePresentation {
  activePlayerIds?: string[];
  phaseLabel?: string;
  playerDetails?: Record<string, string>;
  notice?: ReactNode;
  clockInActions?: boolean;
}
const GamePresentationContext = createContext<GamePresentation>({});

export interface BoardProps<S, A> {
  room: RoomInfo;
  state: S;
  myPlayerId: string;
  onAction: (action: A) => void;
  busy: boolean;
}
export function GameLayout({
  room,
  myPlayerId,
  currentTurn,
  isAuction = false,
  phaseLabel,
  activePlayerIds,
  playerDetails,
  connectionNotice,
  information,
  onDismissInformation,
  onRecover,
  error,
  onDismissError,
  winner,
  winnerIds,
  resultNote,
  resultRows,
  isDraw,
  busy,
  onRestart,
  onReturnToGroup,
  onRemovePlayer,
  onConfirmPresence,
  onLeave,
  onError,
  children,
}: {
  room: RoomInfo;
  myPlayerId: string;
  currentTurn: string;
  isAuction?: boolean;
  phaseLabel?: string;
  activePlayerIds?: string[];
  playerDetails?: Record<string, string>;
  connectionNotice?: string;
  information?: string;
  onDismissInformation?: () => void;
  onRecover?: () => void;
  error?: string | null;
  onDismissError?: () => void;
  winner: string | null;
  winnerIds?: string[];
  resultNote?: string;
  resultRows?: { label: string; value: string }[];
  isDraw?: boolean;
  busy: boolean;
  onRestart: () => void;
  onReturnToGroup: () => void;
  onRemovePlayer: (id: string) => Promise<boolean>;
  onConfirmPresence: (challengeId: string, stay: boolean) => void;
  onLeave: () => void;
  onError: (m: string) => void;
  children: ReactNode;
}) {
  const [retiring, setRetiring] = useState<string | null>(null);
  const [retirementError, setRetirementError] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [settings, setSettings] = useState(false),
    [sound, setSound] = useState(readSoundPreferences),
    [immersive, setImmersive] = useState(false),
    [expanding, setExpanding] = useState(false),
    [messageOpen, setMessageOpen] = useState(false);
  const fullscreenOwned = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const changed = () => {
      if (!document.fullscreenElement && fullscreenOwned.current) {
        fullscreenOwned.current = false;
        setImmersive(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !document.querySelector('[role="dialog"]') &&
        !document.fullscreenElement
      )
        setImmersive(false);
    };
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('keydown', escape);
    return () => {
      mounted.current = false;
      document.removeEventListener('fullscreenchange', changed);
      document.removeEventListener('keydown', escape);
      if (fullscreenOwned.current && document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  const expand = async () => {
    if (expanding) return;
    setExpanding(true);
    if (immersive) {
      setImmersive(false);
      if (fullscreenOwned.current && document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          /* CSS mode remains available. */
        }
      }
      fullscreenOwned.current = false;
    } else {
      setImmersive(true);
      try {
        // Fullscreen the root so portals, dialogs and connection controls remain accessible.
        if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          if (mounted.current) fullscreenOwned.current = true;
          else if (document.fullscreenElement) await document.exitFullscreen();
        }
      } catch {
        /* Keep the CSS immersive mode when fullscreen is denied. */
      }
    }
    if (mounted.current) setExpanding(false);
  };
  const updateSound = (patch: Partial<typeof sound>) => {
    const next = { ...sound, ...patch };
    setSound(next);
    setSoundPreferences(next);
    if (next.enabled) unlockSound();
  };
  const [rules, setRules] = useState(false),
    [confirmLeave, setConfirmLeave] = useState(false),
    [copied, setCopied] = useState(false);
  const previousTurn = useRef<string | null>(null);
  const previousResult = useRef<boolean | null>(null);
  const game = getGame(room.gameType),
    finished = !!winner || !!isDraw,
    yourTurn = currentTurn === myPlayerId && !finished && !isAuction && !phaseLabel;
  useEffect(() => {
    if (!finished) setShowResult(true);
  }, [finished]);
  useEffect(() => {
    if (finished) {
      previousTurn.current = null;
      return;
    }
    if (isAuction || phaseLabel) {
      previousTurn.current = currentTurn;
      return;
    }
    if (currentTurn !== myPlayerId) {
      previousTurn.current = currentTurn;
      return;
    }
    if (previousTurn.current !== null && previousTurn.current !== myPlayerId) playSound('turn');
    previousTurn.current = myPlayerId;
  }, [currentTurn, finished, isAuction, phaseLabel, myPlayerId]);
  useEffect(() => {
    if (finished && previousResult.current === false)
      playSound(
        isDraw
          ? 'drawGame'
          : winner === myPlayerId || winnerIds?.includes(myPlayerId)
            ? 'win'
            : 'lose',
      );
    previousResult.current = finished;
  }, [finished, isDraw, winner, winnerIds, myPlayerId]);
  const disconnected = room.players.filter((p) => !p.connected);
  const reconnectMessage = disconnected.length
    ? t('{0} está reconectando. Reservamos su sitio durante {1} segundos.', {
        '0': disconnected.map((p) => p.name).join(', '),
        '1': Math.round(room.reconnectGraceMs / 1000),
      })
    : null;
  const message = error ? t(error) : connectionNotice || reconnectMessage || information;
  useEffect(() => setMessageOpen(false), [message]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError(t('No se pudo copiar el código.'));
    }
  };
  const notice = message ? (
    <div className={`game-message ${error ? 'game-message-error' : ''}`}>
      <button
        className="game-message-detail"
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          setMessageOpen(true);
        }}
      >
        <span role={error ? 'alert' : 'status'}>{message}</span>
      </button>
      {(error || information) && (
        <button
          className="icon-button"
          aria-label={t('Cerrar aviso')}
          onClick={error ? onDismissError : onDismissInformation}
        >
          <X size={16} />
        </button>
      )}
    </div>
  ) : null;
  return (
    <GamePresentationContext.Provider
      value={{
        activePlayerIds,
        phaseLabel: isAuction ? t('Subasta abierta') : phaseLabel,
        playerDetails,
        notice,
      }}
    >
      <div className={`room-page game-page ${immersive ? 'game-immersive' : ''}`}>
        {room.status === 'in_game' && room.presence?.playerId === myPlayerId && (
          <Modal title={t('¿Sigues en la partida?')} dismissable={false} onClose={() => {}}>
            <p>
              {t(
                'Tu decisión está pendiente. Confirma para disponer de 30 segundos más; después deberás jugar para continuar.',
              )}
            </p>
            <TurnClock room={room} />
            <div className="choice-buttons">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => onConfirmPresence(room.presence!.challengeId, true)}
              >
                {t('Sí, sigo jugando')}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => onConfirmPresence(room.presence!.challengeId, false)}
              >
                {t('Salir de la partida')}
              </button>
            </div>
          </Modal>
        )}
        <header className={`game-header play-header ${yourTurn ? 'is-your-turn' : ''}`}>
          <div className="play-start">
            <button
              className="back-link"
              aria-label={t('Salir de la partida')}
              title={t('Salir de la partida')}
              onClick={() => (finished ? onLeave() : setConfirmLeave(true))}
            >
              <ArrowLeft size={18} />
              <span>{t('Salir de la partida')}</span>
            </button>
            <span className="play-brand" role="img" aria-label="Sobremesa">
              <Dice5 size={25} />
              <span>
                sobremesa<span aria-hidden="true">.</span>
              </span>
            </span>
          </div>
          <div className="play-title">
            <h1>
              {game.name}
              <span className="game-heading-dot">.</span>
            </h1>
          </div>
          <div className="header-actions">
            <button
              className="button small secondary room-code-button secondary-game-tool"
              onClick={copy}
              aria-label={t('Copiar código de sala: {0}', { '0': room.code })}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{room.code}</span>
            </button>
            <button
              className="button small secondary"
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                setRules(true);
              }}
              aria-label={t('Reglas')}
              title={t('Reglas')}
            >
              <BookOpen size={18} />
              <span className="control-label">{t('Reglas')}</span>
            </button>
            <button
              className="button small secondary secondary-game-tool"
              onClick={() => void expand()}
              disabled={expanding}
              aria-pressed={immersive}
              aria-label={immersive ? t('Salir de pantalla completa') : t('Ampliar el juego')}
              title={immersive ? t('Salir de pantalla completa') : t('Ampliar el juego')}
            >
              {immersive ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button
              className="button small secondary secondary-game-tool"
              onClick={() => updateSound({ enabled: !sound.enabled })}
              aria-pressed={sound.enabled}
              aria-label={sound.enabled ? t('Silenciar sonido') : t('Activar sonido')}
              title={sound.enabled ? t('Silenciar sonido') : t('Activar sonido')}
            >
              {sound.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              className="button small secondary"
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                setSettings(true);
              }}
              aria-label={t('Preferencias de partida')}
              title={t('Preferencias de partida')}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </header>
        <main className={`game-content game-content-${room.gameType}`}>
          {finished && !showResult && (
            <button className="button secondary result-reopen" onClick={onReturnToGroup}>
              {t('Volver al grupo')}
            </button>
          )}
          {finished && !showResult && (
            <button className="button primary result-reopen" onClick={() => setShowResult(true)}>
              {t('Ver resultado')}
            </button>
          )}
          {children}
        </main>
        {settings && (
          <Modal title={t('Preferencias de partida')} onClose={() => setSettings(false)}>
            <div className="game-preferences">
              <div className="mobile-game-tools">
                <button className="button secondary" onClick={copy}>
                  {copied ? t('Copiado') : t('Copiar código de sala')}
                </button>
                <button
                  className="button secondary"
                  disabled={expanding}
                  onClick={() => {
                    setSettings(false);
                    void expand();
                  }}
                >
                  {immersive ? t('Salir de pantalla completa') : t('Ampliar el juego')}
                </button>
              </div>
              <LanguageSelector />
              <a className="text-button" href="/privacy" target="_blank" rel="noopener noreferrer">
                {t('Privacidad y uso')}
              </a>
              <label className="toggle-row">
                <span>{t('Sonido')}</span>
                <input
                  type="checkbox"
                  checked={sound.enabled}
                  onChange={(e) => updateSound({ enabled: e.target.checked })}
                />
              </label>
              <label className="field-label" htmlFor="game-volume">
                {t('Volumen')}: {Math.round(sound.volume * 100)}%
              </label>
              <input
                id="game-volume"
                type="range"
                min="0"
                max="100"
                value={Math.round(sound.volume * 100)}
                onChange={(e) => updateSound({ volume: Number(e.target.value) / 100 })}
              />
              <p className="muted">
                {t('Sonidos breves durante el juego. Se silencian al ocultar esta pestaña.')}
              </p>
              {room.hostId === myPlayerId && (
                <section className="group-management">
                  <h3>{t('Gestionar participantes')}</h3>
                  <p className="muted">
                    {t(
                      'Durante la partida solo puedes retirar personas desconectadas. El motor resolverá su abandono.',
                    )}
                  </p>
                  {room.players
                    .filter((p) => !p.isBot && p.id !== myPlayerId)
                    .map((p) => (
                      <div className="section-row" key={p.id}>
                        <span>
                          {p.name} · {p.connected ? t('En la sala') : t('Reconectando…')}
                        </span>
                        {!p.connected && (
                          <button
                            className="button small danger"
                            disabled={busy}
                            onClick={(event) => {
                              event.currentTarget.focus({ preventScroll: true });
                              setRetiring(p.id);
                              setRetirementError(false);
                            }}
                          >
                            {t('Retirar a {0}', { '0': p.name })}
                          </button>
                        )}
                      </div>
                    ))}
                </section>
              )}
            </div>
          </Modal>
        )}
        {messageOpen && message && (
          <Modal title={t('Aviso de partida')} onClose={() => setMessageOpen(false)}>
            <div className="game-message-full">{message}</div>
            {onRecover && (
              <button
                className="button primary"
                onClick={() => {
                  onRecover();
                  setMessageOpen(false);
                }}
              >
                {t('Recuperar aquí')}
              </button>
            )}
          </Modal>
        )}
        {rules && <Rules room={room} gameType={room.gameType} onClose={() => setRules(false)} />}
        {retiring && (
          <Modal title={t('¿Retirar a este participante?')} onClose={() => setRetiring(null)}>
            <p>
              {t('Retirarás a {0} del grupo y se eliminará su reserva de reconexión.', {
                '0': room.players.find((p) => p.id === retiring)?.name || '',
              })}
            </p>
            <p>
              {t(
                'El juego aplicará su política de abandono y continuará cuando sus reglas lo permitan.',
              )}
            </p>
            {retirementError && (
              <p role="alert">
                {t('No se pudo retirar. Comprueba la conexión y el estado del participante.')}
              </p>
            )}
            <div className="choice-buttons">
              <button className="button secondary" onClick={() => setRetiring(null)}>
                {t('Cancelar')}
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  if (await onRemovePlayer(retiring)) {
                    setRetiring(null);
                    setSettings(false);
                  } else setRetirementError(true);
                }}
              >
                {t('Retirar del grupo')}
              </button>
            </div>
          </Modal>
        )}
        {confirmLeave && (
          <Modal title={t('¿Quieres salir de la partida?')} onClose={() => setConfirmLeave(false)}>
            <p>{t('Si sales, abandonarás esta partida y no podrás volver a entrar en ella.')}</p>
            <div className="choice-buttons">
              <button className="button primary full" onClick={() => setConfirmLeave(false)}>
                {t('Seguir jugando')}{' '}
              </button>
              <button className="button danger full" onClick={onLeave}>
                <LogOut size={17} /> {t('Salir de la partida')}{' '}
              </button>
            </div>
          </Modal>
        )}
        {finished && showResult && (
          <Modal
            title={
              isDraw
                ? t('¡Habéis empatado!')
                : winnerIds?.includes(myPlayerId) || winner === myPlayerId
                  ? t('¡Has ganado!')
                  : t('Partida terminada')
            }
            onClose={() => {}}
            dismissable={false}
          >
            <div className="result-content">
              <span className="result-trophy">
                <Trophy size={48} />
              </span>
              <p>
                {isDraw ? (
                  t('La partida ha terminado en empate. ¿Jugamos otra?')
                ) : winnerIds && winnerIds.length > 1 ? (
                  t('Ganadores: {0}', {
                    '0': winnerIds
                      .map((id) => room.players.find((p) => p.id === id)?.name)
                      .filter(Boolean)
                      .join(', '),
                  })
                ) : (
                  <>
                    <strong>
                      {room.players.find((p) => p.id === winner)?.name || t('Tu rival')}
                    </strong>{' '}
                    {t('ha ganado la partida.')}{' '}
                  </>
                )}
              </p>
              {resultNote && <p>{resultNote}</p>}
              {resultRows && (
                <div className="result-scores">
                  {resultRows.map((row, i) => (
                    <div key={i}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              )}
              <button className="button secondary full" onClick={() => setShowResult(false)}>
                {t('Ver la mesa')}
              </button>
              <button className="button primary full" disabled={busy} onClick={onReturnToGroup}>
                {t('Volver al grupo')}
              </button>
              {room.hostId === myPlayerId ? (
                <button className="button primary full" disabled={busy} onClick={onRestart}>
                  <RotateCcw size={17} /> {t('Preparar otra partida')}{' '}
                </button>
              ) : (
                <p className="muted">{t('El anfitrión puede preparar otra partida.')}</p>
              )}
              <button className="button secondary full" disabled={busy} onClick={onLeave}>
                {t('Salir del grupo')} <ArrowLeft size={17} />
              </button>
            </div>
          </Modal>
        )}
      </div>
    </GamePresentationContext.Provider>
  );
}
export function PlayersPanel({
  room,
  myPlayerId,
  currentTurn,
  values,
  playerIcons,
}: {
  room: RoomInfo;
  myPlayerId: string;
  currentTurn: string;
  values?: Record<string, string>;
  playerIcons?: Record<string, ReactNode>;
}) {
  const presentation = useContext(GamePresentationContext);
  const active = (id: string) =>
    room.status === 'in_game' &&
    (presentation.activePlayerIds ? presentation.activePlayerIds.includes(id) : currentTurn === id);
  return (
    <section className="panel players-panel">
      <div className="section-row">
        <h2>{t('En la mesa')}</h2>
        <span className="muted">
          {room.players.length} {t('jugadores')}
        </span>
      </div>
      {presentation.phaseLabel && (
        <p className="phase-label" role="status">
          {presentation.phaseLabel}
        </p>
      )}
      {!presentation.clockInActions && <TurnClock room={room} />}
      {room.players.map((p, index) => (
        <div className={`table-player ${active(p.id) ? 'active' : ''}`} key={p.id}>
          <span className={`player-avatar color-${index % 6}`}>
            {playerIcons?.[p.id] ??
              (p.isBot ? <Bot size={20} /> : p.name.slice(0, 1).toUpperCase())}
          </span>
          <div>
            <strong>
              {p.name}
              {p.id === myPlayerId ? t(' (tú)') : ''}
            </strong>
            <small>
              {!p.connected
                ? t('Reconectando…')
                : presentation.playerDetails?.[p.id] ||
                  (active(p.id)
                    ? p.id === myPlayerId
                      ? t('Es tu turno')
                      : p.isBot
                        ? t('Bot jugando')
                        : t('Jugando ahora')
                    : p.isBot
                      ? 'Bot'
                      : t('En la mesa'))}
            </small>
          </div>
          {values?.[p.id] && <strong className="player-value">{values[p.id]}</strong>}
        </div>
      ))}
      {presentation.notice}
    </section>
  );
}
export function DiceFace({
  value,
  large = false,
  kept = false,
}: {
  value: number;
  large?: boolean;
  kept?: boolean;
}) {
  const positions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span
      data-kept={kept}
      className={`dice-face ${large ? 'large' : ''}`}
      role="img"
      aria-label={t('Dado: {0}', { '0': value })}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={positions[value]?.includes(i) ? 'pip' : ''} />
      ))}
    </span>
  );
}

export function BoardFrame({
  room,
  myPlayerId,
  turn,
  values,
  playerIcons,
  children,
  actions,
  motionRef,
  selectionActive,
  onCancelSelection,
}: {
  room: RoomInfo;
  myPlayerId: string;
  turn: string;
  values?: Record<string, string>;
  playerIcons?: Record<string, ReactNode>;
  children: ReactNode;
  actions?: ReactNode;
  motionRef?: Ref<HTMLDivElement>;
  selectionActive?: boolean;
  onCancelSelection?: () => void;
}) {
  const presentation = useContext(GamePresentationContext);
  const cancelControl = onCancelSelection && (
    <div className="board-selection-controls">
      <button
        className="button small secondary"
        disabled={!selectionActive}
        onClick={onCancelSelection}
      >
        {t('Cancelar selección')} <kbd>Esc</kbd>
      </button>
    </div>
  );
  return (
    <GamePresentationContext.Provider value={{ ...presentation, clockInActions: !!actions }}>
      <div
        className={`table-layout extended-table ${actions ? 'has-actions' : ''}`}
        ref={motionRef}
        onKeyDownCapture={(event) => {
          if (
            event.key === 'Escape' &&
            selectionActive &&
            onCancelSelection &&
            !(event.target as HTMLElement).closest('[role="dialog"]')
          ) {
            event.preventDefault();
            event.stopPropagation();
            onCancelSelection();
          }
        }}
      >
        {actions && (
          <ActionsPanel room={room}>
            {actions}
            {cancelControl}
          </ActionsPanel>
        )}
        <section className={`panel extended-play extended-${room.gameType}`}>
          {children}
          {!actions && cancelControl}
        </section>
        <aside className="table-sidebar">
          <PlayersPanel
            room={room}
            myPlayerId={myPlayerId}
            currentTurn={turn}
            values={values}
            playerIcons={playerIcons}
          />
        </aside>
      </div>
    </GamePresentationContext.Provider>
  );
}
export function RoundNotice({
  round,
  winner,
  room,
  onNext,
  disabled,
}: {
  round: number;
  winner: string | null;
  room: RoomInfo;
  onNext: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(true);
  const title = t('Ronda {0} terminada', { '0': round });
  return (
    <>
      <button className="button secondary round-notice-trigger" onClick={() => setOpen(true)}>
        {title}
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <div className="round-notice">
            <p>
              {winner
                ? t('Gana la ronda: {0}', { '0': room.players.find((p) => p.id === winner)?.name })
                : t('Ronda empatada. Nadie suma puntos.')}
            </p>
            <button className="button primary" disabled={disabled} onClick={onNext}>
              {t('Siguiente ronda')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Mantiene las coordenadas del tablero y evita saltar a otra fila al explorar con flechas.
export function moveBoardFocus(event: ReactKeyboardEvent<HTMLElement>, columns: number) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  const row = Math.floor(index / columns);
  const step =
    event.key === 'ArrowLeft'
      ? -1
      : event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp'
          ? -columns
          : event.key === 'ArrowDown'
            ? columns
            : 0;
  if (!step) return;
  event.preventDefault();
  for (let next = index + step; next >= 0 && next < buttons.length; next += step) {
    if (Math.abs(step) === 1 && Math.floor(next / columns) !== row) break;
    if (!buttons[next].disabled) {
      buttons[next].focus();
      return;
    }
  }
}

export function ActionsPanel({ room, children }: { room: RoomInfo; children: ReactNode }) {
  return (
    <aside className="panel game-actions-panel" aria-label={t('Acciones de partida')}>
      <TurnClock room={room} />
      {children}
    </aside>
  );
}
