import { getGame, t, formatMoney, settingValue } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import {
  type RoomInfo,
  type GameType,
  GAME_CATALOG,
  type RoomRules,
  GAME_SETTINGS,
  defaultGameSettings,
  DEFAULT_CIUDAD_FORTUNA_RULES,
} from 'sobremesa-logic';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Copy,
  Crown,
  Link2,
  LayoutGrid,
  Plus,
  Search,
  Users,
  Clock3,
  Dice5,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { GameArtwork } from '../ui/GameArtwork';
import { PreferencesButton } from '../ui/Preferences';
import { Rules } from '../ui/Rules';
interface Props {
  room: RoomInfo;
  myPlayerId: string;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onStartGame: () => void;
  onRemovePlayer: (id: string) => Promise<boolean>;
  onChangeGame: (game: GameType) => Promise<boolean>;
  onLeaveRoom: () => void;
  onUpdateRules: (rules: unknown) => Promise<boolean>;
  busy: boolean;
  onError: (message: string) => void;
}
export function WaitingRoomView({
  room,
  myPlayerId,
  onAddBot,
  onRemoveBot,
  onStartGame,
  onRemovePlayer,
  onChangeGame,
  onLeaveRoom,
  onUpdateRules,
  busy,
  onError,
}: Props) {
  const [settings, setSettings] = useState<RoomRules & { turnSeconds: number }>(() => ({
    ...room.customRules,
    turnSeconds: room.turnSeconds,
  }));
  useEffect(() => {
    setSettings({ ...room.customRules, turnSeconds: room.turnSeconds });
  }, [room.code, room.customRules, room.turnSeconds]);
  const changeRules = async (patch: Record<string, number | boolean | null>) => {
    setSettings((current) => ({ ...current, ...patch }));
    if (!(await onUpdateRules(patch)))
      setSettings({ ...room.customRules, turnSeconds: room.turnSeconds });
  };
  const [removing, setRemoving] = useState<string | null>(null);
  const [removalError, setRemovalError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false),
    [gameSearch, setGameSearch] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const gameSearchRef = useRef<HTMLInputElement>(null);
  const game = getGame(room.gameType),
    host = room.hostId === myPlayerId;
  const editable = host && room.status === 'waiting';
  const botsAllowed =
    game.supportsBots !== false && !(room.gameType === 'impostor' && settings.impostorMode === 1);
  const playerCountValid =
    room.players.length >= room.minPlayers &&
    room.players.length <= room.maxPlayers &&
    (!game.playerCounts || game.playerCounts.includes(room.players.length));
  const normalizedSearch = normalizeSearch(gameSearch);
  const availableGames = GAME_CATALOG.map(({ id }) => getGame(id)).filter((option) =>
    normalizeSearch(`${option.name} ${option.description} ${option.id}`).includes(normalizedSearch),
  );
  const changeGame = async (id: GameType) => {
    if (id === room.gameType || (await onChangeGame(id))) setGamePickerOpen(false);
  };
  useEffect(() => {
    if (gamePickerOpen) gameSearchRef.current?.focus({ preventScroll: true });
  }, [gamePickerOpen]);
  const copy = async (link: boolean) => {
    try {
      await navigator.clipboard.writeText(
        link ? `${location.origin}/?room=${room.code}` : room.code,
      );
      setCopied(link ? 'link' : 'code');
      setTimeout(() => setCopied(null), 2500);
    } catch {
      onError(t('No se pudo copiar. Puedes seleccionar y compartir el código de la sala.'));
    }
  };
  return (
    <div className="room-page">
      <header className="game-header">
        <button className="back-link" onClick={onLeaveRoom}>
          <ArrowLeft size={18} /> <span>{t('Volver a los juegos')}</span>
        </button>
        <a className="compact-brand" href="/">
          <Dice5 size={22} /> sobremesa.
        </a>
        <div className="header-actions room-header-tools">
          <button
            className="button small secondary"
            aria-label={t('Cambiar juego')}
            aria-haspopup="dialog"
            aria-expanded={gamePickerOpen}
            title={t('Cambiar juego')}
            disabled={!host || busy}
            onClick={() => {
              setGameSearch('');
              setGamePickerOpen(true);
            }}
          >
            <LayoutGrid size={16} /> <span>{t('Cambiar juego')}</span>
          </button>
          <button
            className="button small secondary"
            aria-label={t('Reglas')}
            aria-haspopup="dialog"
            onClick={() => setRulesOpen(true)}
          >
            <BookOpen size={16} /> <span>{t('Reglas')}</span>
          </button>
          <PreferencesButton />
        </div>
      </header>
      <main className="waiting-content">
        <div className="waiting-intro">
          <p className="eyebrow">{t('SALA DE ESPERA')}</p>
          <h1>{game.name}</h1>
        </div>
        <div className="waiting-grid">
          <section className="panel waiting-players">
            <div className="section-row">
              <h2>{t('Jugadores')}</h2>
              <div className="waiting-player-meta">
                <span className="pill">
                  <Users size={15} /> {room.players.length}/{room.maxPlayers}
                </span>
                <span className="pill waiting-duration">
                  <Clock3 size={15} /> {game.duration}
                </span>
              </div>
            </div>
            <div className="invite-card">
              <div className="room-code-group">
                <div>
                  <span className="eyebrow">{t('CÓDIGO DE TU SALA')}</span>
                  <strong className="room-code-text">{room.code}</strong>
                </div>
                <button
                  className="icon-button room-code-copy"
                  aria-label={t('Copiar código de sala')}
                  onClick={() => copy(false)}
                >
                  {copied === 'code' ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <button
                className="button secondary invite-link-button"
                aria-label={
                  copied === 'link' ? t('Enlace copiado') : t('Copiar enlace de invitación')
                }
                onClick={() => copy(true)}
              >
                {copied === 'link' ? <Check size={17} /> : <Link2 size={17} />}
                <span className="button-label-full">
                  {copied === 'link' ? t('Enlace copiado') : t('Copiar enlace de invitación')}
                </span>
                <span className="button-label-short">
                  {copied === 'link' ? t('Enlace copiado') : t('Copiar enlace')}
                </span>
              </button>
            </div>
            <div className="waiting-room-actions">
              {host &&
                game.supportsBots !== false &&
                !(room.gameType === 'impostor' && room.customRules?.impostorMode === 1) &&
                room.players.length < room.maxPlayers && (
                  <button
                    className="button secondary full"
                    disabled={busy || !editable}
                    onClick={onAddBot}
                  >
                    <Plus size={17} />
                    <Bot size={18} /> {t('Añadir bot')}
                  </button>
                )}
              {host ? (
                <button
                  className="button primary full"
                  disabled={
                    busy ||
                    (room.status !== 'finished' &&
                      (!playerCountValid ||
                        room.players.some((p) => !p.connected) ||
                        (!botsAllowed && room.players.some((p) => p.isBot))))
                  }
                  onClick={onStartGame}
                >
                  {busy
                    ? t('Preparando…')
                    : room.status === 'finished'
                      ? t('Preparar otra partida')
                      : t('Empezar partida')}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <div className="waiting-host">
                  <span className="loading-dot" /> {t('El anfitrión iniciará la partida.')}{' '}
                </div>
              )}
            </div>
            <div className="waiting-player-list">
              {room.players.map((p, index) => (
                <div className="waiting-player" key={p.id}>
                  <span className={`player-avatar color-${index % 6}`}>
                    {p.isBot ? <Bot size={22} /> : p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>
                      {p.name}
                      {p.id === myPlayerId && <small> {t('(tú)')}</small>}
                    </strong>
                    <span>
                      {p.isBot
                        ? t('Bot · listo para jugar')
                        : p.connected
                          ? t('En la sala')
                          : t('Reconectando…')}
                    </span>
                  </div>
                  {p.isHost ? (
                    <span className="host-label">
                      <Crown size={14} /> {t('Anfitrión')}{' '}
                    </span>
                  ) : (
                    <span
                      className={`presence-dot ${p.connected ? '' : 'away'}`}
                      aria-hidden="true"
                    />
                  )}
                  {host && !p.isHost && (
                    <button
                      className="icon-button waiting-remove-button"
                      type="button"
                      aria-label={t(p.isBot ? 'Quitar bot' : 'Retirar a {0}', { '0': p.name })}
                      title={t(p.isBot ? 'Quitar bot' : 'Retirar a {0}', { '0': p.name })}
                      disabled={busy || (p.isBot ? room.status !== 'waiting' : false)}
                      onClick={(event) => {
                        event.currentTarget.focus({ preventScroll: true });
                        if (p.isBot) void onRemoveBot(p.id);
                        else {
                          setRemoving(p.id);
                          setRemovalError(false);
                        }
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <p className="free-seats">
                {t('{0} plazas libres', {
                  '0': Math.max(0, room.maxPlayers - room.players.length),
                })}
              </p>
            </div>
            <div className="waiting-start">
              {!playerCountValid && (
                <p className="notice" role="status">
                  {t(
                    'Este juego admite de {0} a {1} participantes. El grupo se conserva; ajusta las plazas antes de empezar.',
                    { '0': room.minPlayers, '1': room.maxPlayers },
                  )}
                </p>
              )}
              {room.players.some((p) => !p.connected) && (
                <p className="notice" role="status">
                  {t('Espera a que las personas desconectadas vuelvan o retíralas del grupo.')}
                </p>
              )}
              {!botsAllowed && room.players.some((p) => p.isBot) && (
                <p className="notice" role="status">
                  {t('Este juego requiere personas. Retira los bots antes de empezar.')}
                </p>
              )}
              <p>
                {game.playerCounts && !game.playerCounts.includes(room.players.length)
                  ? t('Números de participantes admitidos: {0}', {
                      '0': game.playerCounts.join(', '),
                    })
                  : room.players.length < room.minPlayers
                    ? t('Necesitas al menos {0} participantes para este juego.', {
                        '0': room.minPlayers,
                      })
                    : host
                      ? t('¿Estamos todos? Que empiece lo bueno.')
                      : t('Mientras esperas, puedes consultar las reglas.')}
              </p>
            </div>
          </section>
          <aside>
            <section className="panel room-settings" id="room-settings">
              <div className="room-settings-heading">
                <h2>{t('Opciones de la partida')}</h2>
                <div className="turn-setting">
                  <label className="field-label" htmlFor="turn-seconds">
                    {t('Tiempo por turno')}
                  </label>
                  <select
                    className="field"
                    id="turn-seconds"
                    disabled={!editable || busy}
                    value={settings.turnSeconds}
                    onChange={(e) => changeRules({ turnSeconds: Number(e.target.value) })}
                  >
                    {[30, 60, 90, 120, 180].map((n) => (
                      <option value={n} key={n}>
                        {n} s
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="settings-owner-note">
                {host
                  ? t(
                      'Los cambios se aplican a toda la sala. Puedes ajustarlos hasta que empiece la partida.',
                    )
                  : t('El anfitrión puede cambiar estas opciones antes de empezar.')}
              </p>
              {(GAME_SETTINGS[room.gameType] || []).map((setting) => (
                <div
                  className={`game-setting ${typeof setting.defaultValue === 'boolean' ? 'is-toggle' : 'is-select'}`}
                  key={setting.key}
                >
                  {typeof setting.defaultValue === 'boolean' ? (
                    <label className="toggle-row" htmlFor={`setting-${setting.key}`}>
                      <span>{t(setting.label)}</span>
                      <input
                        id={`setting-${setting.key}`}
                        aria-describedby={`setting-hint-${setting.key}`}
                        type="checkbox"
                        role="switch"
                        disabled={!editable || busy}
                        checked={Boolean(settings[setting.key] ?? setting.defaultValue)}
                        onChange={(e) => changeRules({ [setting.key]: e.target.checked })}
                      />
                    </label>
                  ) : (
                    <>
                      <label className="field-label" htmlFor={`setting-${setting.key}`}>
                        {t(setting.label)}
                      </label>
                      <select
                        className="field"
                        id={`setting-${setting.key}`}
                        disabled={!editable || busy}
                        value={Number(settings[setting.key] ?? setting.defaultValue)}
                        aria-describedby={`setting-hint-${setting.key}`}
                        onChange={(e) => changeRules({ [setting.key]: Number(e.target.value) })}
                      >
                        {setting.values!.map((value) => (
                          <option key={value} value={value}>
                            {settingValue(setting, value)}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <p className="form-hint" id={`setting-hint-${setting.key}`}>
                    {t(setting.description)}
                  </p>
                </div>
              ))}
              {!GAME_SETTINGS[room.gameType]?.length && room.gameType !== 'monopoly' && (
                <p className="form-hint">
                  {t(
                    'Este juego mantiene sus reglas clásicas. Puedes ajustar el tiempo por turno.',
                  )}
                </p>
              )}
              {room.gameType === 'monopoly' && (
                <section className="city-settings">
                  <div className="city-settings-grid">
                    <div className="city-setting-field">
                      <label className="field-label" htmlFor="starting-cash">
                        {t('Dinero inicial')}
                      </label>
                      <select
                        className="field"
                        id="starting-cash"
                        disabled={!editable || busy}
                        value={settings?.startingCash ?? 1500}
                        onChange={(e) => changeRules({ startingCash: Number(e.target.value) })}
                      >
                        {[1000, 1500, 2000, 2500].map((n) => (
                          <option key={n} value={n}>
                            {formatMoney(n)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="city-setting-field">
                      <label className="field-label" htmlFor="salary">
                        {t('Salario al pasar por Salida')}
                      </label>
                      <select
                        className="field"
                        id="salary"
                        disabled={!editable || busy}
                        value={settings?.salaryGO ?? 200}
                        onChange={(e) => changeRules({ salaryGO: Number(e.target.value) })}
                      >
                        {[200, 300, 400].map((n) => (
                          <option key={n} value={n}>
                            {n} €
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="city-setting-field">
                      <label className="field-label" htmlFor="max-rounds">
                        {t('Límite de rondas')}
                      </label>
                      <select
                        className="field"
                        id="max-rounds"
                        disabled={!editable || busy}
                        value={settings?.maxRounds ?? 'unlimited'}
                        onChange={(e) =>
                          changeRules({
                            maxRounds:
                              e.target.value === 'unlimited' ? null : Number(e.target.value),
                          })
                        }
                      >
                        <option value="unlimited">{t('Sin límite')}</option>
                        {[20, 40, 60].map((n) => (
                          <option key={n} value={n}>
                            {n} {t('rondas')}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(
                      [
                        ['jailFine', 'Multa para salir de la cárcel', [50, 100, 150]],
                        ['maxJailTurns', 'Intentos para salir con dobles', [1, 2, 3]],
                      ] as const
                    ).map(([key, label, values]) => (
                      <div className="city-setting-field" key={key}>
                        <label className="field-label" htmlFor={key}>
                          {t(label)}
                        </label>
                        <select
                          className="field"
                          id={key}
                          disabled={!editable || busy}
                          value={settings?.[key]}
                          onChange={(e) => changeRules({ [key]: Number(e.target.value) })}
                        >
                          {values.map((n) => (
                            <option value={n} key={n}>
                              {key === 'jailFine' ? formatMoney(n) : n}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {[
                      ['auctionEnabled', t('Subastar propiedades rechazadas')],
                      ['freeParkingPool', t('Acumular impuestos en el descanso')],
                      ['doubleGoSalary', t('Cobrar el doble al caer en Salida')],
                      ['doubleGoSalaryOnPass', t('Cobrar el doble al pasar por Salida')],
                      ['snakeEyesBonus', t('Recibir 500 € al sacar dobles de uno')],
                      ['rentInJail', t('Cobrar alquiler estando en la cárcel')],
                      ['evenBuilding', t('Construcción equilibrada')],
                    ].map(([key, label]) => (
                      <label className="toggle-row city-setting-toggle" key={key}>
                        <span>{t(label)}</span>
                        <input
                          type="checkbox"
                          role="switch"
                          disabled={!editable || busy}
                          checked={!!settings?.[key]}
                          onChange={(e) => changeRules({ [key]: e.target.checked })}
                        />
                      </label>
                    ))}
                  </div>
                </section>
              )}
              {host && (
                <button
                  className="button secondary full settings-reset"
                  disabled={busy}
                  onClick={() =>
                    changeRules({
                      ...defaultGameSettings(room.gameType),
                      ...(room.gameType === 'monopoly' ? DEFAULT_CIUDAD_FORTUNA_RULES : {}),
                      turnSeconds: 90,
                    })
                  }
                >
                  {t('Restablecer opciones')}
                </button>
              )}
            </section>
          </aside>
        </div>
      </main>
      {gamePickerOpen && (
        <Modal title={t('Cambiar juego')} wide onClose={() => setGamePickerOpen(false)}>
          <p className="muted">{t('El código de la sala y el grupo se conservan al cambiar.')}</p>
          <label className="field-label" htmlFor="room-game-search">
            {t('Buscar juegos')}
          </label>
          <div className="search-box room-game-picker-search">
            <Search size={18} aria-hidden="true" />
            <input
              id="room-game-search"
              ref={gameSearchRef}
              type="search"
              autoComplete="off"
              placeholder={t('Buscar juegos')}
              value={gameSearch}
              onChange={(event) => setGameSearch(event.target.value)}
            />
            {gameSearch && (
              <button
                type="button"
                aria-label={t('Borrar búsqueda')}
                onClick={() => setGameSearch('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          {availableGames.length ? (
            <ul className="room-game-picker-list">
              {availableGames.map((option) => {
                const isCurrent = option.id === room.gameType;
                const playerRange = option.playerCounts
                  ? option.playerCounts.join('/')
                  : `${option.minPlayers}–${option.maxPlayers}`;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      className={`room-game-option ${isCurrent ? 'selected' : ''}`}
                      data-game-id={option.id}
                      aria-pressed={isCurrent}
                      disabled={!host || busy}
                      onClick={() => void changeGame(option.id)}
                    >
                      <span className="room-game-option-art">
                        <GameArtwork game={option.id} />
                      </span>
                      <span className="room-game-option-copy">
                        <strong>{option.name}</strong>
                        <span className="room-game-option-meta">
                          {playerRange} {t('jugadores')} · {option.duration}
                        </span>
                        <span className="room-game-option-description">{option.description}</span>
                      </span>
                      <span className="room-game-option-check" aria-hidden="true">
                        {isCurrent && <Check size={18} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="room-game-picker-empty" role="status">
              {t('No se encontraron juegos.')}
            </p>
          )}
        </Modal>
      )}
      {rulesOpen && (
        <Rules gameType={room.gameType} room={room} onClose={() => setRulesOpen(false)} />
      )}
      {removing && (
        <Modal title={t('¿Retirar a este participante?')} onClose={() => setRemoving(null)}>
          <p>
            {t('Retirarás a {0} del grupo y se eliminará su reserva de reconexión.', {
              '0': room.players.find((p) => p.id === removing)?.name || '',
            })}
          </p>
          {removalError && (
            <p role="alert">
              {t('No se pudo retirar. Comprueba la conexión y el estado del participante.')}
            </p>
          )}
          <div className="choice-buttons">
            <button className="button secondary" onClick={() => setRemoving(null)}>
              {t('Cancelar')}
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                if (await onRemovePlayer(removing)) setRemoving(null);
                else setRemovalError(true);
              }}
            >
              {t('Retirar del grupo')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
