import { Vector } from './utils.js';
import seedrandom from 'seedrandom';

function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}

/**
 * Represents a timestamped game input event used for replay functionality.
 * Captures both the type of input and when it occurred during gameplay.
 */
export interface IGameEventInput {
  eventTime: number;
  gameInput: GameInput;
}

/**
 * Represents cardinal directions for snake movement.
 * Opposing directions have values that sum to 0, which is used
 * to prevent 180-degree turns.
 */
export enum EDirection {
  UP = 1,
  RIGHT = 2,
  LEFT = -2,
  DOWN = -1,
}

/**
 * Basic game configuration options defining the playing field size
 * and random number generation seed for deterministic gameplay.
 */
export interface IGameOptions {
  xTiles: number;
  yTiles: number;
  seed: number;
}

/**
 * Complete game stage configuration including wall holes (portals),
 * obstacle blocks, and initial snake positions/directions.
 * Extends IGameOptions to include all elements needed for stage setup.
 */
export interface IGameStage extends IGameOptions {
  wallHoles: Vector[];
  blocks: Vector[];

  /// Starting positions for the snake.
  snakes: {
    position: Vector;
    direction: EDirection;
  }[];
}

/**
 * Represents the current state of a snake in the game.
 * Tracks position, length, occupied tiles, current direction
 * and queued direction changes.
 */
export interface IGameStateSnake {
  position: Vector;
  length: number;
  tiles: Vector[];
  dir: EDirection;
  pendingDirs: EDirection[];
}

/**
 * Complete game state including all snakes, obstacles,
 * apple position, game speed and win/loss condition.
 * Used by both the game logic and renderer.
 */
export interface IGameState {
  blocks: Vector[];
  speed: number;
  applePos: Vector | null;
  snakes: IGameStateSnake[];
  gameOver: boolean;
}

/**
 * Direction change input for a specific snake.
 * Used to queue new movement directions that will be applied
 * on the next game step.
 */
export interface IGameInputDirection {
  inputType: 'direction';
  dir: EDirection;
  snakeIdx: number;
}

/**
 * Speed adjustment input that modifies the game's
 * update rate. Controls how frequently the game state advances.
 */
export interface IGameInputSpeed {
  inputType: 'speed';
  speedIncrement: number;
}

export type GameInput = IGameInputDirection | IGameInputSpeed;

/**
 * Core game logic implementation handling snake movement, collisions,
 * apple placement, and game state management. Uses seeded random number
 * generation for deterministic apple placement, enabling replay functionality.
 *
 * Maintains game state including snake positions, apple location, blocks,
 * and handles input processing for direction changes and speed adjustments.
 *
 * Example:
 * ```typescript
 * const gameLogic = new GameLogic(gameStage);
 * gameLogic.input({ inputType: 'direction', dir: EDirection.RIGHT, snakeIdx: 0 });
 * gameLogic.advanceTime(16); // Advance game by 16ms
 * ```
 */
export class GameLogic {
  private _prng: () => number;
  private _state: IGameState;
  private _pendingDuration: number = 0;
  private _totalDuration: number = 0;
  onInputCallback: ((event: IGameEventInput) => void) | undefined;

  get options(): IGameOptions {
    return this._stage;
  }
  get state(): IGameState {
    return this._state;
  }
  get totalDuration(): number {
    return this._totalDuration;
  }

  constructor(private _stage: IGameStage) {
    this._prng = seedrandom(`${_stage.seed}\0`);
    this._state = this._createInitialState();
  }

  private _createInitialState(): IGameState {
    let blocks: Vector[] = [];
    for (let x = 0; x < this._stage.xTiles; ++x) {
      blocks.push(new Vector(x, 0), new Vector(x, this._stage.yTiles - 1));
    }
    // Add vertical walls (left and right) excluding corners
    for (let y = 1; y < this._stage.yTiles - 1; ++y) {
      blocks.push(new Vector(0, y), new Vector(this._stage.xTiles - 1, y));
    }
    blocks = blocks.filter(block => {
      return !this._stage.wallHoles.find(hole => hole.equals(block));
    });
    blocks.push(...this._stage.blocks);

    return {
      blocks,
      speed: 12,
      applePos: null,
      snakes: this._stage.snakes.map(snake => ({
        position: snake.position,
        length: 4,
        tiles: [],
        dir: snake.direction,
        pendingDirs: [],
      })),
      gameOver: false,
    };
  }

  private _resetState(): void {
    this._pendingDuration = 0;
    this._totalDuration = 0;
    this._prng = seedrandom(`${this.options.seed}\0`);
    this._state = this._createInitialState();
  }

