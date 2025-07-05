/**
 * State encoder that converts game state to neural network input format.
 * Normalizes all values to 0-1 range for optimal neural network performance.
 */

import {
  IGameState,
  IGameStateSnake,
  AppleType,
  EDirection,
} from '../backend/game-logic';
import { Vector } from '../backend/utils';

/**
 * Neural network input structure matching the architecture specification.
 * Total: 64 inputs organized by category for easy maintenance.
 */
export interface NeuralNetworkInput {
  // Snake state (16 values)
  snakeHeadX: number; // normalized 0-1
  snakeHeadY: number; // normalized 0-1
  snakeLength: number; // normalized 0-1
  snakeTargetLength: number; // normalized 0-1
  snakeBodyPositions: number[]; // up to 12 relative positions (6 pairs of x,y)

  // Apple state (4 values)
  appleX: number; // normalized 0-1
  appleY: number; // normalized 0-1
  appleType: number; // 0=normal, 1=diet
  appleDistance: number; // normalized 0-1

  // Environment state (32 values)
  wallDistances: number[]; // 4 directions
  collisionRisks: number[]; // 8 directions
  safetyScores: number[]; // 8 directions
  otherSnakeDistances: number[]; // up to 12 values

  // Game state (12 values)
  gameSpeed: number; // normalized 0-1
  gameTime: number; // normalized 0-1 (based on some max time)
  score: number; // normalized 0-1
  currentDirection: number[]; // one-hot encoded direction (4 values)
  reserved: number[]; // 5 reserved for future features
}

/**
 * Configuration for state encoding normalization.
 */
export interface StateEncoderConfig {
  /** Maximum expected game field width for normalization */
  maxFieldWidth: number;
  /** Maximum expected game field height for normalization */
  maxFieldHeight: number;
  /** Maximum expected snake length for normalization */
  maxSnakeLength: number;
  /** Maximum expected score for normalization */
  maxScore: number;
  /** Maximum game time in milliseconds for normalization */
  maxGameTime: number;
  /** Maximum game speed for normalization */
  maxGameSpeed: number;
  /** Maximum number of body segments to encode */
  maxBodySegments: number;
  /** Maximum number of other snakes to consider */
  maxOtherSnakes: number;
}

/**
 * Default configuration for typical game scenarios.
 */
export const DEFAULT_ENCODER_CONFIG: StateEncoderConfig = {
  maxFieldWidth: 50,
  maxFieldHeight: 50,
  maxSnakeLength: 100,
  maxScore: 1000,
  maxGameTime: 300000, // 5 minutes in milliseconds
  maxGameSpeed: 10,
  maxBodySegments: 6,
  maxOtherSnakes: 3,
};

/**
 * State encoder that converts game state to neural network input.
 * Handles normalization, relative positioning, and safety calculations.
 */
export class StateEncoder {
  private config: StateEncoderConfig;

  constructor(config: StateEncoderConfig = DEFAULT_ENCODER_CONFIG) {
    this.config = config;
  }

  /**
   * Encodes the game state for a specific snake into neural network input format.
   *
   * @param gameState Current game state
   * @param snakeIndex Index of the snake we're encoding for
   * @param gameTime Current game time in milliseconds
   * @returns Flat array of 64 normalized values
   */
  public encode(
    gameState: IGameState,
    snakeIndex: number,
    gameTime: number = 0
  ): number[] {
    if (snakeIndex >= gameState.snakes.length) {
      throw new Error(`Snake index ${snakeIndex} out of bounds`);
    }

    const snake = gameState.snakes[snakeIndex];
    const input: number[] = [];

    // Snake state (16 values)
    input.push(
      ...this.encodeSnakeState(snake),
      ...this.encodeSnakeBodyPositions(snake)
    );

    // Apple state (4 values)
    input.push(...this.encodeAppleState(gameState, snake));

    // Environment state (32 values)
    input.push(
      ...this.encodeWallDistances(snake, gameState),
      ...this.encodeCollisionRisks(snake, gameState),
      ...this.encodeSafetyScores(snake, gameState),
      ...this.encodeOtherSnakeDistances(snake, gameState, snakeIndex)
    );

    // Game state (12 values)
    input.push(...this.encodeGameState(gameState, snake, gameTime));

    // Ensure we have exactly 64 values
    if (input.length !== 64) {
      throw new Error(`Expected 64 input values, got ${input.length}`);
    }

    return input;
  }

