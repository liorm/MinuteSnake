import { EDirection, GameInput, IGameState } from './backend/game-logic.js';
import { Vector } from './backend/utils.js';

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

/**
 * Human-controlled actor that accepts keyboard input to control
 * a snake in the game. Maps keyboard events to game input commands.
 */
export class HumanActor implements IActor {
  private pendingInput: GameInput | null = null;

  constructor(
    private snakeIdx: number,
    private keyMap: {
      up: string;
      down: string;
      left: string;
      right: string;
    }
  ) {}

  /**
   * Handles keyboard input for the human player's snake.
   * Stores the input to be returned on next state update.
   *
   * @param event Keyboard event from user input
   */
  handleKeyInput(event: KeyboardEvent): void {
    let direction: EDirection | undefined;

    switch (event.key.toLowerCase()) {
      case this.keyMap.down:
        direction = EDirection.DOWN;
        break;
      case this.keyMap.up:
        direction = EDirection.UP;
        break;
      case this.keyMap.left:
        direction = EDirection.LEFT;
        break;
      case this.keyMap.right:
        direction = EDirection.RIGHT;
        break;
      default:
        return;
    }

    this.pendingInput = {
      inputType: 'direction',
      dir: direction,
      snakeIdx: this.snakeIdx,
    };
  }

  onStateUpdate(_state: IGameState): GameInput | null {
    // Return and clear any pending input
    const input = this.pendingInput;
    this.pendingInput = null;
    return input;
  }
}

/**
 * AI-controlled actor that moves the snake toward the apple while avoiding
 * obstacles like walls, its own body, and other snakes.
 */
export class AIActor implements IActor {
  constructor(private snakeIdx: number) {}

  onStateUpdate(state: IGameState): GameInput | null {
    const snake = state.snakes[this.snakeIdx];
    const apple = state.applePos;

    // If no apple or game is over, do nothing
    if (!apple || state.gameOver) {
      return null;
    }

    // Get all obstacles to avoid (walls, snake bodies)
    const obstacles = new Set<string>();
    state.blocks.forEach(block => obstacles.add(`${block.x},${block.y}`));
    state.snakes.forEach(s => {
      s.tiles.forEach(tile => obstacles.add(`${tile.x},${tile.y}`));
    });

    // Calculate direction to apple considering board wrapping
    const dx = apple.x - snake.position.x;
    const dy = apple.y - snake.position.y;

    // Possible moves in order of priority based on apple direction
    const moves: EDirection[] = [];

    // Prioritize horizontal or vertical movement based on distance
    if (Math.abs(dx) > Math.abs(dy)) {
      // Prioritize horizontal movement
      if (dx > 0) moves.push(EDirection.RIGHT);
      else moves.push(EDirection.LEFT);
      if (dy > 0) moves.push(EDirection.UP);
      else moves.push(EDirection.DOWN);
    } else {
      // Prioritize vertical movement
      if (dy > 0) moves.push(EDirection.UP);
      else moves.push(EDirection.DOWN);
      if (dx > 0) moves.push(EDirection.RIGHT);
      else moves.push(EDirection.LEFT);
    }

    // Try each move in priority order
    for (const dir of moves) {
      const nextPos = this.getNextPosition(snake.position, dir, state);
      if (!obstacles.has(`${nextPos.x},${nextPos.y}`)) {
        return {
          inputType: 'direction',
          dir,
          snakeIdx: this.snakeIdx,
        };
      }
    }

    // If no good moves found, just continue in current direction
    return null;
  }

  private getNextPosition(pos: Vector, dir: EDirection, state: IGameState): Vector {
    let x = pos.x;
    let y = pos.y;

    switch (dir) {
      case EDirection.UP:
        y += 1;
        break;
      case EDirection.DOWN:
        y -= 1;
        break;
      case EDirection.LEFT:
        x -= 1;
        break;
      case EDirection.RIGHT:
        x += 1;
        break;
    }

    // Handle wrapping
    if (x < 0) x = state.blocks.length - 2;
    if (y < 0) y = state.blocks.length - 2;
    if (x > state.blocks.length - 2) x = 0;
    if (y > state.blocks.length - 2) y = 0;

    return new Vector(x, y);
  }
}
