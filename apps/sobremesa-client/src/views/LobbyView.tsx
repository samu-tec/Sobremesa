import { useLocale, localizeGame, t } from '../i18n';
import { randomName } from '../ui/Welcome';
import { lazy, Suspense, useState } from 'react';
const LocalImpostor = lazy(() =>
  import('../components/LocalImpostor').then((m) => ({ default: m.LocalImpostor })),
);

import { GAME_CATALOG as BASE_CATALOG, matchesGame, type GameType } from 'sobremesa-logic';
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Search,
  SlidersHorizontal,
  Users,
  Clock3,
  Heart,
  BookOpen,
  X,
  Sparkles,
  CirclePlay,
  Link2,
  MousePointer2,
} from 'lucide-react';
import { Shell } from '../ui/Shell';
import { GameArtwork } from '../ui/GameArtwork';
import { Rules } from '../ui/Rules';
import { Modal } from '../ui/Modal';
interface Props {
  playerName: string;
  onUpdatePlayerName: (value: string) => void;
  connected: boolean;
  onCreateRoom: (game: GameType) => void;
  onJoinRoom: (code: string) => void;
  onQuickPlayVsBot: (game: GameType) => void;
  isConnecting: boolean;
  inviteCode: string | null;
}
export function LobbyView({
  playerName,
  onUpdatePlayerName,
  connected,
  onCreateRoom,
  onJoinRoom,
  onQuickPlayVsBot,
  isConnecting,
  inviteCode,
}: Props) {
  const { locale } = useLocale();
  const GAME_CATALOG = BASE_CATALOG.map(localizeGame);
  const [localImpostor, setLocalImpostor] = useState(false);
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('Todos'),
    [view, setView] = useState<'all' | 'favorites'>('all');
  const [rules, setRules] = useState<GameType | null>(null),
    [selected, setSelected] = useState<GameType | null>(null);
  const [showJoin, setShowJoin] = useState(!!inviteCode),
    [showHelp, setShowHelp] = useState(false),
    [showProfile, setShowProfile] = useState(false);
  const [roomCode, setRoomCode] = useState(inviteCode || ''),
    [draftName, setDraftName] = useState(playerName);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('sobremesa.favorites') || '[]');
      return Array.isArray(saved) ? saved.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  });
  const toggleFavorite = (id: GameType) => {
    const next = favorites.includes(id) ? favorites.filter((v) => v !== id) : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem('sobremesa.favorites', JSON.stringify(next));
    } catch {
      /* Optional preference. */
    }
  };
  const games = GAME_CATALOG.filter(
    (g) =>
      matchesGame(g, query) &&
      (category === 'Todos' || g.category === category) &&
      (view !== 'favorites' || favorites.includes(g.id)),
  );
  const game = GAME_CATALOG.find((g) => g.id === selected);
  const playDisabled = isConnecting || !connected;
  if (localImpostor)
    return (
      <Suspense fallback={<p role="status">{t('Preparando partida local…')}</p>}>
        <LocalImpostor onLeave={() => setLocalImpostor(false)} />
      </Suspense>
    );
  return (
    <Shell
      playerName={playerName}
      connected={connected}
      view={view}
      onView={(next) => {
        setView(next);
        setCategory('Todos');
        setQuery('');
      }}
      onHelp={() => setShowHelp(true)}
      onProfile={() => {
        setDraftName(playerName);
        setShowProfile(true);
      }}
      onJoin={() => setShowJoin(true)}
    >
      <div className="page-intro">
        <div>
          <p className="eyebrow">
            <span /> {t('BIENVENIDO A LA MESA')}{' '}
          </p>
          <h1>{t('Elige un juego y reúne a tus amigos.')}</h1>
          <p>{t('Los clásicos que te gustan, a un clic de distancia.')}</p>
        </div>
        <span className="intro-stamp">
          <Sparkles size={17} /> {t('Buenos ratos, gratis')}{' '}
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span /> {t('UN PLAN PARA COMPARTIR')}{' '}
          </span>
          <h2>
            {t('Una partida más.')} <br />
            <em>{t('Y ya nos vamos.')}</em>
          </h2>
          <p>
            {t('Ese pique sano. Esa última carta. Esa tirada de suerte.')}{' '}
            <br className="desktop-break" /> {t('Tu próxima sobremesa empieza aquí.')}{' '}
          </p>
          <div className="hero-actions">
            <a className="button light" href="#games">
              {t('Encuentra tu juego')} <ArrowRight size={17} />
            </a>
            <button className="hero-join" onClick={() => setShowJoin(true)}>
              {t('Tengo un código')} <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="hero-note">
            <span className="stacked-avatars">
              <i>A</i>
              <i>M</i>
              <i>S</i>
            </span>
            <span>
              {t('Con amigos o contra un bot.')} <br />
              <strong>{t('Siempre hay sitio para una partida.')}</strong>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" />
          <div className="hero-floating-label">
            {t('EL CLÁSICO, A TU MANERA')} <span>↘</span>
          </div>
          <GameArtwork game="monopoly" hero />
          <span className="hero-bubble">
            <span>✳</span> {t('Que la suerte te acompañe.')}{' '}
          </span>
          <span className="hero-spark">✧</span>
        </div>
      </section>
      <section id="games" className="catalog" aria-label={t('Catálogo de juegos')}>
        <div className="catalog-heading">
          <div>
            <span className="eyebrow">{t('A QUÉ JUGAMOS HOY')}</span>
            <h2>
              {view === 'favorites' ? t('Tus favoritos') : t('Elige a qué jugar')}
              <span className="count-badge">{games.length}</span>
            </h2>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input
              type="search"
              placeholder={t('Busca tu próximo juego…')}
              aria-label={t('Buscar juegos')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label={t('Limpiar búsqueda')} onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
            <span className="search-hint">⌕</span>
          </label>
        </div>
        <div className="filter-row">
          <div className="category-tabs" aria-label={t('Categorías')}>
            {['Todos', ...new Set(BASE_CATALOG.map((game) => game.category))].map((cat) => (
              <button
                key={t(cat)}
                onClick={() => setCategory(cat)}
                aria-pressed={category === cat}
                className={category === cat ? 'active' : ''}
              >
                {cat === 'Todos' && <SlidersHorizontal size={14} />} {t(cat)}
              </button>
            ))}
          </div>
          <span className="catalog-count">
            {games.length} {t(games.length === 1 ? 'juego' : 'juegos')} {t('· todos gratis')}{' '}
          </span>
        </div>
        {!games.length ? (
          <div className="empty-results">
            <Search size={32} />
            <h3>
              {view === 'favorites' && !favorites.length
                ? t('Tu mesa de favoritos está vacía')
                : t('No encontramos ese juego')}
            </h3>
            <p>
              {view === 'favorites' && !favorites.length
                ? t('Pulsa el corazón de un juego para tenerlo siempre a mano.')
                : t('Prueba con otro nombre o cambia los filtros.')}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery('');
                setCategory('Todos');
                setView('all');
              }}
            >
              {t('Ver todos los juegos')}{' '}
            </button>
          </div>
        ) : (
          <div className="games-grid">
            {games.map((g, index) => (
              <article
                className={`game-card game-${g.id}`}
                key={g.id}
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="game-card-art">
                  <button
                    className="art-open"
                    aria-label={t('Jugar a {0}', { '0': g.name })}
                    disabled={playDisabled}
                    onClick={() => setSelected(g.id)}
                  >
                    <GameArtwork game={g.id} />
                  </button>
                  <span className="game-category">{t(g.category)}</span>
                  <button
                    className={`favorite-button ${favorites.includes(g.id) ? 'is-favorite' : ''}`}
                    aria-pressed={favorites.includes(g.id)}
                    aria-label={t(
                      favorites.includes(g.id)
                        ? 'Quitar {0} de favoritos'
                        : 'Añadir {0} a favoritos',
                      { '0': g.name },
                    )}
                    onClick={() => toggleFavorite(g.id)}
                  >
                    <Heart size={17} fill={favorites.includes(g.id) ? 'currentColor' : 'none'} />
                  </button>
                  {g.id === 'monopoly' && (
                    <span className="featured-tag">
                      <span /> {t('FAVORITO DE LA MESA')}{' '}
                    </span>
                  )}
                </div>
                <div className="game-card-body">
                  <div className="game-title-row">
                    <h3>
                      <button onClick={() => setSelected(g.id)}>{g.name}</button>
                    </h3>
                    <button
                      className="rules-button"
                      onClick={() => setRules(g.id)}
                      aria-label={t('Reglas de {0}', { '0': g.name })}
                      title={t('Cómo jugar')}
                    >
                      <BookOpen size={16} />
                    </button>
                  </div>
                  <p className="game-description">{g.description}</p>
                  <div className="game-meta">
                    <span>
                      <Users size={14} />
                      {g.minPlayers === g.maxPlayers
                        ? g.minPlayers
                        : `${g.minPlayers}–${g.maxPlayers}`}{' '}
                      {t('jugadores')}{' '}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      {g.duration}
                    </span>
                  </div>
                  <div className="game-card-actions">
                    <button
                      className="play-friends"
                      disabled={playDisabled}
                      onClick={() => onCreateRoom(g.id)}
                    >
                      {t('Jugar con amigos')} <ArrowUpRight size={16} />
                    </button>
                    {g.supportsBots !== false && (
                      <button
                        className="play-bot"
                        disabled={playDisabled}
                        onClick={() => onQuickPlayVsBot(g.id)}
                        aria-label={t('Jugar a {0} contra un bot', { '0': g.name })}
                        title={t('Jugar contra un bot')}
                      >
                        <Bot size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="how-strip">
        <div className="how-strip-icon">
          <MousePointer2 size={24} />
        </div>
        <div>
          <h3>{t('Menos preparativos. Más partidas.')}</h3>
          <p>{t('Elige un juego, comparte el código y que empiece lo bueno.')}</p>
        </div>
        <button onClick={() => setShowHelp(true)}>
          {t('Así de fácil')} <ArrowRight size={17} />
        </button>
      </section>
      {rules && <Rules gameType={rules} onClose={() => setRules(null)} />}
      {game && (
        <Modal title={game.name} onClose={() => setSelected(null)}>
          <div className="modal-art">
            <GameArtwork game={game.id} />
          </div>
          <p>{game.description}</p>
          <p className="muted">
            {game.minPlayers}–{game.maxPlayers} {t('jugadores ·')} {game.duration}
          </p>
          <div className="choice-buttons">
            {game.id === 'impostor' && (
              <button
                className="button secondary full"
                onClick={() => {
                  setSelected(null);
                  setLocalImpostor(true);
                }}
              >
                {t('Presencial con un solo móvil')}
              </button>
            )}
            <button
              className="button primary full"
              disabled={playDisabled}
              onClick={() => onCreateRoom(game.id)}
            >
              <Users size={18} /> {t('Crear sala con amigos')} <ArrowRight size={17} />
            </button>
            {game.supportsBots !== false && (
              <button
                className="button secondary full"
                disabled={playDisabled}
                onClick={() => onQuickPlayVsBot(game.id)}
              >
                <Bot size={18} /> {t('Jugar ahora contra un bot')}{' '}
              </button>
            )}
            <button
              className="text-button"
              onClick={() => {
                setRules(game.id);
                setSelected(null);
              }}
            >
              {t('Leer las reglas')}{' '}
            </button>
          </div>
        </Modal>
      )}
      {showJoin && (
        <Modal title={t('Tu sitio está en la mesa')} onClose={() => setShowJoin(false)}>
          <p className="muted">
            {t('Introduce el código de seis caracteres que te han compartido.')}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onJoinRoom(roomCode);
            }}
          >
            <label className="field-label" htmlFor="room-code">
              {t('Código de la sala')}{' '}
            </label>
            <input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              id="room-code"
              className="field code-field"
              placeholder="ABC234"
              maxLength={6}
              minLength={6}
              pattern="[A-HJ-NP-Za-hj-np-z2-9]{6}"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
              required
            />
            <p className="form-hint">
              {t('Entrarás como')} <strong>{playerName}</strong>.
            </p>
            <button
              className="button primary full"
              disabled={playDisabled || roomCode.length !== 6}
              type="submit"
            >
              {isConnecting ? t('Entrando…') : t('Unirme a la partida')} <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
      {showProfile && (
        <Modal title={t('¿Cómo te llamamos?')} onClose={() => setShowProfile(false)}>
          <p className="muted">{t('Tus amigos verán este nombre en las partidas.')}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdatePlayerName(draftName);
              setShowProfile(false);
            }}
          >
            <label className="field-label" htmlFor="player-name">
              {t('Tu nombre')}{' '}
            </label>
            <input
              className="field"
              id="player-name"
              autoComplete="nickname"
              maxLength={24}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
            />
            <p className="form-hint">
              {t('Hasta 24 caracteres. Puedes cambiarlo antes de cada partida.')}{' '}
            </p>
            <button
              type="button"
              className="button secondary full"
              onClick={() => setDraftName(randomName(locale))}
            >
              {t('Nombre aleatorio')}
            </button>
            <button className="button primary full" disabled={!draftName.trim()}>
              {t('Guardar nombre')}{' '}
            </button>
          </form>
        </Modal>
      )}
      {showHelp && (
        <Modal title={t('En tres pasos, jugando')} onClose={() => setShowHelp(false)}>
          <div className="how-steps">
            <div>
              <span>01</span>
              <div>
                <h3>{t('Encuentra tu juego')}</h3>
                <p>{t('Busca un clásico, explora las categorías o elige uno de tus favoritos.')}</p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>{t('Invita a los tuyos')}</h3>
                <p>
                  {t(
                    'Crea una sala y comparte su enlace o su código. También puedes añadir bots o empezar solo contra uno.',
                  )}{' '}
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>{t('Que empiece la partida')}</h3>
                <p>
                  {t(
                    'El anfitrión pulsa Empezar. Puedes consultar las reglas en cualquier momento y proponer una revancha al terminar.',
                  )}{' '}
                </p>
              </div>
            </div>
          </div>
          <div className="tip">
            <Link2 size={22} />
            <p>
              {t(
                'Si se corta tu conexión, vuelve desde la misma pestaña en menos de cinco minutos para recuperar tu sitio.',
              )}{' '}
            </p>
          </div>
          <button className="button primary full" onClick={() => setShowHelp(false)}>
            {t('Vamos a jugar')} <CirclePlay size={18} />
          </button>
        </Modal>
      )}
    </Shell>
  );
}
