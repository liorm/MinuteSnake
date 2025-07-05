import { EDirection, GameInput, IGameState } from '../backend/game-logic';
import { Vector } from '../backend/utils';
import { IActor } from './actor';

/**
 * AI-controlled actor that moves the snake toward the apple while avoiding
 * obstacles like walls, its own body, and other snakes.
 */
export class AIActor implements IActor {
  constructor(
    private snakeIdx: number,
    private readonly safetyRadius: number = 3
  ) {}

  private isNearOtherSnake(
    pos: Vector,
    state: IGameState,
    radius: number
  ): boolean {
    const otherSnakes = state.snakes.filter((_, idx) => idx !== this.snakeIdx);
    for (const snake of otherSnakes) {
      for (const tile of snake.tiles) {
        const dx = Math.abs(pos.x - tile.x);
        const dy = Math.abs(pos.y - tile.y);
        if (dx <= radius && dy <= radius) {
          return true;
        }
      }
    }
    return false;
  }

  private wouldCollideWithSelf(pos: Vector, state: IGameState): boolean {
    const currentSnake = state.snakes[this.snakeIdx];
    const bodyTiles = currentSnake.tiles.slice(1); // Exclude head
    return bodyTiles.some(tile => tile.x === pos.x && tile.y === pos.y);
  }

  private isTooCloseToWalls(
    pos: Vector,
    state: IGameState,
    radius: number
  ): boolean {
    const boardSize = state.blocks.length - 1; // Assuming square board with walls at edges
    return (
      pos.x < radius ||
      pos.y < radius ||
      pos.x > boardSize - radius - 1 ||
      pos.y > boardSize - radius - 1
    );
  }

  private isAppleNearWalls(
    apple: Vector,
    state: IGameState,
    radius: number
  ): boolean {
    const boardSize = state.blocks.length - 1;
    return (
      apple.x < radius ||
      apple.y < radius ||
      apple.x > boardSize - radius - 1 ||
      apple.y > boardSize - radius - 1
    );
  }

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

    // Check if apple is near walls - if so, we should ignore wall safety to reach it
    const appleNearWalls = this.isAppleNearWalls(apple, state, 2);

    // Try each move in priority order
    for (const dir of moves) {
      const nextPos = this.getNextPosition(snake.position, dir, state);

      // Check if move is safe (no obstacles, not too close to other snakes, and won't hit own body)
      // Only check wall safety if apple is NOT near walls
      if (
        !obstacles.has(`${nextPos.x},${nextPos.y}`) &&
        !this.isNearOtherSnake(nextPos, state, this.safetyRadius) &&
        (appleNearWalls || !this.isTooCloseToWalls(nextPos, state, 2)) &&
        !this.wouldCollideWithSelf(nextPos, state)
      ) {
        return {
          inputType: 'direction',
          dir,
          snakeIdx: this.snakeIdx,
        };
      }
    }

    // If no good moves found, try to find any safe move that avoids other snakes
    const allDirections = [
      EDirection.UP,
      EDirection.RIGHT,
      EDirection.DOWN,
      EDirection.LEFT,
    ];
    for (const dir of allDirections) {
      const nextPos = this.getNextPosition(snake.position, dir, state);
      if (
        !obstacles.has(`${nextPos.x},${nextPos.y}`) &&
        !this.isNearOtherSnake(nextPos, state, 2) &&
        (appleNearWalls || !this.isTooCloseToWalls(nextPos, state, 2)) &&
        !this.wouldCollideWithSelf(nextPos, state)
      ) {
        return {
          inputType: 'direction',
          dir,
          snakeIdx: this.snakeIdx,
        };
      }
    }

    // If still no safe moves found, just continue in current direction
    return null;
  }

  private getNextPosition(
    pos: Vector,
    dir: EDirection,
    state: IGameState
  ): Vector {
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
