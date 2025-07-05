import { EDirection, GameInput, IGameStage } from './backend/game-logic';
import { IActor, HumanActor, AIActor, NNActor } from './actors/index';
import { GameRenderer } from './game-renderer';
import { GameState } from './game-state';
import {
  WelcomeRenderer,
  WelcomeScreenCallbacks,
  PlayerConfiguration,
} from './welcome-renderer';

const MAX_INPUT_ITERATIONS = 10;
import {
  GameHandlerBase,
  LiveHandler,
  PlaybackHandler,
} from './backend/state-handlers';
import { Vector } from './backend/utils';

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
  private _welcomeRenderer!: WelcomeRenderer; // Will be initialized in start()
  private _handler!: GameHandlerBase; // Will be initialized in start()
  private _lastEngineTime!: number; // Will be initialized in start()
  private _isPlaybackMode = false;
  private _actors: IActor[] = [];
  private _currentState: GameState = GameState.WELCOME;
  private _welcomeCallbacks: WelcomeScreenCallbacks;

  constructor(
    private window: Window,
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {
    this._welcomeCallbacks = {
      onStartGame: (config: PlayerConfiguration): void =>
        this._startGame(config),
    };
  }

  start(): void {
    this._gameRenderer = new GameRenderer();
    this._welcomeRenderer = new WelcomeRenderer();
    this._initListeners();
    this._updateCanvasDimensions();
    this._timeout();
  }

  private _initListeners(): void {
    this.window.addEventListener('resize', () =>
      this._updateCanvasDimensions()
    );
    this.window.addEventListener('keydown', e => this._onKeyDown(e));
    this.canvas.addEventListener('click', e => this._onCanvasClick(e));
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    // Handle welcome screen input
    if (this._currentState === GameState.WELCOME) {
      this._welcomeRenderer.handleKeyInput(event, this._welcomeCallbacks);
      event.preventDefault();
      return;
    }

    // Handle game over screen input
    if (this._currentState === GameState.GAME_OVER) {
      if (
        event.key.toLowerCase() === 'enter' ||
        event.key.toLowerCase() === 'n'
      ) {
        this._showWelcomeScreen();
      } else if (event.key.toLowerCase() === 'escape') {
        this._showWelcomeScreen();
      }
      event.preventDefault();
      return;
    }

    // Handle playing state input
    if (this._currentState === GameState.PLAYING) {
      if (event.key.toLowerCase() === 'p') {
        if (!this._isPlaybackMode) {
          this._enterPlaybackMode();
        } else {
          this._resumeLiveMode();
        }
      } else if (event.key.toLowerCase() === 'n') {
        this._restartLiveMode();
      } else if (event.key.toLowerCase() === 'escape') {
        this._showWelcomeScreen();
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
    }

    event.preventDefault();
  }

  private _onCanvasClick(event: MouseEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    // Handle welcome screen click
    if (this._currentState === GameState.WELCOME) {
      this._welcomeRenderer.handleClickInput(event, this._welcomeCallbacks);
    }

    // Handle game over screen click
    if (this._currentState === GameState.GAME_OVER) {
      this._showWelcomeScreen();
    }

    event.preventDefault();
  }

  private _updateCanvasDimensions(): void {
    this.canvas.height = this.window.innerHeight;
    this.canvas.width = this.window.innerWidth;

    // Only update game renderer if we're in playing state and have initialized it
    if (this._currentState === GameState.PLAYING && this._handler) {
      this._gameRenderer.onCanvasSizeChanged(
        this.canvas.width,
        this.canvas.height
      );
    }

    this._welcomeRenderer.onCanvasSizeChanged(
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
    // Only update game logic when in playing state
    if (this._currentState === GameState.PLAYING) {
      this._advanceTimeToNow();

      // Check for game over and transition to game over state
      if (this._handler.state.gameOver) {
        this._showGameOver();
        return;
      }

      // Let actors respond to state changes
      let hasInput = false;
      let iterations = 0;
      do {
        for (const actor of this._actors) {
          const input = actor.onStateUpdate(this._handler.state);
          if (input) {
            this._performInput(input);
            hasInput = true;
          }
        }
        iterations++;
      } while (hasInput && iterations < MAX_INPUT_ITERATIONS);
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

  private _restartLiveMode(playerConfig?: PlayerConfiguration): void {
    const x = 60,
      y = 40;

    // Create snakes based on the number of players
    const totalPlayers = playerConfig
      ? playerConfig.humanPlayers +
        playerConfig.aiPlayers +
        playerConfig.nnPlayers
      : this._actors.length;
    const snakes = this._generateSnakeStartPositions(totalPlayers, x, y);

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
      snakes: snakes,
    };

    this._isPlaybackMode = false;
    this._handler = new LiveHandler(gameStage);
    this._lastEngineTime = performance.now();
    this._gameRenderer.initRenderer(this._handler.gameStage);
  }

  private _generateSnakeStartPositions(
    numPlayers: number,
    boardWidth: number,
    boardHeight: number
  ): Array<{ position: Vector; direction: EDirection }> {
    const snakes = [];
    const margin = 4;

    // Define starting positions for up to 6 players (2 human + 4 AI max)
    const startPositions = [
      { position: new Vector(margin, margin), direction: EDirection.RIGHT },
      {
        position: new Vector(boardWidth - margin, boardHeight - margin),
        direction: EDirection.LEFT,
      },
      {
        position: new Vector(boardWidth - margin, margin),
        direction: EDirection.DOWN,
      },
      {
        position: new Vector(margin, boardHeight - margin),
        direction: EDirection.UP,
      },
      {
        position: new Vector(boardWidth / 2, margin),
        direction: EDirection.DOWN,
      },
      {
        position: new Vector(boardWidth / 2, boardHeight - margin),
        direction: EDirection.UP,
      },
    ];

    // Take only the number of positions we need
    for (let i = 0; i < Math.min(numPlayers, startPositions.length); i++) {
      snakes.push(startPositions[i]);
    }

    return snakes;
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

    if (this._currentState === GameState.WELCOME) {
      this._welcomeRenderer.render(this.ctx);
    } else if (
      this._currentState === GameState.PLAYING ||
      this._currentState === GameState.GAME_OVER
    ) {
      this._gameRenderer.render(
        this.ctx,
        this._handler.state,
        this._isPlaybackMode
      );
    }
  }

  /**
   * Add an actor to the game. Actors will receive state updates
   * and can provide inputs to control game entities.
   * @param actor The actor to add
   */
  addActor(actor: IActor): void {
    this._actors.push(actor);
  }

  /**
   * Transitions from welcome screen to active gameplay.
   * Initializes the game state and begins the game loop.
   */
  private _startGame(playerConfig: PlayerConfiguration): void {
    this._currentState = GameState.PLAYING;

    // Create actors based on configuration
    this._actors = [];
    let snakeIndex = 0;

    // Add human players
    for (let i = 0; i < playerConfig.humanPlayers; i++) {
      const keyMap = this._getKeyMapForPlayer(i);
      this._actors.push(new HumanActor(snakeIndex, keyMap));
      snakeIndex++;
    }

    // Add AI players
    for (let i = 0; i < playerConfig.aiPlayers; i++) {
      this._actors.push(new AIActor(snakeIndex));
      snakeIndex++;
    }

    // Add NN players
    for (let i = 0; i < playerConfig.nnPlayers; i++) {
      this._actors.push(NNActor.createRandom(snakeIndex));
      snakeIndex++;
    }

    this._restartLiveMode(playerConfig);

    // Update canvas dimensions for game renderer now that we have game options
    this._gameRenderer.onCanvasSizeChanged(
      this.canvas.width,
      this.canvas.height
    );
  }

  private _getKeyMapForPlayer(playerIndex: number): {
    up: string;
    down: string;
    left: string;
    right: string;
  } {
    if (playerIndex === 0) {
      return {
        up: 'arrowup',
        down: 'arrowdown',
        left: 'arrowleft',
        right: 'arrowright',
      };
    } else {
      // Second player uses WASD keys
      return {
        up: 'w',
        down: 's',
        left: 'a',
        right: 'd',
      };
    }
  }

  /**
   * Returns to the welcome screen from any other state.
   * Resets the game state and clears actors.
   */
  private _showWelcomeScreen(): void {
    this._currentState = GameState.WELCOME;
    this._actors = [];
    this._isPlaybackMode = false;
  }

  /**
   * Transitions to game over state.
   * This can be called when the game ends.
   */
  private _showGameOver(): void {
    this._currentState = GameState.GAME_OVER;
  }

  /**
   * Gets the current game state.
   * @returns The current GameState
   */
  get currentState(): GameState {
    return this._currentState;
  }
}
