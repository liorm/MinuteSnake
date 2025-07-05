import { GameInput, IGameState } from '../backend/game-logic';

/**
 * There are two types of actors:
 * 1. Human actors (players) - they control the game
 * 2. AI actors - they are controlled by the game logic
 *
 * The actor interface receives a "stateUpdate" method that is called every state change.
 * The actor can make decisions based on the current game state.
 * The actor can also receive input from the user (for example, a human player).
 * The actor can also send input to the game logic.
 */

/**
 * Represents an actor in the game that can respond to state updates
 * and generate inputs. Used for both human and AI controlled players.
 */
export interface IActor {
  /**
   * Called when the game state changes to allow the actor to:
   * 1. Update its internal state
   * 2. Make decisions based on the new game state
   * 3. Generate inputs in response to the state change
   *
   * @param state Current game state
   * @returns Game input or null if no input is needed
   */
  onStateUpdate(state: IGameState): GameInput | null;
}
