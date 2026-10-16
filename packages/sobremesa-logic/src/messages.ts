/** Events carry templates and values, so each player can read the same match in their language. */
export interface GameText {
  key: string;
  values: (string | number | GameText | { term: string })[];
}
export const message = (key: string, ...values: GameText['values']): GameText => ({ key, values });
export const term = (value: string): { term: string } => ({ term: value });
