import { t, LanguageSelector } from '../i18n';
import { GAME_CATALOG } from 'sobremesa-logic';
import type { ReactNode } from 'react';
import {
  Dice5,
  LayoutGrid,
  Heart,
  HelpCircle,
  ArrowUpRight,
  Wifi,
  WifiOff,
  UserRound,
} from 'lucide-react';
export function Shell({
  children,
  playerName,
  connected,
  view,
  onView,
  onHelp,
  onProfile,
  onJoin,
}: {
  children: ReactNode;
  playerName: string;
  connected: boolean;
  view: 'all' | 'favorites';
  onView: (view: 'all' | 'favorites') => void;
  onHelp: () => void;
  onProfile: () => void;
  onJoin: () => void;
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t('Saltar al contenido')}{' '}
      </a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label={t('Sobremesa, inicio')}>
          <span className="brand-mark">
            <Dice5 size={26} />
          </span>
          <span>
            sobremesa<span className="brand-dot">.</span>
            <small>{t('JUEGA. CONECTA. REPITE.')}</small>
          </span>
        </a>
        <div className="sidebar-group">
          <p className="nav-label">{t('TU ESPACIO')}</p>
          <nav aria-label={t('Navegación principal')}>
            <button
              className={view === 'all' ? 'nav-item selected' : 'nav-item'}
              onClick={() => onView('all')}
            >
              <LayoutGrid size={18} /> {t('Todos los juegos')} <span>{GAME_CATALOG.length}</span>
            </button>
            <button
              className={view === 'favorites' ? 'nav-item selected' : 'nav-item'}
              onClick={() => onView('favorites')}
            >
              <Heart size={18} /> {t('Mis favoritos')}{' '}
            </button>
            <button className="nav-item" onClick={onHelp}>
              <HelpCircle size={18} /> {t('Cómo funciona')} <ArrowUpRight size={14} />
            </button>
          </nav>
        </div>
        <div className="sidebar-invite">
          <span className="tiny-star">✳</span>
          <h3>{t('Mejor en compañía.')}</h3>
          <p>{t('¿Tus amigos ya están jugando? Tu sitio está en la mesa.')}</p>
          <button onClick={onJoin}>
            {t('Unirme a una sala')} <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="sidebar-footnote">
            {t('Sin registro. Sin descargas.')} <br />
            {t('Solo ganas de pasarlo bien.')}{' '}
          </span>
          <button className="profile-button" onClick={onProfile}>
            <span className="profile-avatar">{playerName.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{playerName}</strong>
              <small>{t('Perfil de invitado')}</small>
            </span>
            <UserRound size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-title">
            <span className="mobile-logo">
              <Dice5 size={23} />
            </span>
            {t('Tu sala de juegos')}{' '}
          </span>
          <div className="topbar-right">
            <LanguageSelector />
            <span className={`connection ${connected ? '' : 'offline'}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{connected ? t('Listo para jugar') : t('Conectando…')}</span>
            </span>
            <span className="topbar-divider" />
            <button className="topbar-profile" onClick={onProfile}>
              <span className="mini-avatar">{playerName.slice(0, 1).toUpperCase()}</span>
              <span>{playerName}</span>
            </button>
          </div>
        </header>
        <main id="main" className="lobby-main">
          {children}
        </main>
        <footer className="site-footer">
          <a href="/privacy">{t('Privacidad y uso')}</a>
          <span>
            sobremesa<span className="brand-dot">.</span>{' '}
            <span className="footer-caption">{t('Un lugar para compartir buenos ratos.')}</span>
          </span>
          <span>
            {t('Hecho para jugar juntos')} <span className="footer-flower">✳</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
