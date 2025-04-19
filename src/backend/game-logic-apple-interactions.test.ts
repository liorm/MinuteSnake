import { describe, it, expect } from 'vitest';
import { EDirection, IGameStage, GameLogic } from './game-logic';
import { Vector } from './utils';

describe('GameLogic - Apple Interactions', () => {
  const _defaultStage: IGameStage = {
    xTiles: 20,
    yTiles: 15,
    seed: 12345,
    wallHoles: [],
    blocks: [],
    snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
  };

  it('should increase snake length when eating apple', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    const initialLength = snake.length;

    game.state.applePos = new Vector(6, 5);
    game.state.speed = 10;

    game.advanceTime(100);

    expect(snake.length).toBe(initialLength + 2);
    expect(snake.tiles.length).toBeLessThanOrEqual(snake.length);
  });

  it('should remove apple when eaten and generate new one', () => {
    const game = new GameLogic(_defaultStage);

    game.state.applePos = new Vector(6, 5);
    game.state.speed = 10;

    game.advanceTime(100);

    expect(game.state.applePos).not.toBeNull();
    expect(game.state.applePos).not.toEqual(new Vector(6, 5));
  });

  it('should generate new apple in valid position', () => {
    const game = new GameLogic({
      xTiles: 10,
      yTiles: 10,
      seed: 12345,
      wallHoles: [],
      blocks: [new Vector(3, 3)],
      snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
    });

    game.state.applePos = null;
    game.advanceTime(100);

    const apple = game.state.applePos!;

    expect(apple.x).toBeGreaterThanOrEqual(0);
    expect(apple.x).toBeLessThan(10);
    expect(apple.y).toBeGreaterThanOrEqual(0);
    expect(apple.y).toBeLessThan(10);

    expect(game.state.blocks.some(b => b.equals(apple))).toBe(false);
    expect(game.state.snakes[0].tiles.some(t => t.equals(apple))).toBe(false);
  });

  it('should generate deterministic apple positions with same seed', () => {
    const stage = {
      ..._defaultStage,
      seed: 12345,
    };

    const game1 = new GameLogic(stage);
    const game2 = new GameLogic(stage);

    game1.state.applePos = null;
    game2.state.applePos = null;
    game1.advanceTime(100);
    game2.advanceTime(100);

    expect(game1.state.applePos).toEqual(game2.state.applePos);

    game1.state.applePos = null;
    game2.state.applePos = null;
    game1.advanceTime(100);
    game2.advanceTime(100);

    expect(game1.state.applePos).toEqual(game2.state.applePos);
  });
});