  /**
   * Encodes basic snake state information.
   */
  private encodeSnakeState(snake: IGameStateSnake): number[] {
    return [
      this.normalize(snake.position.x, 0, this.config.maxFieldWidth),
      this.normalize(snake.position.y, 0, this.config.maxFieldHeight),
      this.normalize(snake.length, 1, this.config.maxSnakeLength),
      this.normalize(snake.targetLength, 1, this.config.maxSnakeLength),
    ];
  }

  /**
   * Encodes relative positions of snake body segments.
   */
  private encodeSnakeBodyPositions(snake: IGameStateSnake): number[] {
    const positions: number[] = [];
    const maxSegments = this.config.maxBodySegments;

    for (let i = 0; i < maxSegments; i++) {
      if (i < snake.tiles.length) {
        const segment = snake.tiles[i];
        const relativeX = segment.x - snake.position.x;
        const relativeY = segment.y - snake.position.y;

        // Normalize relative positions to [-1, 1] range
        positions.push(
          this.normalize(
            relativeX,
            -this.config.maxFieldWidth,
            this.config.maxFieldWidth
          ),
          this.normalize(
            relativeY,
            -this.config.maxFieldHeight,
            this.config.maxFieldHeight
          )
        );
      } else {
        // Pad with zeros for missing segments
        positions.push(0, 0);
      }
    }

    return positions;
  }

  /**
   * Encodes apple state and distance information.
   */
  private encodeAppleState(
    gameState: IGameState,
    snake: IGameStateSnake
  ): number[] {
    if (!gameState.apple) {
      return [0, 0, 0, 0]; // No apple present
    }

    const apple = gameState.apple;
    const distance = this.calculateDistance(snake.position, apple.position);
    const maxDistance = Math.sqrt(
      this.config.maxFieldWidth ** 2 + this.config.maxFieldHeight ** 2
    );

    return [
      this.normalize(apple.position.x, 0, this.config.maxFieldWidth),
      this.normalize(apple.position.y, 0, this.config.maxFieldHeight),
      apple.type === AppleType.NORMAL ? 0 : 1,
      this.normalize(distance, 0, maxDistance),
    ];
  }

  /**
   * Encodes distances to walls in 4 cardinal directions.
   */
  private encodeWallDistances(
    snake: IGameStateSnake,
    _gameState: IGameState
  ): number[] {
    const head = snake.position;
    const maxDistance = Math.max(
      this.config.maxFieldWidth,
      this.config.maxFieldHeight
    );

    return [
      this.normalize(head.y, 0, maxDistance), // Distance to top wall
      this.normalize(this.config.maxFieldHeight - head.y, 0, maxDistance), // Distance to bottom wall
      this.normalize(head.x, 0, maxDistance), // Distance to left wall
      this.normalize(this.config.maxFieldWidth - head.x, 0, maxDistance), // Distance to right wall
    ];
  }

