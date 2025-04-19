import { EDirection, GameInput, IGameStage } from './backend/game-logic.js';
import { IActor, HumanActor } from './actors.js';
import { GameRenderer } from './game-renderer.js';
import {
  GameHandlerBase,
  LiveHandler,
  PlaybackHandler,
} from './backend/state-handlers.js';
import { Vector } from './backend/utils.js';

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
  private _actors: IActor[] = [];

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
      // Route key input to the actors
      for (const actor of this._actors) {
        if (actor instanceof HumanActor) {
          actor.handleKeyInput(event);
        }
      }
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
    
    // Let actors respond to state changes
    for (const actor of this._actors) {
      const input = actor.onStateUpdate(this._handler.state);
      if (input) {
        this._performInput(input);
      }
    }
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

  /**
   * Add an actor to the game. Actors will receive state updates
   * and can provide inputs to control game entities.
   * @param actor The actor to add
   */
  addActor(actor: IActor): void {
    this._actors.push(actor);
  }
}
