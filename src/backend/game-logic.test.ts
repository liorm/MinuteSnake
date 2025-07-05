import { describe, it, expect } from 'vitest';
import { EDirection, IGameStage, GameLogic, AppleType } from './game-logic';
import { Vector } from './utils';

// Private method tests
describe('GameLogic - Private Methods', () => {
  describe('_resetState', () => {
    it('should reset all state properties to initial values', () => {
      const stage: IGameStage = {
        xTiles: 10,
        yTiles: 8,
        seed: 12345,
        wallHoles: [],
        blocks: [],
        snakes: [{ position: new Vector(4, 4), direction: EDirection.RIGHT }],
      };

      const game = new GameLogic(stage);

      // Modify state
      game.state.speed = 20;
      game.state.apple = { position: new Vector(3, 3), type: AppleType.NORMAL };
      game.state.snakes[0].length = 8;
      game.state.snakes[0].tiles = [new Vector(4, 4), new Vector(3, 4)];
      game.state.snakes[0].score = 5; // Set a score to test reset
      game.advanceTime(1000); // This will modify totalDuration

      // Get private method access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for testing private method
      const resetState = (game as any)['_resetState'].bind(game);
      resetState();

      // Verify reset state
      expect(game.state.speed).toBe(12); // Default speed
      expect(game.state.apple).toBeNull();
      expect(game.state.snakes[0].length).toBe(4); // Default length
      expect(game.state.snakes[0].tiles).toEqual([]);
      expect(game.state.snakes[0].score).toBe(0); // Score should reset to 0
      expect(game.totalDuration).toBe(0);

      // Test PRNG reset by generating apples
      game.advanceTime(100);
      const firstApple = game.state.apple;

      resetState();
      game.advanceTime(100);

      // Apple positions should match after reset due to same PRNG sequence
      expect(game.state.apple).toEqual(firstApple);
    });
  });

  describe('_actionNewApple', () => {
    it('should place apple in valid position avoiding blocks and snake', () => {
      const stage: IGameStage = {
        xTiles: 5,
        yTiles: 5,
        seed: 12345,
        wallHoles: [],
        blocks: [new Vector(1, 1), new Vector(1, 2)],
        snakes: [{ position: new Vector(2, 2), direction: EDirection.RIGHT }],
      };

      const game = new GameLogic(stage);

      // Setup snake tiles
      game.state.snakes[0].tiles = [
        new Vector(2, 2),
        new Vector(2, 3),
        new Vector(2, 4),
      ];

      // Get private method access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for testing private method
      const actionNewApple = (game as any)['_actionNewApple'].bind(game);

      // Generate multiple apples to verify placement
      for (let i = 0; i < 10; i++) {
        game.state.apple = null;
        actionNewApple();

        const apple = game.state.apple;
        expect(apple).not.toBeNull();

        // Verify apple is within bounds
        // We know apple is not null here because we just generated it
        const applePos = game.state.apple!.position;
        expect(applePos.x).toBeGreaterThanOrEqual(0);
        expect(applePos.x).toBeLessThan(stage.xTiles);
        expect(applePos.y).toBeGreaterThanOrEqual(0);
        expect(applePos.y).toBeLessThan(stage.yTiles);

        // Verify apple is not on blocks
        expect(stage.blocks.some(block => block.equals(applePos))).toBeFalsy();

        // Verify apple is not on snake
        expect(
          game.state.snakes[0].tiles.some(tile => tile.equals(applePos))
        ).toBeFalsy();
      }
    });

    it('should generate deterministic apple positions with same seed', () => {
      const stage: IGameStage = {
        xTiles: 10,
        yTiles: 8,
        seed: 12345,
        wallHoles: [],
        blocks: [],
        snakes: [{ position: new Vector(4, 4), direction: EDirection.RIGHT }],
      };

      const game1 = new GameLogic(stage);
      const game2 = new GameLogic(stage);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for testing private method
      const actionNewApple1 = (game1 as any)['_actionNewApple'].bind(game1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for testing private method
      const actionNewApple2 = (game2 as any)['_actionNewApple'].bind(game2);

      // Generate sequence of apples in both games
      const applePositions1: Vector[] = [];
      const applePositions2: Vector[] = [];

      for (let i = 0; i < 5; i++) {
        game1.state.apple = null;
        game2.state.apple = null;

        actionNewApple1();
        actionNewApple2();

        applePositions1.push(game1.state.apple!.position.clone());
        applePositions2.push(game2.state.apple!.position.clone());
      }

      // Verify apple sequences match
      expect(applePositions1).toEqual(applePositions2);
    });
  });
});
