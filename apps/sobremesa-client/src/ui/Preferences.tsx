import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Check, Settings2 } from 'lucide-react';
import { LANGUAGES, t, useLocale } from '../i18n';
import { readSoundPreferences, setSoundPreferences, unlockSound } from '../services/sound';
import { Modal } from './Modal';

type PreferencesExtras = ReactNode | ((close: () => void) => ReactNode);
interface PlayerPreferences {
  playerName: string;
  onUpdateName: (name: string) => void;
}
const PlayerPreferencesContext = createContext<PlayerPreferences | null>(null);

export function PlayerPreferencesProvider({
  playerName,
  onUpdateName,
  children,
}: PlayerPreferences & { children: ReactNode }) {
  return (
    <PlayerPreferencesContext.Provider value={{ playerName, onUpdateName }}>
      {children}
    </PlayerPreferencesContext.Provider>
  );
}

export function PreferencesButton({ children }: { children?: PreferencesExtras }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button small secondary preferences-trigger"
        aria-label={t('Preferencias')}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('Preferencias')}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          setOpen(true);
        }}
      >
        <Settings2 size={18} aria-hidden="true" />
      </button>
      {open && (
        <Modal title={t('Preferencias')} onClose={() => setOpen(false)}>
          <PreferencesPanel />
          {children && (
            <div className="preferences-extra">
              {typeof children === 'function' ? children(() => setOpen(false)) : children}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function PreferencesPanel() {
  const { locale, setLocale } = useLocale();
  const profile = useContext(PlayerPreferencesContext);
  const [name, setName] = useState(profile?.playerName || '');
  useEffect(() => setName(profile?.playerName || ''), [profile?.playerName]);
  const [sound, setSound] = useState(readSoundPreferences);
  const updateSound = (patch: Partial<typeof sound>) => {
    const next = { ...sound, ...patch };
    setSound(next);
    setSoundPreferences(next);
    if (next.enabled) unlockSound();
  };

  return (
    <div className="preferences-panel">
      {profile && (
        <section className="preference-section" aria-labelledby="preference-name-title">
          <h3 id="preference-name-title">{t('Nombre de jugador')}</h3>
          <form
            className="preference-name-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const next = name.trim();
              if (next) profile.onUpdateName(next);
            }}
          >
            <label className="field-label" htmlFor="preferences-player-name">
              {t('Tu nombre')}
            </label>
            <input
              className="field"
              id="preferences-player-name"
              maxLength={24}
              autoComplete="nickname"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <button className="button secondary" type="submit" disabled={!name.trim()}>
              {t('Guardar nombre')}
            </button>
          </form>
        </section>
      )}
      <section className="preference-section" aria-labelledby="preference-language-title">
        <h3 id="preference-language-title">{t('Idioma')}</h3>
        <div className="preference-language-list" role="group" aria-label={t('Idioma')}>
          {LANGUAGES.map((language) => (
            <button
              type="button"
              key={language.code}
              className="preference-language-option"
              aria-pressed={locale === language.code}
              onClick={() => setLocale(language.code)}
            >
              <span className="preference-language-flag" aria-hidden="true">
                {language.flag}
              </span>
              <span>{t(language.name)}</span>
              {locale === language.code && <Check size={17} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </section>

      <section className="preference-section" aria-labelledby="preference-audio-title">
        <h3 id="preference-audio-title">{t('Sonido')}</h3>
        <label className="preference-audio-toggle">
          <span>{t('Sonido')}</span>
          <input
            type="checkbox"
            role="switch"
            checked={sound.enabled}
            onChange={(event) => updateSound({ enabled: event.target.checked })}
          />
        </label>
        <label className="preference-volume-label" htmlFor="preferences-volume">
          <span>{t('Volumen')}</span>
          <output htmlFor="preferences-volume">{Math.round(sound.volume * 100)}%</output>
        </label>
        <input
          className="preference-volume"
          id="preferences-volume"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(sound.volume * 100)}
          aria-label={t('Volumen')}
          onChange={(event) => updateSound({ volume: Number(event.target.value) / 100 })}
        />
        <p className="muted">
          {t('Sonidos breves durante el juego. Se silencian al ocultar esta pestaña.')}
        </p>
      </section>

      <a className="text-button preferences-privacy-link" href="/privacy">
        {t('Privacidad y uso')}
      </a>
    </div>
  );
}
