import { describe, it, expect } from 'vitest';
import { EDirection, IGameStage, GameLogic } from './game-logic';
import { Vector } from './utils';

describe('GameLogic', () => {
  // Will be used in later tests
  const _defaultStage: IGameStage = {
    xTiles: 20,
    yTiles: 15,
    seed: 12345,
    wallHoles: [],
    blocks: [],
    snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
  };

  describe('Constructor', () => {
    it('should initialize the game state based on the provided IGameStage', () => {
      const stage: IGameStage = {
        xTiles: 10,
        yTiles: 8,
        seed: 12345,
        wallHoles: [],
        blocks: [new Vector(3, 3)],
        snakes: [{ position: new Vector(4, 4), direction: EDirection.RIGHT }],
      };

      const game = new GameLogic(stage);

      // Check if state was initialized correctly
      expect(game.state.blocks.length).toBeGreaterThan(1); // Should have walls + custom block
      expect(game.state.blocks).toContainEqual(new Vector(3, 3)); // Custom block
      expect(game.state.speed).toBe(12); // Default speed
      expect(game.state.applePos).toBeNull(); // Initial apple position
      expect(game.state.gameOver).toBe(false);

      // Check snake initialization
      expect(game.state.snakes.length).toBe(1);
      expect(game.state.snakes[0].position).toEqual(new Vector(4, 4));
      expect(game.state.snakes[0].dir).toBe(EDirection.RIGHT);
      expect(game.state.snakes[0].length).toBe(4); // Default length
      expect(game.state.snakes[0].tiles).toEqual([]); // Initial tiles empty
      expect(game.state.snakes[0].pendingDirs).toEqual([]); // No pending directions
    });
    it('should set up the PRNG with the correct seed', () => {
      const stage: IGameStage = {
        xTiles: 10,
        yTiles: 8,
        seed: 12345,
        wallHoles: [],
        blocks: [],
        snakes: [{ position: new Vector(4, 4), direction: EDirection.RIGHT }],
      };

      // Create two game instances with the same seed
      const game1 = new GameLogic(stage);
      const game2 = new GameLogic(stage);

      // Advance both games to generate apples
      game1.advanceTime(1000);
      game2.advanceTime(1000);

      // Both games should generate apples at the same position
      expect(game1.state.applePos).toEqual(game2.state.applePos);

      // Generate another apple in both games
      game1.state.applePos = null;
      game2.state.applePos = null;
      game1.advanceTime(1000);
      game2.advanceTime(1000);

      // The second apple should also be in the same position
      expect(game1.state.applePos).toEqual(game2.state.applePos);
    });
    it('should create initial blocks based on xTiles, yTiles, and wallHoles', () => {
      const stage: IGameStage = {
        xTiles: 5,
        yTiles: 4,
        seed: 12345,
        wallHoles: [new Vector(0, 1), new Vector(4, 2)], // Holes in left and right walls
        blocks: [new Vector(2, 2)], // Custom block in the middle
        snakes: [{ position: new Vector(2, 1), direction: EDirection.RIGHT }],
      };

      const game = new GameLogic(stage);

      // Calculate expected number of wall blocks
      // Perimeter = 2 * (width + height) - 4 corners to avoid double counting
      const perimeterBlocks = 2 * (stage.xTiles + stage.yTiles) - 4;
      const expectedBlocks =
        perimeterBlocks - stage.wallHoles.length + stage.blocks.length;

      // Verify that the blocks array contains exactly the expected blocks
      expect(game.state.blocks.length).toBe(expectedBlocks);

      // Check wall holes are properly removed
      expect(
        game.state.blocks.some(b => b.equals(new Vector(0, 1)))
      ).toBeFalsy();
      expect(
        game.state.blocks.some(b => b.equals(new Vector(4, 2)))
      ).toBeFalsy();

      // Check custom block is included
      expect(
        game.state.blocks.some(b => b.equals(new Vector(2, 2)))
      ).toBeTruthy();

      // Check corners are present
      expect(
        game.state.blocks.some(b => b.equals(new Vector(0, 0)))
      ).toBeTruthy();
      expect(
        game.state.blocks.some(b => b.equals(new Vector(4, 0)))
      ).toBeTruthy();
      expect(
        game.state.blocks.some(b => b.equals(new Vector(0, 3)))
      ).toBeTruthy();
      expect(
        game.state.blocks.some(b => b.equals(new Vector(4, 3)))
      ).toBeTruthy();
    });
    it('should initialize snakes with correct positions, lengths, directions, and empty pendingDirs', () => {
      const stage: IGameStage = {
        xTiles: 10,
        yTiles: 8,
        seed: 12345,
        wallHoles: [],
        blocks: [],
        snakes: [
          { position: new Vector(2, 2), direction: EDirection.RIGHT },
          { position: new Vector(7, 5), direction: EDirection.LEFT },
        ],
      };

      const game = new GameLogic(stage);

      expect(game.state.snakes.length).toBe(2);

      // Check first snake
      expect(game.state.snakes[0].position).toEqual(new Vector(2, 2));
      expect(game.state.snakes[0].dir).toBe(EDirection.RIGHT);
      expect(game.state.snakes[0].length).toBe(4); // Default length
      expect(game.state.snakes[0].tiles).toEqual([]); // Initial tiles empty
      expect(game.state.snakes[0].pendingDirs).toEqual([]); // No pending directions

      // Check second snake
      expect(game.state.snakes[1].position).toEqual(new Vector(7, 5));
      expect(game.state.snakes[1].dir).toBe(EDirection.LEFT);
      expect(game.state.snakes[1].length).toBe(4); // Default length
      expect(game.state.snakes[1].tiles).toEqual([]); // Initial tiles empty
      expect(game.state.snakes[1].pendingDirs).toEqual([]); // No pending directions
    });
  });

  describe('input(input: GameInput)', () => {
    describe('Direction Input', () => {
      it.todo(
        'should add a valid direction to pendingDirs for the correct snake'
      );
      it.todo(
        "should not add a direction if it's the same as the current direction"
      );
      it.todo(
        "should not add a direction if it's opposite to the current direction"
      );
      it.todo('should not add more than 2 pending directions');
      it.todo(
        'should call onInputCallback if input is handled and callback is defined'
      );
    });

    describe('Speed Input', () => {
      it.todo('should change the game speed by speedIncrement');
      it.todo('should clamp speed between 1 and 1000');
      it.todo(
        'should call onInputCallback if input is handled and callback is defined'
      );
    });
  });

  describe('advanceTime(duration: number)', () => {
    it.todo('should advance the game state based on duration and speed');
    it.todo(
      'should update snake positions based on their direction and pendingDirs'
    );
    it.todo('should handle snake movement correctly (UP, DOWN, LEFT, RIGHT)');
    it.todo('should handle wall collisions and set gameOver to true');
    it.todo('should handle self-collisions and set gameOver to true');

    describe('Apple Eating', () => {
      it.todo('should increase snake length when eating an apple');
      it.todo('should set applePos to null when eaten');
      it.todo('should generate a new apple when eaten');
    });

    it.todo('should generate a new apple if applePos is null after movement');
    it.todo('should wrap snake around the edges of the grid');
  });

  describe('_resetState()', () => {
    it.todo('should reset the game state to the initial state');
  });

  describe('_actionNewApple()', () => {
    it.todo(
      'should place a new apple in a valid position (not on blocks or snakes)'
    );
  });
});
