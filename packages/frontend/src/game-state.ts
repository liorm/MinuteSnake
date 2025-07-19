/**
 * Represents the current state of the game application.
 * Controls which screen is displayed and how user input is handled.
 */
export enum GameState {
  /** Welcome screen - initial state showing title and menu */
  WELCOME = 'welcome',
  /** Active gameplay state */
  PLAYING = 'playing',
  /** Game over state - shown when all human players have lost */
  GAME_OVER = 'game_over',
}
