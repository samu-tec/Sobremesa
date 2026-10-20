import { createRequire } from 'node:module';
import { normalizeWord, type WordLexicon } from 'sobremesa-logic';
const require = createRequire(import.meta.url);
function load(name: string, spanish: boolean): ReadonlySet<string> {
  const source: unknown = require(name);
  if (!Array.isArray(source) || !source.every((word) => typeof word === 'string'))
    throw new Error('Diccionario local inválido');
  return new Set(
    source
      .map(normalizeWord)
      .filter(
        (word) =>
          word.length >= 2 && word.length <= 11 && (spanish ? /^[A-ZÑ]+$/ : /^[A-Z]+$/).test(word),
      )
      .sort((a, b) => a.length - b.length || a.localeCompare(b)),
  );
}
/** Los datos MIT solo se cargan en el servidor; no forman parte del paquete del navegador. */
export const wordDictionaries: WordLexicon = {
  es: load('an-array-of-spanish-words', true),
  en: load('an-array-of-english-words', false),
};
