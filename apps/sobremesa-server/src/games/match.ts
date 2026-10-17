import type { GamePublicState, GameText, Player } from 'sobremesa-logic';
import type { GameRuntime } from './runtime.js';

export interface MatchState {
  currentTurn?: string;
  currentTurnPlayerId?: string;
  isDraw?: boolean;
  logs?: GameText[];
}

/** The room never pairs an engine with another game's state or action. */
export interface GameMatch {
  readonly state: unknown;
  start(players: { id: string; isBot: boolean; name?: string }[]): void;
  reset(): void;
  act(playerId: string, action: unknown): { completed: boolean } | null;
  actor(): string;
  result(): { winnerId: string | null; isDraw: boolean };
  forfeit(playerId: string): void;
  publicState(playerId: string): GamePublicState | null;
  timeoutSeconds(): number | null;
  expire(): boolean;
  timeoutStep(actor: string): { continue: boolean } | null;
  botId(players: Player[]): string | undefined;
  botAction(playerId: string): unknown;
}

export function createMatch<S extends MatchState, A, P extends GamePublicState>(
  runtime: GameRuntime<S, A, P>,
): GameMatch {
  const { engine } = runtime;
  let state: S | null = null;
  const trimLogs = () => {
    if (state?.logs) state.logs = state.logs.slice(0, 80);
  };
  const validAction = (playerId: string, action: unknown): action is A => {
    if (!state) return false;
    // Engines validate the complete untrusted payload at runtime. This assertion is
    // confined to that validation boundary; only validated actions reach applyAction.
    return engine.validateAction(state, playerId, action as A);
  };
  return {
    get state() {
      return state;
    },
    start(players) {
      state = engine.initGame(players);
    },
    reset() {
      state = null;
    },
    act(playerId, action) {
      if (!state || !validAction(playerId, action)) return null;
      state = engine.applyAction(state, playerId, action);
      const completed = runtime.completed(state, action);
      trimLogs();
      return { completed };
    },
    actor: () => (state ? runtime.actor(state) : ''),
    result: () => ({
      winnerId: state ? engine.checkWinner(state) : null,
      isDraw: state?.isDraw === true,
    }),
    forfeit(playerId) {
      if (state) state = engine.forfeitPlayer(state, playerId);
    },
    publicState: (playerId) => (state ? engine.getSanitizedState(state, playerId) : null),
    timeoutSeconds: () => (state ? runtime.timeoutSeconds(state) : null),
    expire() {
      if (!state) return false;
      const expired = runtime.expire(state);
      if (!expired) return false;
      state = expired;
      trimLogs();
      return true;
    },
    timeoutStep(actor) {
      if (!state) return null;
      const action = runtime.timeoutAction(state, actor);
      if (!action || !engine.validateAction(state, actor, action)) return null;
      state = engine.applyAction(state, actor, action);
      trimLogs();
      return { continue: runtime.continueTimeout(action) };
    },
    botId: (players) => (state ? runtime.botId(state, players) : undefined),
    botAction: (playerId) => (state ? engine.getBotAction(state, playerId) : null),
  };
}
