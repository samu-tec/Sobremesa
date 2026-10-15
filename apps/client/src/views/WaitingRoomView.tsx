import { getGame, t, LanguageSelector, formatMoney } from '../i18n';
import { useEffect, useState } from 'react';
import { type RoomInfo } from '@games/game-logic';
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
import { GameArtwork } from '../ui/GameArtwork';
import { Rules } from '../ui/Rules';
interface Props {
  room: RoomInfo;
  myPlayerId: string;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onStartGame: () => void;
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
  onLeaveRoom,
  onUpdateRules,
  busy,
  onError,
}: Props) {
  const [settings, setSettings] = useState(() => ({
    ...room.customRules,
    turnSeconds: room.turnSeconds,
  }));
  useEffect(() => {
    setSettings({ ...room.customRules, turnSeconds: room.turnSeconds });
  }, [room.code, room.customRules, room.turnSeconds]);
  const changeRules = async (patch: Record<string, number | boolean>) => {
    setSettings((current: Record<string, number | boolean>) => ({ ...current, ...patch }));
    if (!(await onUpdateRules(patch)))
      setSettings({ ...room.customRules, turnSeconds: room.turnSeconds });
  };
  const [rules, setRules] = useState(false),
    [copied, setCopied] = useState<string | null>(null);
  const game = getGame(room.gameType),
    host = room.hostId === myPlayerId;
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
          <p className="eyebrow">{t('TODO LISTO PARA PASARLO BIEN')}</p>
          <h1>{t('Ve haciendo sitio en la mesa.')}</h1>
          <p>
            {t('Invita a tus amigos o añade un bot. La próxima partida está a punto de empezar.')}
          </p>
        </div>
        <div className="waiting-grid">
          <section className="panel waiting-players">
            <div className="section-row">
              <h2>{t('La mesa de juego')}</h2>
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
                      disabled={busy}
                      className="icon-button"
                      aria-label={t('Quitar {0}', { '0': p.name })}
                      onClick={() => onRemoveBot(p.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : (
                    <span className={`presence-dot ${p.connected ? '' : 'away'}`} />
                  )}
                </div>
              ))}
              {Array.from({ length: room.maxPlayers - room.players.length }, (_, i) => (
                <div className="waiting-player empty-seat" key={i}>
                  <span className="empty-avatar">
                    <Users size={20} />
                  </span>
                  <span>{t('Sitio libre para alguien más')}</span>
                </div>
              ))}
            </div>
            {host && room.players.length < room.maxPlayers && (
              <button className="button secondary full" disabled={busy} onClick={onAddBot}>
                <Plus size={17} />
                <Bot size={18} /> {t('Añadir bot')}{' '}
              </button>
            )}
            <div className="waiting-start">
              {host && (
                <button
                  className="text-button"
                  onClick={() =>
                    document
                      .getElementById('room-settings')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
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
                    room.players.length < room.minPlayers ||
                    room.players.some((p) => !p.connected)
                  }
                  onClick={onStartGame}
                >
                  {busy ? t('Preparando…') : t('Empezar partida')}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <div className="waiting-host">
                  <span className="loading-dot" /> {t('El anfitrión iniciará la partida.')}{' '}
                </div>
              )}
              <p>
                {room.players.length < room.minPlayers
                  ? t('Necesitas al menos dos jugadores. Puedes añadir un bot.')
                  : host
                    ? t('¿Estamos todos? Que empiece lo bueno.')
                    : t('Mientras esperas, puedes consultar las reglas.')}
              </p>
            </div>
          </section>
          <aside>
            <section className="panel waiting-game">
              <div className="waiting-game-art">
                <GameArtwork game={game.id} />
              </div>
              <span className="eyebrow">{t('HOY JUGAMOS A')}</span>
              <h2>{game.name}</h2>
              <p>{game.description}</p>
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
            <section className="panel room-settings" id="room-settings">
              <h3>
                <Settings2 size={18} /> {t('Reglas de la mesa')}
              </h3>
              <label className="field-label" htmlFor="turn-seconds">
                {t('Tiempo por turno')}
              </label>
              <select
                className="field"
                id="turn-seconds"
                disabled={!host || busy}
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
                  'Al agotarse el tiempo, se completa una jugada automática. En las subastas, cada puja tiene su propio plazo.',
                )}
              </p>
              {room.gameType === 'colorclash' && (
                <>
                  <label className="field-label" htmlFor="starting-cards">
                    {t('Cartas iniciales')}
                  </label>
                  <select
                    className="field"
                    id="starting-cards"
                    disabled={!host || busy}
                    value={settings?.startingCards ?? 7}
                    onChange={(e) => changeRules({ startingCards: Number(e.target.value) })}
                  >
                    {[5, 7, 9].map((n) => (
                      <option value={n} key={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </section>
            {room.gameType === 'monopoly' && (
              <section className="panel room-settings">
                <h3>
                  <Settings2 size={18} /> {t('Reglas de la mesa')}{' '}
                </h3>
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
                  disabled={!host || busy}
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
                  disabled={!host || busy}
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
                  disabled={!host || busy}
                  value={settings?.maxRounds ?? 40}
                  onChange={(e) => changeRules({ maxRounds: Number(e.target.value) })}
                >
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
                      disabled={!host || busy}
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
                      disabled={!host || busy}
                      checked={!!settings?.[key]}
                      onChange={(e) => changeRules({ [key]: e.target.checked })}
                    />
                  </label>
                ))}
              </section>
            )}
          </aside>
        </div>
      </main>
      {rules && <Rules room={room} gameType={game.id} onClose={() => setRules(false)} />}
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} />;
}
