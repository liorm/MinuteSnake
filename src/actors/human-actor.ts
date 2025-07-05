import { EDirection, GameInput, IGameState } from '../backend/game-logic';
import { IActor } from './actor';

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
