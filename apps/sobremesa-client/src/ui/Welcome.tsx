import { t, useLocale } from '../i18n';
import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Modal } from './Modal';
import { PreferencesButton } from './Preferences';
export function randomName(locale: string) {
  const animals =
    locale === 'en'
      ? ['Fox', 'Lynx', 'Otter', 'Owl', 'Panda', 'Koala']
      : ['Zorro', 'Lince', 'Panda', 'Búho', 'Koala', 'Mapache'];
  const adjectives =
    locale === 'en'
      ? ['Lucky', 'Blue', 'Brave', 'Happy', 'Swift', 'Calm']
      : ['Azul', 'Valiente', 'Alegre', 'Veloz', 'Verde', 'Audaz'];
  const numbers = crypto.getRandomValues(new Uint32Array(3));
  const a = animals[numbers[0] % animals.length],
    b = adjectives[numbers[1] % adjectives.length];
  return `${locale === 'en' ? `${b} ${a}` : `${a} ${b}`} ${numbers[2] % 100}`;
}
export function Welcome({
  initialName,
  onConfirm,
}: {
  initialName: string;
  onConfirm: (name: string) => void;
}) {
  const { locale } = useLocale();
  const [name, setName] = useState(initialName);
  return (
    <Modal title={t('Bienvenido a Sobremesa')} dismissable={false} onClose={() => {}}>
      <div className="welcome-preferences">
        <PreferencesButton />
      </div>
      <p>{t('Elige un nombre para la mesa. Puede ser un apodo; no hace falta tu nombre real.')}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onConfirm(name);
        }}
      >
        <label className="field-label" htmlFor="welcome-name">
          {t('Tu nombre')}
        </label>
        <input
          className="field"
          id="welcome-name"
          value={name}
          maxLength={24}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          required
        />
        <p className="welcome-privacy-link">
          <a href="/privacy">{t('Consulta la política de privacidad')}</a>
        </p>
        <div className="choice-buttons">
          <button
            type="button"
            className="button secondary full"
            onClick={() => setName(randomName(locale))}
          >
            <Shuffle size={17} />
            {t('Nombre aleatorio')}
          </button>
          <button className="button primary full" disabled={!name.trim()}>
            {t('Entrar a Sobremesa')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