  private _actionStep(): boolean {
    const state = this._state;

    if (state.gameOver) {
      return false;
    }

    for (let i = 0; i < state.snakes.length; i++) {
      const snake = state.snakes[i];
      if (snake.pendingDirs.length > 0) {
        snake.dir = snake.pendingDirs[0];
        snake.pendingDirs.splice(0, 1);
      }

      let direction: Vector;
      switch (snake.dir) {
        case EDirection.UP:
          direction = new Vector(0, 1);
          break;
        case EDirection.DOWN:
          direction = new Vector(0, -1);
          break;
        case EDirection.LEFT:
          direction = new Vector(-1, 0);
          break;
        case EDirection.RIGHT:
          direction = new Vector(1, 0);
          break;
        default:
          return assertNever(snake.dir);
      }

      const newPosition = snake.position.add(direction);

      // Check collision with other snakes before updating position
      for (let j = 0; j < state.snakes.length; j++) {
        if (i !== j) {
          const otherSnake = state.snakes[j];
          if (otherSnake.tiles.find(v => v.equals(newPosition))) {
            state.gameOver = true;
            return false;
          }
        }
      }

      // Hit the wall?
      if (state.blocks.find(v => v.equals(newPosition))) {
        state.gameOver = true;
        return false;
      }

      // Hit self?
      if (snake.tiles.find(v => v.equals(newPosition))) {
        state.gameOver = true;
        return false;
      }

      if (newPosition.x < 0) {
        newPosition.x = this.options.xTiles - 1;
      }
      if (newPosition.y < 0) {
        newPosition.y = this.options.yTiles - 1;
      }
      if (newPosition.x > this.options.xTiles - 1) {
        newPosition.x = 0;
      }
      if (newPosition.y > this.options.yTiles - 1) {
        newPosition.y = 0;
      }

      snake.position = newPosition;
      snake.tiles.push(newPosition);

      // Ate an apple?
      if (snake.position.equals(state.applePos)) {
        state.applePos = null;
        snake.length += 2;
      }

      while (snake.tiles.length > snake.length) {
        snake.tiles.splice(0, 1);
      }
      // Check collision with other snakes before updating position
      for (let j = 0; j < state.snakes.length; j++) {
        if (i !== j) {
          const otherSnake = state.snakes[j];
          if (otherSnake.tiles.find(v => v.equals(newPosition))) {
            state.gameOver = true;
            return false;
          }
        }
      }

      snake.position = newPosition;
      snake.tiles.push(newPosition);
    }

    if (!state.applePos) {
      this._actionNewApple();
    }

    return true;
  }

  private _actionNewApple(): void {
    let newPos: Vector;
    while (true) {
      newPos = new Vector(
        Math.floor(this._prng() * this.options.xTiles),
        Math.floor(this._prng() * this.options.yTiles)
      );

      if (this._state.blocks.find(v => v.equals(newPos))) {
        continue;
      }

      if (
        this._state.snakes.find(
          snake => !!snake.tiles.find(v => v.equals(newPos))
        )
      ) {
        continue;
      }

      break;
    }
    this._state.applePos = newPos;
  }

  private _actionNewDir(snakeIdx: number, newDir: EDirection): boolean {
    const snakeState = this._state.snakes[snakeIdx];
    if (snakeState.pendingDirs.length >= 2) {
      return false;
    }

    let curDir = snakeState.dir;
    if (snakeState.pendingDirs.length > 0) {
      curDir = snakeState.pendingDirs[snakeState.pendingDirs.length - 1];
    }

    if (curDir === newDir || curDir + newDir === 0) {
      return false;
    }

    snakeState.pendingDirs.push(newDir);
    return true;
  }

  private _actionSpeedChange(speedIncrement: number): boolean {
    let newSpeed = this._state.speed + speedIncrement;
    newSpeed = Math.max(1, Math.min(1000, newSpeed));
    this._state.speed = newSpeed;
    return true;
  }

  input(input: GameInput): void {
    let handled = false;
    switch (input.inputType) {
      case 'direction':
        handled = this._actionNewDir(input.snakeIdx, input.dir);
        break;
      case 'speed':
        handled = this._actionSpeedChange(input.speedIncrement);
        break;
      default:
        assertNever(input);
    }

    if (this.onInputCallback && handled) {
      this.onInputCallback({
        eventTime: this._totalDuration,
        gameInput: input,
      });
    }
  }

  advanceTime(duration: number): void {
    this._totalDuration += duration;
    this._pendingDuration += duration;

    const stepSize = 1000 / this._state.speed;
    const totalSteps = Math.floor(this._pendingDuration / stepSize);
    for (let i = 0; i < totalSteps; ++i) {
      this._actionStep();
    }
    this._pendingDuration -= totalSteps * stepSize;
  }
}
