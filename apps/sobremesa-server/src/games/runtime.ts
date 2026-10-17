import type { GamePublicState, IGameEngine, RoomRules } from 'sobremesa-logic';
import { createMatch, type GameMatch, type MatchState } from './match.js';

interface BotPlayer {
  id: string;
  isBot: boolean;
}
interface TurnAction {
  type: string;
}
export interface GamePolicy<S, A> {
  actor(state: S): string;
  expire(state: S): S | null;
  completed(state: S, action: A): boolean;
  timeoutAction(state: S, actor: string): A | null;
  continueTimeout(action: A): boolean;
  timeoutSeconds(state: S): number | null;
  botId(state: S, players: readonly BotPlayer[]): string | undefined;
}
export interface GameRuntime<S, A, P> extends GamePolicy<S, A> {
  engine: IGameEngine<S, A, P>;
  configureRules(rules: RoomRules): void;
}

/** Each factory owns its engine and settings; policies never share mutable room state. */
export function defineGame<S extends MatchState, A extends TurnAction, P extends GamePublicState>(
  engine: IGameEngine<S, A, P>,
  policy: Partial<GamePolicy<S, A>> = {},
): GameRuntime<S, A, P> & { createMatch(): GameMatch } {
  const actor = (s: S) => s.currentTurn || s.currentTurnPlayerId || '';
  const runtime: GameRuntime<S, A, P> = {
    engine,
    configureRules: (rules) => engine.setRules?.(rules),
    actor,
    expire: () => null,
    completed: () => true,
    timeoutAction: (s, id) => engine.getBotAction(s, id),
    continueTimeout: () => false,
    timeoutSeconds: () => null,
    botId: (s, players) => players.find((p) => p.isBot && p.id === actor(s))?.id,
    ...policy,
  };
  return { ...runtime, createMatch: () => createMatch(runtime) };
}