  /**
   * Encodes collision risks in 8 directions around the snake head.
   */
  private encodeCollisionRisks(
    snake: IGameStateSnake,
    gameState: IGameState
  ): number[] {
    const head = snake.position;
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: -1 }, // Northeast
      { x: 1, y: 0 }, // East
      { x: 1, y: 1 }, // Southeast
      { x: 0, y: 1 }, // South
      { x: -1, y: 1 }, // Southwest
      { x: -1, y: 0 }, // West
      { x: -1, y: -1 }, // Northwest
    ];

    return directions.map(dir => {
      const checkPos = { x: head.x + dir.x, y: head.y + dir.y };
      return this.isPositionDangerous(checkPos, gameState, snake) ? 1 : 0;
    });
  }

  /**
   * Encodes safety scores in 8 directions (inverse of collision risk with distance weighting).
   */
  private encodeSafetyScores(
    snake: IGameStateSnake,
    gameState: IGameState
  ): number[] {
    const head = snake.position;
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: -1 }, // Northeast
      { x: 1, y: 0 }, // East
      { x: 1, y: 1 }, // Southeast
      { x: 0, y: 1 }, // South
      { x: -1, y: 1 }, // Southwest
      { x: -1, y: 0 }, // West
      { x: -1, y: -1 }, // Northwest
    ];

    return directions.map(dir => {
      let safeDistance = 0;
      for (let i = 1; i <= 5; i++) {
        // Check up to 5 tiles ahead
        const checkPos = { x: head.x + dir.x * i, y: head.y + dir.y * i };
        if (this.isPositionDangerous(checkPos, gameState, snake)) {
          break;
        }
        safeDistance = i;
      }
      return this.normalize(safeDistance, 0, 5);
    });
  }

  /**
   * Encodes distances to other snakes' heads and key body segments.
   */
  private encodeOtherSnakeDistances(
    snake: IGameStateSnake,
    _gameState: IGameState,
    currentSnakeIndex: number
  ): number[] {
    const distances: number[] = [];
    const maxDistance = Math.sqrt(
      this.config.maxFieldWidth ** 2 + this.config.maxFieldHeight ** 2
    );

    let distanceCount = 0;
    const maxDistances = 12;

    // Get distances to other snakes
    for (
      let i = 0;
      i < _gameState.snakes.length && distanceCount < maxDistances;
      i++
    ) {
      if (i === currentSnakeIndex) continue;

      const otherSnake = _gameState.snakes[i];

      // Distance to other snake's head
      const headDistance = this.calculateDistance(
        snake.position,
        otherSnake.position
      );
      distances.push(this.normalize(headDistance, 0, maxDistance));
      distanceCount++;

      // Distance to closest body segment of other snake
      if (distanceCount < maxDistances && otherSnake.tiles.length > 0) {
        const minBodyDistance = Math.min(
          ...otherSnake.tiles.map(tile =>
            this.calculateDistance(snake.position, tile)
          )
        );
        distances.push(this.normalize(minBodyDistance, 0, maxDistance));
        distanceCount++;
      }
    }

    // Pad with zeros if we have fewer distances than expected
    while (distances.length < maxDistances) {
      distances.push(0);
    }

    return distances;
  }

  /**
   * Encodes general game state information.
   */
  private encodeGameState(
    gameState: IGameState,
    snake: IGameStateSnake,
    gameTime: number
  ): number[] {
    // One-hot encode current direction
    const directionOneHot = [0, 0, 0, 0];
    switch (snake.dir) {
      case EDirection.UP:
        directionOneHot[0] = 1;
        break;
      case EDirection.RIGHT:
        directionOneHot[1] = 1;
        break;
      case EDirection.DOWN:
        directionOneHot[2] = 1;
        break;
      case EDirection.LEFT:
        directionOneHot[3] = 1;
        break;
    }

    const reserved = [0, 0, 0, 0, 0]; // 5 reserved values

    return [
      this.normalize(gameState.speed, 0, this.config.maxGameSpeed),
      this.normalize(gameTime, 0, this.config.maxGameTime),
      this.normalize(snake.score, 0, this.config.maxScore),
      ...directionOneHot,
      ...reserved,
    ];
  }

  /**
   * Checks if a position is dangerous (collision with wall, block, or snake).
   */
  private isPositionDangerous(
    position: Vector,
    gameState: IGameState,
    _currentSnake: IGameStateSnake
  ): boolean {
    // Check walls
    if (
      position.x < 0 ||
      position.x >= this.config.maxFieldWidth ||
      position.y < 0 ||
      position.y >= this.config.maxFieldHeight
    ) {
      return true;
    }

    // Check blocks
    if (
      gameState.blocks.some(
        block => block.x === position.x && block.y === position.y
      )
    ) {
      return true;
    }

    // Check all snakes (including current snake's body)
    for (const snake of gameState.snakes) {
      if (snake.position.x === position.x && snake.position.y === position.y) {
        return true;
      }
      if (
        snake.tiles.some(tile => tile.x === position.x && tile.y === position.y)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates Euclidean distance between two points.
   */
  private calculateDistance(pos1: Vector, pos2: Vector): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Normalizes a value to the range [0, 1].
   */
  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Updates the encoder configuration.
   */
  public updateConfig(newConfig: Partial<StateEncoderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current encoder configuration.
   */
  public getConfig(): StateEncoderConfig {
    return { ...this.config };
  }
}
