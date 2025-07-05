import { describe, it, expect } from 'vitest';
import { EDirection, IGameStage, GameLogic, AppleType } from './game-logic';
import { Vector } from './utils';

describe('GameLogic - Advance Time', () => {
  const _defaultStage: IGameStage = {
    xTiles: 20,
    yTiles: 15,
    seed: 12345,
    wallHoles: [],
    blocks: [],
    snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
  };

  it('should advance the game state based on duration and speed', () => {
    const game = new GameLogic(_defaultStage);
    const initialPos = game.state.snakes[0].position.clone();

    game.state.speed = 10;

    game.advanceTime(150);
    expect(game.state.snakes[0].position.x).toBe(initialPos.x + 1);
    expect(game.state.snakes[0].position.y).toBe(initialPos.y);

    game.advanceTime(50);
    expect(game.state.snakes[0].position.x).toBe(initialPos.x + 2);

    game.state.speed = 20;
    initialPos.x = game.state.snakes[0].position.x;

    game.advanceTime(120);
    expect(game.state.snakes[0].position.x).toBe(initialPos.x + 2);

    expect(game.totalDuration).toBe(320);
  });

  it('should update snake positions based on their direction and pendingDirs', () => {
    const game = new GameLogic(_defaultStage);
    const snake = game.state.snakes[0];

    expect(snake.position).toEqual(new Vector(5, 5));
    expect(snake.dir).toBe(EDirection.RIGHT);

    game.input({ inputType: 'direction', dir: EDirection.UP, snakeIdx: 0 });

    game.state.speed = 10;

    game.advanceTime(100);
    expect(snake.position).toEqual(new Vector(5, 6));
    expect(snake.dir).toBe(EDirection.UP);

    game.advanceTime(100);
    expect(snake.position).toEqual(new Vector(5, 7));
  });

  describe('Snake Movement', () => {
    it('should handle all directions correctly', () => {
      const game = new GameLogic({
        ..._defaultStage,
        snakes: [{ position: new Vector(10, 10), direction: EDirection.RIGHT }],
      });

      game.state.speed = 10;
      const snake = game.state.snakes[0];

      game.advanceTime(100);
      expect(snake.position).toEqual(new Vector(11, 10));

      game.input({ inputType: 'direction', dir: EDirection.UP, snakeIdx: 0 });
      game.advanceTime(100);
      expect(snake.position).toEqual(new Vector(11, 11));

      game.input({
        inputType: 'direction',
        dir: EDirection.LEFT,
        snakeIdx: 0,
      });
      game.advanceTime(100);
      expect(snake.position).toEqual(new Vector(10, 11));

      game.input({
        inputType: 'direction',
        dir: EDirection.DOWN,
        snakeIdx: 0,
      });
      game.advanceTime(100);
      expect(snake.position).toEqual(new Vector(10, 10));
    });

    it('should handle edge wrapping through wall holes', () => {
      const game = new GameLogic({
        xTiles: 11,
        yTiles: 11,
        seed: 12345,
        wallHoles: [
          new Vector(5, 0),
          new Vector(5, 10),
          new Vector(0, 5),
          new Vector(10, 5),
        ],
        blocks: [],
        snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
      });

      game.state.speed = 10;
      const snake = game.state.snakes[0];

      const testDirection = (
        dir: EDirection,
        hole: Vector,
        wrapTo: Vector
      ): void => {
        game.input({
          inputType: 'direction',
          dir,
          snakeIdx: 0,
        });
        game.advanceTime(100);
        expect(snake.dir).toBe(dir);

        for (let i = 0; i < 4; i++) {
          game.advanceTime(100);
        }
        expect(snake.position).toEqual(hole);

        game.advanceTime(100);
        expect(snake.position).toEqual(wrapTo);

        game.advanceTime(500);
        expect(snake.position).toEqual(new Vector(5, 5));
      };

      testDirection(EDirection.RIGHT, new Vector(10, 5), new Vector(0, 5));
      testDirection(EDirection.DOWN, new Vector(5, 0), new Vector(5, 10));
      testDirection(EDirection.LEFT, new Vector(0, 5), new Vector(10, 5));
      testDirection(EDirection.UP, new Vector(5, 10), new Vector(5, 0));
    });

    it('should cover all directions and ensure no unexpected directions', () => {
      const stage: IGameStage = {
        xTiles: 10,
        yTiles: 10,
        seed: 12345,
        wallHoles: [],
        blocks: [],
        snakes: [{ position: new Vector(4, 4), direction: EDirection.RIGHT }],
      };

      const game = new GameLogic(stage);

      // Test all valid directions
      const directions = [
        EDirection.UP,
        EDirection.DOWN,
        EDirection.LEFT,
        EDirection.RIGHT,
      ];
      directions.forEach(dir => {
        game.state.snakes[0].dir = dir;
        game.state.snakes[0].position = new Vector(4, 4); // Reset position
        game.state.snakes[0].tiles = [new Vector(4, 4)]; // Reset tiles
        game.state.gameOver = false; // Reset gameOver state
        game.advanceTime(100);
        expect(game.state.gameOver).toBe(false);
      });

      // Test invalid direction to trigger assertNever
      // @ts-expect-error: Simulate invalid direction
      game.state.snakes[0].dir = 999;
      expect(() => game.advanceTime(100)).toThrow();
    });
  });

  describe('Collisions', () => {
    it('should detect wall collisions and set gameOver', () => {
      const game = new GameLogic({
        ..._defaultStage,
        wallHoles: [],
        snakes: [{ position: new Vector(1, 1), direction: EDirection.LEFT }],
      });

      game.state.speed = 10;
      game.advanceTime(100);
      expect(game.state.gameOver).toBe(true);
    });

    it('should detect self collisions and set gameOver', () => {
      const game = new GameLogic({
        xTiles: 10,
        yTiles: 10,
        seed: 12345,
        wallHoles: [],
        blocks: [],
        snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
      });

      game.state.speed = 10;
      const snake = game.state.snakes[0];
      snake.length = 8;
      snake.targetLength = 8;

      for (let i = 0; i < 3; i++) {
        game.advanceTime(100);
      }

      game.input({
        inputType: 'direction',
        dir: EDirection.DOWN,
        snakeIdx: 0,
      });
      game.advanceTime(100);

      game.input({
        inputType: 'direction',
        dir: EDirection.LEFT,
        snakeIdx: 0,
      });
      game.advanceTime(100);

      game.input({ inputType: 'direction', dir: EDirection.UP, snakeIdx: 0 });
      game.advanceTime(100);

      expect(game.state.gameOver).toBe(true);
    });

    it('should detect collision between snakes', () => {
      const stage: IGameStage = {
        xTiles: 10,
        yTiles: 10,
        seed: 12345,
        wallHoles: [],
        blocks: [],
        snakes: [
          { position: new Vector(4, 4), direction: EDirection.RIGHT },
          { position: new Vector(5, 4), direction: EDirection.LEFT },
        ],
      };

      const game = new GameLogic(stage);

      // Setup snake tiles
      game.state.snakes[0].tiles = [new Vector(4, 4), new Vector(4, 5)];
      game.state.snakes[1].tiles = [
        new Vector(5, 4),
        new Vector(4, 4), // Collision point
      ];

      // Advance time to trigger collision detection
      game.advanceTime(100);

      // Verify collision is detected
      expect(game.state.gameOver).toBe(true);
    });

    it('should terminate the game before snake overlaps with colliding snake', () => {
      const stage: IGameStage = {
        xTiles: 11,
        yTiles: 11,
        seed: 12345,
        wallHoles: [
          new Vector(5, 0),
          new Vector(5, 10),
          new Vector(0, 5),
          new Vector(10, 5),
        ],
        blocks: [],
        snakes: [
          { position: new Vector(2, 5), direction: EDirection.RIGHT },
          { position: new Vector(6, 5), direction: EDirection.LEFT },
        ],
      };

      const game = new GameLogic(stage);

      game.advanceTime(1000);

      // Verify game terminates before overlap
      expect(game.state.gameOver).toBe(true);
      expect(game.state.snakes[0].position).toEqual(new Vector(4, 5)); // Should not move to colliding position
    });

    it('should stop further movement after collision', () => {
      const game = new GameLogic({
        ..._defaultStage,
        wallHoles: [],
        snakes: [{ position: new Vector(1, 1), direction: EDirection.LEFT }],
      });

      game.state.speed = 10;
      const initialPos = game.state.snakes[0].position.clone();

      game.advanceTime(100);
      expect(game.state.gameOver).toBe(true);

      game.advanceTime(100);
      expect(game.state.snakes[0].position).toEqual(initialPos);
    });
  });
  describe('Apple Interactions', () => {
    const _defaultStage: IGameStage = {
      xTiles: 20,
      yTiles: 15,
      seed: 12345,
      wallHoles: [],
      blocks: [],
      snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
    };

    it('should increase snake target length by 1 when eating apple', () => {
      const game = new GameLogic(_defaultStage);
      const snake = game.state.snakes[0];
      const initialTargetLength = snake.targetLength;

      game.state.apple = { position: new Vector(6, 5), type: AppleType.NORMAL };
      game.state.speed = 10;

      game.advanceTime(100);

      expect(snake.targetLength).toBe(initialTargetLength + 1);
      expect(snake.length).toBe(initialTargetLength + 1);
      expect(snake.tiles.length).toBeLessThanOrEqual(snake.length);
    });

    it('should remove apple when eaten and generate new one', () => {
      const game = new GameLogic(_defaultStage);

      game.state.apple = { position: new Vector(6, 5), type: AppleType.NORMAL };
      game.state.speed = 10;

      game.advanceTime(100);

      expect(game.state.apple).not.toBeNull();
      expect(game.state.apple.position).not.toEqual(new Vector(6, 5));
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

      const apple = game.state.apple!.position;

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
  });
});
