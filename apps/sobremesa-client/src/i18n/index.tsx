import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getGame as getBaseGame, type GameDefinition, type GameType } from 'sobremesa-logic';
import { en } from './en';

// Add a dictionary and a descriptor here to support another language.
export const LANGUAGES = [
  { code: 'es', name: 'Español', format: 'es-ES' },
  { code: 'en', name: 'English', format: 'en-GB' },
] as const;
export type Locale = (typeof LANGUAGES)[number]['code'];
const dictionaries: Record<Locale, Record<string, string>> = { es: {}, en };
const brandCopy: Record<
  Locale,
  {
    title: string;
    description: string;
    social: string;
    ogLocale: string;
    ogAlternateLocale: string;
  }
> = {
  es: {
    title: 'Sobremesa · Juegos de mesa para compartir',
    description:
      'Sobremesa reúne seis juegos de mesa para compartir con amigos. Juega en games.samuelciocan.com sin registro ni descargas.',
    social: 'Seis juegos de mesa para compartir con amigos en games.samuelciocan.com.',
    ogLocale: 'es_ES',
    ogAlternateLocale: 'en_GB',
  },
  en: {
    title: 'Sobremesa · Board games to share',
    description:
      'Sobremesa brings six board games together to play with friends. Visit games.samuelciocan.com, with no account or downloads.',
    social: 'Six board games to share with friends at games.samuelciocan.com.',
    ogLocale: 'en_GB',
    ogAlternateLocale: 'es_ES',
  },
};
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem('sobremesa.locale');
    if (LANGUAGES.some((l) => l.code === saved)) return saved as Locale;
  } catch {
    /* Preferences are optional. */
  }
  return navigator.language.startsWith('en') ? 'en' : 'es';
}
let activeLocale: Locale = initialLocale();
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: activeLocale,
  setLocale: () => {},
});
export function t(key: string, values: Record<string, string | number | undefined> = {}): string {
  const template = dictionaries[activeLocale]?.[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
}
export function formatMoney(value: number) {
  return new Intl.NumberFormat(LANGUAGES.find((l) => l.code === activeLocale)!.format, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}
export function localizeGame(game: GameDefinition): GameDefinition {
  return {
    ...game,
    name: t(game.name),
    description: t(game.description),
    rules: game.rules.map((rule) => t(rule)),
    tip: t(game.tip),
  };
}
export function getGame(id: GameType) {
  return localizeGame(getBaseGame(id));
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, update] = useState<Locale>(activeLocale);
  const setLocale = (next: Locale) => {
    if (!LANGUAGES.some((l) => l.code === next)) return;
    activeLocale = next;
    update(next);
    try {
      localStorage.setItem('sobremesa.locale', next);
    } catch {
      /* Preferences are optional. */
    }
  };
  useEffect(() => {
    const copy = brandCopy[locale];
    document.documentElement.lang = locale;
    document.title = copy.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', copy.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', copy.social);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', copy.ogLocale);
    document
      .querySelector('meta[property="og:locale:alternate"]')
      ?.setAttribute('content', copy.ogAlternateLocale);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', copy.title);
    document
      .querySelector('meta[name="twitter:description"]')
      ?.setAttribute('content', copy.social);
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext);
export function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  return (
    <select
      className="language-selector"
      aria-label={t('Idioma')}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      {LANGUAGES.map((l) => (
        <option value={l.code} key={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

export function gameText(value: import('sobremesa-logic').GameText | null | undefined): string {
  if (!value) return '';
  return t(
    value.key,
    Object.fromEntries(
      value.values.map((item, index) => [
        String(index),
        typeof item === 'object'
          ? 'term' in item
            ? localizeTerm(item.term)
            : gameText(item)
          : item,
      ]),
    ),
  );
}
function localizeTerm(value: string): string {
  const colours: Record<string, string> = {
    red: 'Rojo',
    blue: 'Azul',
    green: 'Verde',
    yellow: 'Amarillo',
    wild: 'Comodín',
  };
  return t(colours[value] ?? value);
}
