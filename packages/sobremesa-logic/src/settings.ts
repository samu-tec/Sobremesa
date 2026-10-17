import type { GameType } from './types/index.js';
export interface GameSetting {
  key: string;
  label: string;
  description: string;
  defaultValue: number | boolean;
  values?: readonly number[];
  unit?: string;
  labels?: readonly string[];
}
const number = (
  key: string,
  label: string,
  description: string,
  defaultValue: number,
  values: number[],
  unit?: string,
): GameSetting => ({ key, label, description, defaultValue, values, unit });
const toggle = (
  key: string,
  label: string,
  description: string,
  defaultValue: boolean,
): GameSetting => ({ key, label, description, defaultValue });
/** One schema for the lobby, server validation and the rules shown during play. */
export const GAME_SETTINGS: Record<GameType, readonly GameSetting[]> = {
  monopoly: [], // The legacy economic settings have their own typed schema and UI.
  colorclash: [], // startingCards is configured by the existing card-game UI.
  tictactoe: [],
  connect4: [],
  reversi: [],
  backgammon: [],
  rummy: [
    number(
      'openingPoints',
      'Puntos para abrir',
      'Suma mínima de las combinaciones que bajas en tu primera jugada.',
      30,
      [0, 25, 30, 40, 50],
      'puntos',
    ),
    number(
      'startingTiles',
      'Fichas iniciales',
      'Número de fichas que recibe cada persona.',
      14,
      [10, 14, 16],
      'fichas',
    ),
    toggle('useJokers', 'Jugar con comodines', 'Incluye los dos comodines en el pozo.', true),
  ],
  dominoes: [
    number(
      'targetScore',
      'Puntuación objetivo',
      'La partida termina cuando alguien alcanza esta puntuación o se agotan las rondas.',
      100,
      [50, 100, 150, 200],
      'puntos',
    ),
    number(
      'maxRounds',
      'Máximo de rondas',
      'Gana la puntuación más alta al terminar la última ronda.',
      5,
      [1, 3, 5, 10],
      'rondas',
    ),
    number(
      'startingTiles',
      'Fichas iniciales',
      'Las fichas que no se reparten quedan en el pozo.',
      7,
      [5, 7],
      'fichas',
    ),
  ],
  impostor: [
    number(
      'clueRounds',
      'Vueltas de pistas',
      'Cuántas pistas da cada persona antes de votar.',
      2,
      [1, 2, 3],
      'vueltas',
    ),
    toggle(
      'showCategory',
      'Mostrar la categoría',
      'Da al impostor una pista sobre el tema de la palabra.',
      true,
    ),
    {
      ...number(
        'wordCategory',
        'Tema de las palabras',
        'Elige un tema o mezcla todas las categorías.',
        0,
        [0, 1, 2, 3, 4, 5, 6],
      ),
      labels: [
        'Todos los temas',
        'Naturaleza',
        'Comida',
        'Animales',
        'Lugares',
        'Objetos',
        'Deportes',
      ],
    },
  ],
  mancala: [
    number(
      'seedsPerPit',
      'Semillas por hoyo',
      'Cambia la cantidad inicial de semillas. Las reglas de captura se mantienen.',
      4,
      [3, 4, 5, 6],
      'semillas',
    ),
  ],
  pig: [
    number(
      'targetScore',
      'Puntos para ganar',
      'Gana quien guarda esta cantidad de puntos primero.',
      100,
      [50, 100, 150, 200],
      'puntos',
    ),
  ],
  combinations: [
    number(
      'maxRolls',
      'Tiradas por turno',
      'Puedes anotar antes de gastar todas tus tiradas.',
      3,
      [1, 2, 3],
      'tiradas',
    ),
    toggle(
      'upperBonus',
      'Bonificación de la sección superior',
      'Suma 35 puntos si llegas a 63 entre unos y seises.',
      true,
    ),
  ],
  battleship: [
    toggle(
      'hitKeepsTurn',
      'Repetir turno al acertar',
      'Si aciertas, puedes volver a disparar. Si fallas, pasa el turno.',
      false,
    ),
  ],
  checkers: [
    number(
      'quietMoveLimit',
      'Límite de jugadas sin progreso',
      'Hay tablas tras estas jugadas consecutivas sin capturas ni movimientos de fichas sin coronar.',
      80,
      [40, 80, 120],
      'jugadas',
    ),
  ],
  chess: [
    toggle(
      'automaticDraws',
      'Tablas automáticas',
      'Resuelve la triple repetición y los 50 movimientos automáticamente. Si lo desactivas, hay que reclamar las tablas.',
      true,
    ),
  ],
};
export function defaultGameSettings(game: GameType): Record<string, number | boolean> {
  return Object.fromEntries((GAME_SETTINGS[game] || []).map((s) => [s.key, s.defaultValue]));
}
export function validGameSetting(game: GameType, key: string, value: unknown): boolean {
  const setting = GAME_SETTINGS[game]?.find((s) => s.key === key);
  return (
    !!setting &&
    (typeof setting.defaultValue === 'boolean'
      ? typeof value === 'boolean'
      : typeof value === 'number' && !!setting.values?.includes(value))
  );
}
export function resolveGameSettings(
  game: GameType,
  patch: Record<string, unknown> = {},
): Record<string, number | boolean> {
  const next = defaultGameSettings(game);
  for (const [key, value] of Object.entries(patch)) {
    if (!validGameSetting(game, key, value)) throw new Error('Opción de partida no válida.');
    next[key] = value as number | boolean;
  }
  return next;
}
export const WORD_CATEGORIES = [
  'Naturaleza',
  'Comida',
  'Animales',
  'Lugares',
  'Objetos',
  'Deportes',
] as const;
