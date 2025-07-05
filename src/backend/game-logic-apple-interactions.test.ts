import { describe, it, expect } from 'vitest';
import { EDirection, IGameStage, GameLogic, AppleType } from './game-logic';
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

  it('should increase snake length when eating normal apple', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    const initialLength = snake.length;

    game.state.apple = { position: new Vector(6, 5), type: AppleType.NORMAL };
    game.state.speed = 10;

    game.advanceTime(100);

    expect(snake.length).toBe(initialLength + 2);
    expect(snake.tiles.length).toBeLessThanOrEqual(snake.length);
  });

  it('should increase snake score when eating apple', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    const initialScore = snake.score;

    game.state.apple = { position: new Vector(6, 5), type: AppleType.NORMAL };
    game.state.speed = 10;

    game.advanceTime(100);

    expect(snake.score).toBe(initialScore + 1);
  });

  it('should increment score for each apple eaten', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];

    // Eat first apple
    game.state.apple = { position: new Vector(6, 5), type: AppleType.NORMAL };
    game.state.speed = 10;
    game.advanceTime(100);
    expect(snake.score).toBe(1);

    // Eat second apple
    game.state.apple = { position: new Vector(7, 5), type: AppleType.NORMAL };
    game.advanceTime(100);
    expect(snake.score).toBe(2);

    // Eat third apple
    game.state.apple = { position: new Vector(8, 5), type: AppleType.NORMAL };
    game.advanceTime(100);
    expect(snake.score).toBe(3);
  });

  it('should remove apple when eaten and generate new one', () => {
    const game = new GameLogic(_defaultStage);

    game.state.apple = { position: new Vector(6, 5), type: AppleType.NORMAL };
    game.state.speed = 10;

    game.advanceTime(100);

    expect(game.state.apple).not.toBeNull();
    expect(game.state.apple!.position).not.toEqual(new Vector(6, 5));
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

    game.state.apple = null;
    game.advanceTime(100);

    const apple = game.state.apple!;
    const applePos = apple.position;

    expect(applePos.x).toBeGreaterThanOrEqual(0);
    expect(applePos.x).toBeLessThan(10);
    expect(applePos.y).toBeGreaterThanOrEqual(0);
    expect(applePos.y).toBeLessThan(10);

    expect(game.state.blocks.some(b => b.equals(applePos))).toBe(false);
    expect(game.state.snakes[0].tiles.some(t => t.equals(applePos))).toBe(
      false
    );
  });

  it('should generate deterministic apple positions with same seed', () => {
    const stage = {
      ..._defaultStage,
      seed: 12345,
    };

    const game1 = new GameLogic(stage);
    const game2 = new GameLogic(stage);

    game1.state.apple = null;
    game2.state.apple = null;
    game1.advanceTime(100);
    game2.advanceTime(100);

    expect(game1.state.apple).toEqual(game2.state.apple);

    game1.state.apple = null;
    game2.state.apple = null;
    game1.advanceTime(100);
    game2.advanceTime(100);

    expect(game1.state.apple).toEqual(game2.state.apple);
  });

  it('should reduce snake length gradually when eating diet apple', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    snake.length = 20; // Start with longer snake
    const initialLength = snake.length;

    game.state.apple = { position: new Vector(6, 5), type: AppleType.DIET };
    game.state.speed = 10;

    game.advanceTime(100);

    // Should start diet effect
    expect(snake.dietEffect).toBeDefined();
    expect(snake.dietEffect!.originalLength).toBe(initialLength);
    expect(snake.dietEffect!.targetLength).toBe(
      Math.floor(initialLength * 0.9)
    );
    expect(snake.dietEffect!.stepsRemaining).toBe(4); // Started with 5, reduced by 1
  });

  it('should complete diet effect over 5 steps', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    snake.length = 20; // Start with longer snake
    const initialLength = snake.length;
    const expectedFinalLength = Math.floor(initialLength * 0.9);

    game.state.apple = { position: new Vector(6, 5), type: AppleType.DIET };
    game.state.speed = 10;

    // Eat the diet apple
    game.advanceTime(100);

    // Skip ahead to process all diet effect steps
    for (let i = 0; i < 4; i++) {
      game.advanceTime(100);
    }

    expect(snake.dietEffect).toBeUndefined();
    expect(snake.length).toBe(expectedFinalLength);
  });

  it('should not apply diet effect if one is already active', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    snake.length = 20;

    // Apply first diet effect
    game.state.apple = { position: new Vector(6, 5), type: AppleType.DIET };
    game.state.speed = 10;
    game.advanceTime(100);

    const firstEffect = snake.dietEffect!;

    // Try to apply second diet effect
    game.state.apple = { position: new Vector(7, 5), type: AppleType.DIET };
    game.advanceTime(100);

    // Should still have the same effect
    expect(snake.dietEffect).toBe(firstEffect);
  });

  it('should generate both normal and diet apples randomly', () => {
    const game = new GameLogic(_defaultStage);
    const appleTypes: AppleType[] = [];

    // Generate many apples to check distribution
    for (let i = 0; i < 100; i++) {
      game.state.apple = null;
      game.advanceTime(100);
      if (game.state.apple) {
        appleTypes.push(game.state.apple.type);
      }
    }

    // Should have both types
    expect(appleTypes.includes(AppleType.NORMAL)).toBe(true);
    expect(appleTypes.includes(AppleType.DIET)).toBe(true);

    // Should have more normal apples than diet apples (80/20 split)
    const normalCount = appleTypes.filter(t => t === AppleType.NORMAL).length;
    const dietCount = appleTypes.filter(t => t === AppleType.DIET).length;

    expect(normalCount).toBeGreaterThan(dietCount);
  });
});
