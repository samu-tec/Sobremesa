/**
 * IGameEngine: Shared Plugin / Strategy Pattern Interface for all platform games.
 * Ensures zero-trust server-authoritative state progression and individual state sanitization.
 */
export interface IGameEngine<GameState, PlayerAction, PublicState> {
  /**
   * Initializes a brand new game state with the assigned players.
   */
  initGame(players: { id: string; isBot: boolean }[]): GameState;

  /**
   * Validates if a player's action is legal given the current global game state.
   */
  validateAction(state: GameState, playerId: string, action: PlayerAction): boolean;

  /**
   * Applies a validated action, returning a new immutable game state.
   */
  applyAction(state: GameState, playerId: string, action: PlayerAction): GameState;

  /**
   * Generates a sanitized view of the state safe to transmit to a specific player.
   * Strips all hidden information (rival cards, draw pile cards, secret decks).
   */
  getSanitizedState(state: GameState, playerId: string): PublicState;

  /**
   * Returns the player ID of the winner, or null if game is ongoing or tied.
   */
  checkWinner(state: GameState): string | null;

  /**
   * Computes an action for the given bot player, or null if no action is needed.
   */
  getBotAction(state: GameState, botId: string): PlayerAction | null;
}
