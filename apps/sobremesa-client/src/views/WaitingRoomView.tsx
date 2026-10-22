import { getGame, t, LanguageSelector, formatMoney, settingValue } from '../i18n';
import { useEffect, useState } from 'react';
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
  Bot,
  Check,
  Copy,
  Crown,
  Link2,
  Plus,
  Trash2,
  Users,
  BookOpen,
  Settings2,
  Dice5,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Rules } from '../ui/Rules';
interface Props {
  room: RoomInfo;
  myPlayerId: string;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onStartGame: () => void;
  onRemovePlayer: (id: string) => Promise<boolean>;
  onChangeGame: (game: GameType) => Promise<boolean>;
  onViewResult?: () => void;
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
  onViewResult,
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
  const [rules, setRules] = useState(false),
    [copied, setCopied] = useState<string | null>(null);
  const game = getGame(room.gameType),
    host = room.hostId === myPlayerId;
  const editable = host && room.status === 'waiting';
  const botsAllowed =
    game.supportsBots !== false && !(room.gameType === 'impostor' && settings.impostorMode === 1);
  const playerCountValid =
    room.players.length >= room.minPlayers &&
    room.players.length <= room.maxPlayers &&
    (!game.playerCounts || game.playerCounts.includes(room.players.length));
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
        <LanguageSelector />
        <button className="back-link" onClick={onLeaveRoom}>
          <ArrowLeft size={18} /> {t('Volver a los juegos')}{' '}
        </button>
        <a className="compact-brand" href="/">
          <Dice5 size={22} /> sobremesa.
        </a>
        <button className="button small secondary" onClick={() => setRules(true)}>
          <BookOpen size={16} /> {t('Cómo jugar')}{' '}
        </button>
      </header>
      <main className="waiting-content">
        <div className="waiting-intro">
          <p className="eyebrow">{t('SALA DE ESPERA')}</p>
          <h1>{game.name}</h1>
        </div>
        <section className="panel room-game-selector" aria-label={t('Juego del grupo')}>
          <label className="field-label" htmlFor="group-game">
            {host ? t('Elegir juego para el grupo') : t('Juego elegido por el anfitrión')}
          </label>
          <select
            id="group-game"
            className="field"
            disabled={!host || busy}
            value={room.gameType}
            onChange={(e) => void onChangeGame(e.target.value as GameType)}
          >
            {GAME_CATALOG.map((g) => (
              <option value={g.id} key={g.id}>
                {getGame(g.id).name} ·{' '}
                {g.playerCounts ? g.playerCounts.join('/') : `${g.minPlayers}–${g.maxPlayers}`}{' '}
                {t('jugadores')} · {g.duration}
              </option>
            ))}
          </select>
          <p className="form-hint" role="status">
            {t('Ahora jugamos a {0}. El código y el grupo se conservan.', { '0': game.name })}
          </p>
          {onViewResult && (
            <button className="button secondary" onClick={onViewResult}>
              {t('Ver resultado')}
            </button>
          )}
        </section>
        <div className="waiting-grid">
          <section className="panel waiting-players">
            <div className="section-row">
              <h2>{t('Jugadores')}</h2>
              <span className="pill">
                <Users size={15} /> {room.players.length}/{room.maxPlayers}
              </span>
            </div>
            <div className="invite-card">
              <div>
                <span className="eyebrow">{t('CÓDIGO DE TU SALA')}</span>
                <strong className="room-code-text">{room.code}</strong>
              </div>
              <button
                className="icon-button"
                aria-label={t('Copiar código de sala')}
                onClick={() => copy(false)}
              >
                {copied === 'code' ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <button className="button secondary full" onClick={() => copy(true)}>
              {copied === 'link' ? <Check size={17} /> : <Link2 size={17} />}{' '}
              {copied === 'link' ? t('Enlace copiado') : t('Copiar enlace de invitación')}
            </button>
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
                  ) : p.isBot && host ? (
                    <button
                      disabled={busy || room.status !== 'waiting'}
                      className="icon-button"
                      aria-label={t('Quitar {0}', { '0': p.name })}
                      onClick={() => onRemoveBot(p.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : host && !p.isBot && p.id !== myPlayerId ? (
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={t('Retirar a {0}', { '0': p.name })}
                      onClick={(event) => {
                        event.currentTarget.focus({ preventScroll: true });
                        setRemoving(p.id);
                        setRemovalError(false);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : (
                    <span className={`presence-dot ${p.connected ? '' : 'away'}`} />
                  )}
                </div>
              ))}
              <p className="free-seats">
                {t('{0} plazas libres', {
                  '0': Math.max(0, room.maxPlayers - room.players.length),
                })}
              </p>
            </div>
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
                  <Bot size={18} /> {t('Añadir bot')}{' '}
                </button>
              )}
            <div className="waiting-start">
              {host && (
                <button
                  className="text-button"
                  onClick={() => {
                    const section = document.getElementById(
                      'room-settings',
                    ) as HTMLDetailsElement | null;
                    if (section) {
                      section.open = true;
                      section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }}
                >
                  <Settings2 size={16} />
                  {t('Configurar partida')}
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
            <section className="panel waiting-game">
              <p className="active-settings-summary">
                {(GAME_SETTINGS[room.gameType] || [])
                  .map(
                    (option) =>
                      `${t(option.label)}: ${typeof option.defaultValue === 'boolean' ? t(settings[option.key] ? 'Sí' : 'No') : settingValue(option, Number(settings[option.key] ?? option.defaultValue))}`,
                  )
                  .join(' · ')}
              </p>
              <div className="game-meta">
                <span>
                  <Users size={15} /> {game.minPlayers}–{game.maxPlayers} {t('jugadores')}{' '}
                </span>
                <span>{game.duration}</span>
              </div>
              <button className="text-button" onClick={() => setRules(true)}>
                {t('Ver las reglas')} <ArrowUpRightIcon />
              </button>
            </section>
            <details className="panel room-settings" id="room-settings">
              <summary>
                <Settings2 size={18} /> {t('Opciones de la partida')} · {settings.turnSeconds} s
              </summary>

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
              <p className="form-hint">
                {t(
                  'Cuando tu decisión bloquee la partida, tendrás 15 segundos para confirmar tu presencia y una única prórroga de 30 segundos. Los plazos propios de las reglas se mantienen.',
                )}
              </p>
              <p className="settings-owner-note">
                {host
                  ? t(
                      'Los cambios se aplican a toda la sala. Puedes ajustarlos hasta que empiece la partida.',
                    )
                  : t('El anfitrión puede cambiar estas opciones antes de empezar.')}
              </p>
              {(GAME_SETTINGS[room.gameType] || []).map((setting) => (
                <div className="game-setting" key={setting.key}>
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
              {room.gameType === 'monopoly' && (
                <section className="city-settings">
                  <p>
                    {host
                      ? t('Ajusta las opciones antes de empezar.')
                      : t('Estas son las opciones elegidas por el anfitrión.')}
                  </p>
                  <label className="field-label" htmlFor="starting-cash">
                    {t('Dinero inicial')}{' '}
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
                  <label className="field-label" htmlFor="salary">
                    {t('Salario al pasar por Salida')}{' '}
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
                  <label className="field-label" htmlFor="max-rounds">
                    {t('Límite de rondas')}{' '}
                  </label>
                  <select
                    className="field"
                    id="max-rounds"
                    disabled={!editable || busy}
                    value={settings?.maxRounds ?? 'unlimited'}
                    onChange={(e) =>
                      changeRules({
                        maxRounds: e.target.value === 'unlimited' ? null : Number(e.target.value),
                      })
                    }
                  >
                    <option value="unlimited">{t('Sin límite')}</option>
                    {[20, 40, 60].map((n) => (
                      <option key={n} value={n}>
                        {n} {t('rondas')}{' '}
                      </option>
                    ))}
                  </select>
                  {(
                    [
                      ['jailFine', 'Multa para salir de la cárcel', [50, 100, 150]],
                      ['maxJailTurns', 'Intentos para salir con dobles', [1, 2, 3]],
                    ] as const
                  ).map(([key, label, values]) => (
                    <div key={key}>
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
                    ['rentInJail', t('Cobrar alquiler estando en la cárcel')],
                    ['evenBuilding', t('Construcción equilibrada')],
                  ].map(([key, label]) => (
                    <label className="toggle-row" key={key}>
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
                </section>
              )}
            </details>
          </aside>
        </div>
      </main>
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
      {rules && <Rules room={room} gameType={game.id} onClose={() => setRules(false)} />}
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} />;
}
