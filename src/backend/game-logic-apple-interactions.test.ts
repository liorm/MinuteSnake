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

  it('should increase snake target length by 1 when eating normal apple', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    const initialTargetLength = snake.targetLength;

    game.state.apple = { position: new Vector(6, 5), type: AppleType.NORMAL };
    game.state.speed = 10;

    game.advanceTime(100);

    expect(snake.targetLength).toBe(initialTargetLength + 1);
    expect(snake.length).toBe(initialTargetLength + 1); // Should reach target after one step
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

  it('should reduce snake target length to 90% when eating diet apple', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    snake.length = 20; // Start with longer snake
    snake.targetLength = 20;
    const initialTargetLength = snake.targetLength;

    game.state.apple = { position: new Vector(6, 5), type: AppleType.DIET };
    game.state.speed = 10;

    game.advanceTime(100);

    // Should update target length to 90%
    const expectedTargetLength = Math.floor(initialTargetLength * 0.9);
    expect(snake.targetLength).toBe(expectedTargetLength);
    expect(snake.length).toBe(19); // Should start shrinking by 1 per step
  });

  it('should gradually shrink snake to target length', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    snake.length = 20; // Start with longer snake
    snake.targetLength = 20;
    const expectedFinalLength = Math.floor(20 * 0.9); // 18

    game.state.apple = { position: new Vector(6, 5), type: AppleType.DIET };
    game.state.speed = 10;

    // Eat the diet apple
    game.advanceTime(100);
    expect(snake.targetLength).toBe(expectedFinalLength);
    expect(snake.length).toBe(19); // First shrink step

    // Continue until target is reached
    game.advanceTime(100);
    expect(snake.length).toBe(18); // Should reach target

    // Verify no further changes
    game.advanceTime(100);
    expect(snake.length).toBe(18); // Should stay at target
  });

  it('should stack diet effects by further reducing target length', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];
    snake.length = 20;
    snake.targetLength = 20;

    // Apply first diet effect
    game.state.apple = { position: new Vector(6, 5), type: AppleType.DIET };
    game.state.speed = 10;
    game.advanceTime(100);

    const firstTargetLength = snake.targetLength; // Should be 18 (90% of 20)
    expect(firstTargetLength).toBe(18);

    // Apply second diet effect
    game.state.apple = { position: new Vector(7, 5), type: AppleType.DIET };
    game.advanceTime(100);

    // Should reduce further (90% of current target)
    const secondTargetLength = Math.floor(firstTargetLength * 0.9); // 16
    expect(snake.targetLength).toBe(secondTargetLength);
  });

  it('should test gradual length adjustment for growing snake', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];

    // Manually set target length higher
    snake.targetLength = 7;
    expect(snake.length).toBe(4); // Starting length

    // Advance time to trigger length adjustment
    game.advanceTime(100);
    expect(snake.length).toBe(5); // Should grow by 1

    game.advanceTime(100);
    expect(snake.length).toBe(6); // Should grow by 1 more

    game.advanceTime(100);
    expect(snake.length).toBe(7); // Should reach target

    game.advanceTime(100);
    expect(snake.length).toBe(7); // Should stay at target
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
