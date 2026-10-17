export interface Participant {
  id: string;
  isBot: boolean;
  name?: string;
}
export interface Match {
  players: Participant[];
  currentTurnPlayerId: string;
  winner: string | null;
  isDraw: boolean;
}
export function participants(players: Participant[], min = 2, max = 2): Participant[] {
  if (
    players.length < min ||
    players.length > max ||
    new Set(players.map((p) => p.id)).size !== players.length
  )
    throw new Error('Número de jugadores no válido.');
  return players.map((p) => ({ id: p.id, isBot: p.isBot, ...(p.name ? { name: p.name } : {}) }));
}
export const liveTurn = (s: Match, id: string) =>
  !s.winner && !s.isDraw && s.currentTurnPlayerId === id && s.players.some((p) => p.id === id);
export const nextPlayer = (s: Match) =>
  s.players[(s.players.findIndex((p) => p.id === s.currentTurnPlayerId) + 1) % s.players.length].id;
export const integer = (n: unknown, min: number, max: number): n is number =>
  Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const die = () => 1 + Math.floor(Math.random() * 6);
export function forfeit<T extends Match>(s: T, id: string): T {
  if (s.winner || s.isDraw || !s.players.some((p) => p.id === id)) return s;
  return { ...structuredClone(s), winner: s.players.find((p) => p.id !== id)!.id };
}
export function finishScores<T extends Match>(s: T, scores: number[]): T {
  const max = Math.max(...scores),
    winners = s.players.filter((_, i) => scores[i] === max);
  s.winner = winners.length === 1 ? winners[0].id : null;
  s.isDraw = winners.length > 1;
  return s;
}
