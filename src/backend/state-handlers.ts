import {
  GameLogic,
  IGameStage,
  IGameEventInput,
  IGameState,
  GameInput,
} from './game-logic';

/**
 * Abstract base class defining the core game state management interface.
 * Provides the foundation for both live gameplay and replay functionality
 * through the LiveHandler and PlaybackHandler implementations.
 */

export abstract class GameHandlerBase {
  /**
   * Gets the current game stage containing level configuration and settings
   * @returns {IGameStage} The current game stage
   */
  abstract get gameStage(): IGameStage;

  /**
   * Gets the current state of the game including player position, score, etc.
   * @returns {IGameState} The current game state
   */
  abstract get state(): IGameState;

  /**
   * Gets the list of recorded game inputs for replay functionality
   * @returns {IGameEventInput[]} Array of saved game inputs with timestamps
   */
  abstract get savedInputs(): IGameEventInput[];

  /**
   * Indicates if the current game session is complete
   * @returns {boolean} True if game is finished, false otherwise
   */
  abstract get isDone(): boolean;

  /**
   * Advances the game time by the specified duration
   * @param {number} duration - The time in milliseconds to advance
   */
  abstract advanceTime(duration: number): void;

  /**
   * Processes a game input event like player movement
   * @param {GameInput} input - The input event to process
   */
  abstract performInput(input: GameInput): void;
}

/**
 * Handles replay functionality by playing back recorded game inputs.
 * Processes saved inputs in sequence to recreate previous gameplay,
 * ignoring new player inputs during playback.
 *
 * Example: Activated when player presses 'P' to review previous gameplay
 */
export class PlaybackHandler extends GameHandlerBase {
  private _gameLogic: GameLogic;
  private _inputIndex: number;

  get gameStage(): IGameStage {
    return this._gameStage;
  }

  constructor(
    private _gameStage: IGameStage,
    public savedInputs: IGameEventInput[]
  ) {
    super();

    this._gameLogic = new GameLogic(this._gameStage);
    this._inputIndex = 0;
  }

  get isDone(): boolean {
    return this._inputIndex >= this.savedInputs.length;
  }

  advanceTime(duration: number): void {
    if (this._inputIndex >= this.savedInputs.length) {
      return;
    }

    while (duration > 0) {
      let newPlayedDuration = this._gameLogic.totalDuration + duration;
      const nextInput = this.savedInputs[this._inputIndex];

      if (newPlayedDuration >= nextInput.eventTime) {
        newPlayedDuration = nextInput.eventTime;
      }

      this._gameLogic.advanceTime(
        newPlayedDuration - this._gameLogic.totalDuration
      );

      if (this._gameLogic.totalDuration >= nextInput.eventTime) {
        this._gameLogic.input(nextInput.gameInput);
        ++this._inputIndex;
      }

      duration = newPlayedDuration - this._gameLogic.totalDuration;
    }
  }

  get state(): IGameState {
    return this._gameLogic.state;
  }

  performInput(_input: GameInput): void {
    // Ignore inputs in playback mode
  }
}

/**
 * Manages live gameplay state and input handling.
 * Maintains a record of player inputs for replay functionality
 * while delegating game logic to the GameLogic class.
 *
 * Example: Used during active gameplay to process player movements
 * and track game state changes.
 */
export class LiveHandler extends GameHandlerBase {
  private _gameLogic: GameLogic;
  savedInputs: IGameEventInput[];

  get gameStage(): IGameStage {
    return this._gameStage;
  }

  constructor(
    private _gameStage: IGameStage,
    savedInputs?: IGameEventInput[]
  ) {
    super();

    this.savedInputs = savedInputs || [];
    this._gameLogic = new GameLogic(this._gameStage);

    if (this.savedInputs.length > 0) {
      for (const savedInput of this.savedInputs) {
        this._gameLogic.advanceTime(
          savedInput.eventTime - this._gameLogic.totalDuration
        );
        this._gameLogic.input(savedInput.gameInput);
      }
    }

    this._gameLogic.onInputCallback = (e: IGameEventInput): void =>
      this._onGameInput(e);
  }

  advanceTime(duration: number): void {
    this._gameLogic.advanceTime(duration);
  }

  get isDone(): boolean {
    return false;
  }

  get state(): IGameState {
    return this._gameLogic.state;
  }

  private _onGameInput(e: IGameEventInput): void {
    this.savedInputs.push(e);
  }

  performInput(input: GameInput): void {
    this._gameLogic.input(input);
  }
}
