import {
  EDirection,
  GameInput,
  GameLogic,
  IGameEventInput,
  IGameStage,
  IGameState,
} from './game-logic.js';
import { GameRenderer } from './game-renderer.js';
import { Vector } from './utils.js';

/**
 * Abstract base class defining the core game state management interface.
 * Provides the foundation for both live gameplay and replay functionality
 * through the LiveHandler and PlaybackHandler implementations.
 */
abstract class GameHandlerBase {
  abstract get gameStage(): IGameStage;
  abstract get state(): IGameState;
  abstract get savedInputs(): IGameEventInput[];
  abstract get isDone(): boolean;
  abstract advanceTime(duration: number): void;
  abstract performInput(input: GameInput): void;
}

/**
 * Manages live gameplay state and input handling.
 * Maintains a record of player inputs for replay functionality
 * while delegating game logic to the GameLogic class.
 *
 * Example: Used during active gameplay to process player movements
 * and track game state changes.
 */
class LiveHandler extends GameHandlerBase {
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

/**
 * Handles replay functionality by playing back recorded game inputs.
 * Processes saved inputs in sequence to recreate previous gameplay,
 * ignoring new player inputs during playback.
 *
 * Example: Activated when player presses 'P' to review previous gameplay
 */
class PlaybackHandler extends GameHandlerBase {
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
 * Core game engine that coordinates rendering, input handling, and game state.
 * Manages switching between live and playback modes, handles window/canvas
 * setup, and maintains the game loop. Works with GameRenderer for visual output
 * and interfaces with GameHandlerBase implementations for game state management.
 *
 * Example: The main engine instance created by GameApp that runs the entire game
 */
export class GameEngine {
  private _gameRenderer!: GameRenderer; // Will be initialized in start()
  private _handler!: GameHandlerBase; // Will be initialized in start()
  private _lastEngineTime!: number; // Will be initialized in start()
  private _isPlaybackMode = false;

  constructor(
    private window: Window,
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {}

  start(): void {
    this._gameRenderer = new GameRenderer();
    this._restartLiveMode();
    this._initListeners();
    this._updateCanvasDimensions();
    this._timeout();
  }

  private _initListeners(): void {
    this.window.addEventListener('resize', () =>
      this._updateCanvasDimensions()
    );
    this.window.addEventListener('keydown', e => this._onKeyDown(e));
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    if (event.key.toLowerCase() === 'p') {
      if (!this._isPlaybackMode) {
        this._enterPlaybackMode();
      } else {
        this._resumeLiveMode();
      }
    } else if (event.key.toLowerCase() === 'n') {
      this._restartLiveMode();
    } else if (event.key === '+') {
      this._performInput({
        inputType: 'speed',
        speedIncrement: 1,
      });
    } else if (event.key === '-') {
      this._performInput({
        inputType: 'speed',
        speedIncrement: -1,
      });
    } else {
      let newDirection: EDirection;
      let snakeIdx = 1;

      switch (event.key.toLowerCase()) {
        case 's':
          snakeIdx = 0;
        case 'arrowdown':
          newDirection = EDirection.DOWN;
          break;
        case 'w':
          snakeIdx = 0;
        case 'arrowup':
          newDirection = EDirection.UP;
          break;
        case 'a':
          snakeIdx = 0;
        case 'arrowleft':
          newDirection = EDirection.LEFT;
          break;
        case 'd':
          snakeIdx = 0;
        case 'arrowright':
          newDirection = EDirection.RIGHT;
          break;
        default:
          return;
      }

      this._performInput({
        inputType: 'direction',
        dir: newDirection!,
        snakeIdx,
      });
    }

    event.preventDefault();
  }

  private _updateCanvasDimensions(): void {
    this.canvas.height = this.window.innerHeight;
    this.canvas.width = this.window.innerWidth;

    this._gameRenderer.onCanvasSizeChanged(
      this.canvas.width,
      this.canvas.height
    );
    this._draw();
  }

  private _timeout(): void {
    this._update();
    this._draw();
    requestAnimationFrame(() => this._timeout());
  }

  private _update(): void {
    this._advanceTimeToNow();
  }

  private _performInput(input: GameInput): void {
    this._advanceTimeToNow();
    this._handler.performInput(input);
  }

  private _advanceTimeToNow(): void {
    const now = performance.now();
    const duration = now - this._lastEngineTime;
    this._handler.advanceTime(duration);
    this._lastEngineTime = now;

    if (this._isPlaybackMode && this._handler.isDone) {
      this._resumeLiveMode();
    }
  }

  private _restartLiveMode(): void {
    const x = 60,
      y = 40;
    const gameStage: IGameStage = {
      xTiles: x,
      yTiles: y,
      seed: Date.now(),
      wallHoles: [
        new Vector(0, y / 2),
        new Vector(0, y / 2 + 1),
        new Vector(x - 1, y / 2),
        new Vector(x - 1, y / 2 + 1),
      ],
      blocks: [
        new Vector(x / 2, y / 2),
        new Vector(x / 2 - 1, y / 2 - 1),
        new Vector(x / 2, y / 2 - 1),
        new Vector(x / 2 - 1, y / 2),
      ],
      snakes: [
        {
          position: new Vector(4, 4),
          direction: EDirection.RIGHT,
        },
        {
          position: new Vector(x - 4, y - 4),
          direction: EDirection.LEFT,
        },
      ],
    };

    this._isPlaybackMode = false;
    this._handler = new LiveHandler(gameStage);
    this._lastEngineTime = performance.now();
    this._gameRenderer.initRenderer(this._handler.gameStage);
  }

  private _resumeLiveMode(): void {
    this._isPlaybackMode = false;
    this._handler = new LiveHandler(
      this._handler.gameStage,
      this._handler.savedInputs
    );
  }

  private _enterPlaybackMode(): void {
    this._isPlaybackMode = true;
    this._handler = new PlaybackHandler(
      this._handler.gameStage,
      this._handler.savedInputs
    );
    this._lastEngineTime = performance.now();
  }

  private _draw(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this._gameRenderer.render(
      this.ctx,
      this._handler.state,
      this._isPlaybackMode
    );
  }
}
