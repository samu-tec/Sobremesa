import type { GamePublicState, GameText, IGameEngine, Player, RoomRules } from 'sobremesa-logic';

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
  requiresPlayerAction(state: S): boolean;
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
    requiresPlayerAction: () => true,
    botId: (s, players) => players.find((p) => p.isBot && p.id === actor(s))?.id,
    ...policy,
  };
  return { ...runtime, createMatch: () => createMatch(runtime) };
}

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
  forfeit(playerId: string, newHostId?: string): void;
  publicState(playerId: string): GamePublicState | null;
  timeoutSeconds(): number | null;
  requiresPlayerAction(): boolean;
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
    forfeit(playerId, newHostId) {
      if (state) state = engine.forfeitPlayer(state, playerId, newHostId);
    },
    publicState: (playerId) => (state ? engine.getSanitizedState(state, playerId) : null),
    timeoutSeconds: () => (state ? runtime.timeoutSeconds(state) : null),
    requiresPlayerAction: () => !!state && runtime.requiresPlayerAction(state),
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
