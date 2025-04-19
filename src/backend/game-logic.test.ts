import { describe, it, expect, vi } from 'vitest';
import { EDirection, IGameStage, GameLogic } from './game-logic';
import { Vector } from './utils';
import { V } from 'vitest/dist/chunks/reporters.d.CfRkRKN2';

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
      it('should add a valid direction to pendingDirs for the correct snake', () => {
        // Create stage with two snakes going in different directions
        const stage: IGameStage = {
          ..._defaultStage,
          snakes: [
            { position: new Vector(5, 5), direction: EDirection.RIGHT },
            { position: new Vector(10, 10), direction: EDirection.LEFT },
          ],
        };

        const game = new GameLogic(stage);
        let inputHandled = false;

        // Set up input callback
        game.onInputCallback = () => {
          inputHandled = true;
        };

        // Initially both snakes should have empty pendingDirs
        expect(game.state.snakes[0].pendingDirs).toEqual([]);
        expect(game.state.snakes[1].pendingDirs).toEqual([]);

        // Add direction for first snake
        game.input({
          inputType: 'direction',
          dir: EDirection.UP,
          snakeIdx: 0,
        });

        // Verify direction was added only to first snake
        expect(game.state.snakes[0].pendingDirs).toEqual([EDirection.UP]);
        expect(game.state.snakes[1].pendingDirs).toEqual([]);

        // Verify input was handled (callback triggered)
        expect(inputHandled).toBe(true);
      });
      it("should not add a direction if it's the same as the current direction", () => {
        const game = new GameLogic(_defaultStage);
        let inputHandled = false;

        // Set up input callback
        game.onInputCallback = () => {
          inputHandled = true;
        };

        // Verify pendingDirs is initially empty
        expect(game.state.snakes[0].pendingDirs).toEqual([]);

        // Try to add the same direction as current (RIGHT)
        game.input({
          inputType: 'direction',
          dir: EDirection.RIGHT,
          snakeIdx: 0,
        });

        // Verify direction was not added
        expect(game.state.snakes[0].pendingDirs).toEqual([]);

        // Verify callback was not triggered since input wasn't handled
        expect(inputHandled).toBe(false);
      });
      it("should not add a direction if it's opposite to the current direction", () => {
        // Create stage with two snakes going in different directions
        const stage: IGameStage = {
          ..._defaultStage,
          snakes: [
            { position: new Vector(5, 5), direction: EDirection.RIGHT },
            { position: new Vector(10, 10), direction: EDirection.UP },
          ],
        };

        const game = new GameLogic(stage);
        let inputHandled = false;

        // Set up input callback
        game.onInputCallback = () => {
          inputHandled = true;
        };

        // Test first snake (going RIGHT)
        expect(game.state.snakes[0].pendingDirs).toEqual([]);
        game.input({
          inputType: 'direction',
          dir: EDirection.LEFT, // Opposite to RIGHT
          snakeIdx: 0,
        });
        expect(game.state.snakes[0].pendingDirs).toEqual([]);
        expect(inputHandled).toBe(false);

        // Test second snake (going UP)
        expect(game.state.snakes[1].pendingDirs).toEqual([]);
        game.input({
          inputType: 'direction',
          dir: EDirection.DOWN, // Opposite to UP
          snakeIdx: 1,
        });
        expect(game.state.snakes[1].pendingDirs).toEqual([]);
        expect(inputHandled).toBe(false);
      });
      it('should not add more than 2 pending directions', () => {
        const game = new GameLogic(_defaultStage);
        let callbackCount = 0;

        // Set up input callback
        game.onInputCallback = () => {
          callbackCount++;
        };

        // Verify pendingDirs is initially empty
        expect(game.state.snakes[0].pendingDirs).toEqual([]);

        // Add first direction (UP)
        game.input({
          inputType: 'direction',
          dir: EDirection.UP,
          snakeIdx: 0,
        });

        // Verify first direction added
        expect(game.state.snakes[0].pendingDirs).toEqual([EDirection.UP]);
        expect(callbackCount).toBe(1);

        // Add second direction (LEFT)
        game.input({
          inputType: 'direction',
          dir: EDirection.LEFT,
          snakeIdx: 0,
        });

        // Verify second direction added
        expect(game.state.snakes[0].pendingDirs).toEqual([
          EDirection.UP,
          EDirection.LEFT,
        ]);
        expect(callbackCount).toBe(2);

        // Try to add third direction (DOWN)
        game.input({
          inputType: 'direction',
          dir: EDirection.DOWN,
          snakeIdx: 0,
        });

        // Verify third direction was not added and callback not triggered
        expect(game.state.snakes[0].pendingDirs).toEqual([
          EDirection.UP,
          EDirection.LEFT,
        ]);
        expect(callbackCount).toBe(2);
      });
      it('should call onInputCallback if input is handled and callback is defined', () => {
        const game = new GameLogic(_defaultStage);
        const mockCallback = vi.fn();
        game.onInputCallback = mockCallback;

        // Test valid input - should call callback
        const validInput = {
          inputType: 'direction' as const,
          dir: EDirection.UP,
          snakeIdx: 0,
        };
        game.input(validInput);

        // Verify callback was called with correct parameters
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith({
          eventTime: 0,
          gameInput: validInput,
        });

        // Test invalid input (same direction) - should not call callback
        const invalidInput = {
          inputType: 'direction' as const,
          dir: EDirection.UP, // Same as current pending direction
          snakeIdx: 0,
        };
        game.input(invalidInput);

        // Verify callback wasn't called again
        expect(mockCallback).toHaveBeenCalledTimes(1);

        // Test undefined callback
        game.onInputCallback = undefined;
        const newInput = {
          inputType: 'direction' as const,
          dir: EDirection.LEFT,
          snakeIdx: 0,
        };

        // Verify no error occurs when callback is undefined
        expect(() => game.input(newInput)).not.toThrow();
      });
    });

    describe('Speed Input', () => {
      it('should change the game speed by speedIncrement', () => {
        const game = new GameLogic(_defaultStage);
        let inputHandled = false;

        // Set up input callback
        game.onInputCallback = () => {
          inputHandled = true;
        };

        // Verify initial speed is 12
        expect(game.state.speed).toBe(12);

        // Test positive increment
        game.input({
          inputType: 'speed',
          speedIncrement: 5,
        });

        // Verify speed increased and callback triggered
        expect(game.state.speed).toBe(17);
        expect(inputHandled).toBe(true);

        // Reset callback flag
        inputHandled = false;

        // Test negative increment
        game.input({
          inputType: 'speed',
          speedIncrement: -3,
        });

        // Verify speed decreased and callback triggered
        expect(game.state.speed).toBe(14);
        expect(inputHandled).toBe(true);
      });
      it('should clamp speed between 1 and 1000', () => {
        const game = new GameLogic(_defaultStage);

        // Test lower bound edge cases
        game.input({
          inputType: 'speed',
          speedIncrement: -1000, // Large negative increment
        });
        expect(game.state.speed).toBe(1);

        game.input({
          inputType: 'speed',
          speedIncrement: -5, // Further negative increment when already at minimum
        });
        expect(game.state.speed).toBe(1);

        // Test increment near lower bound
        game.input({
          inputType: 'speed',
          speedIncrement: 1, // From 1 to 2
        });
        expect(game.state.speed).toBe(2);

        game.input({
          inputType: 'speed',
          speedIncrement: -1, // From 2 back to 1
        });
        expect(game.state.speed).toBe(1);

        // Test upper bound edge cases
        game.input({
          inputType: 'speed',
          speedIncrement: 2000, // Large positive increment
        });
        expect(game.state.speed).toBe(1000);

        game.input({
          inputType: 'speed',
          speedIncrement: 500, // Further positive increment when already at maximum
        });
        expect(game.state.speed).toBe(1000);

        // Test increment near upper bound
        game.input({
          inputType: 'speed',
          speedIncrement: -1, // From 1000 to 999
        });
        expect(game.state.speed).toBe(999);

        game.input({
          inputType: 'speed',
          speedIncrement: 1, // From 999 back to 1000
        });
        expect(game.state.speed).toBe(1000);
      });
      it('should call onInputCallback if input is handled and callback is defined', () => {
        const game = new GameLogic(_defaultStage);
        const mockCallback = vi.fn();
        game.onInputCallback = mockCallback;

        // Test valid speed change - should call callback
        const validInput = {
          inputType: 'speed' as const,
          speedIncrement: 5,
        };
        game.input(validInput);

        // Verify callback was called with correct parameters
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith({
          eventTime: 0,
          gameInput: validInput,
        });

        // Test undefined callback
        game.onInputCallback = undefined;
        const newInput = {
          inputType: 'speed' as const,
          speedIncrement: 3,
        };

        // Verify no error occurs when callback is undefined
        expect(() => game.input(newInput)).not.toThrow();
      });
    });
  });

  describe('advanceTime(duration: number)', () => {
    it('should advance the game state based on duration and speed', () => {
      const game = new GameLogic(_defaultStage);
      const initialPos = game.state.snakes[0].position.clone();

      // At speed 10, each step is 100ms (1000/10)
      game.state.speed = 10;

      // Advance 150ms - should trigger 1 step
      game.advanceTime(150);
      expect(game.state.snakes[0].position.x).toBe(initialPos.x + 1); // Moved right once
      expect(game.state.snakes[0].position.y).toBe(initialPos.y);

      // Advance another 50ms - should trigger another step (accumulated 200ms)
      game.advanceTime(50);
      expect(game.state.snakes[0].position.x).toBe(initialPos.x + 2); // Moved right twice

      // Test different speed
      game.state.speed = 20; // Each step is now 50ms
      initialPos.x = game.state.snakes[0].position.x; // Reset reference point

      // Advance 120ms - should trigger 2 steps at new speed
      game.advanceTime(120);
      expect(game.state.snakes[0].position.x).toBe(initialPos.x + 2); // Moved right twice more

      // Verify total duration tracking
      expect(game.totalDuration).toBe(320); // 150 + 50 + 120
    });
    it('should update snake positions based on their direction and pendingDirs', () => {
      const game = new GameLogic(_defaultStage);
      const snake = game.state.snakes[0];

      // Initial position is (5,5) facing RIGHT
      expect(snake.position).toEqual(new Vector(5, 5));
      expect(snake.dir).toBe(EDirection.RIGHT);

      // Queue UP direction
      game.input({ inputType: 'direction', dir: EDirection.UP, snakeIdx: 0 });

      // At speed 10, each step is 100ms
      game.state.speed = 10;

      // First step - should move RIGHT and update direction
      game.advanceTime(100);
      expect(snake.position).toEqual(new Vector(5, 6));
      expect(snake.dir).toBe(EDirection.UP);

      // Second step - should continue moving UP
      game.advanceTime(100);
      expect(snake.position).toEqual(new Vector(5, 7));
    });

    describe('Snake Movement', () => {
      it('should handle all directions correctly', () => {
        const game = new GameLogic({
          ..._defaultStage,
          snakes: [
            { position: new Vector(10, 10), direction: EDirection.RIGHT },
          ],
        });

        game.state.speed = 10; // Each step is 100ms
        const snake = game.state.snakes[0];

        // Test RIGHT movement
        game.advanceTime(100);
        expect(snake.position).toEqual(new Vector(11, 10));

        // Test UP movement
        game.input({ inputType: 'direction', dir: EDirection.UP, snakeIdx: 0 });
        game.advanceTime(100);
        expect(snake.position).toEqual(new Vector(11, 11));

        // Test LEFT movement
        game.input({
          inputType: 'direction',
          dir: EDirection.LEFT,
          snakeIdx: 0,
        });
        game.advanceTime(100);
        expect(snake.position).toEqual(new Vector(10, 11));

        // Test DOWN movement
        game.input({
          inputType: 'direction',
          dir: EDirection.DOWN,
          snakeIdx: 0,
        });
        game.advanceTime(100);
        expect(snake.position).toEqual(new Vector(10, 10));
      });

      it('should handle edge wrapping through wall holes', () => {
        // Create game with holes in all walls at x=5/y=5
        const game = new GameLogic({
          xTiles: 11,
          yTiles: 11,
          seed: 12345,
          wallHoles: [
            new Vector(5, 0), // Bottom wall,
            new Vector(5, 10), // Top wall,
            new Vector(0, 5), // Left wall,
            new Vector(10, 5), // Right wall
          ],
          blocks: [],
          snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
        });

        // Log initial blocks for debugging
        console.log(
          'Wall blocks:',
          game.state.blocks.map(b => `(${b.x},${b.y})`).join(', ')
        );

        game.state.speed = 10;
        const snake = game.state.snakes[0];
        console.log(
          `Initial position: (${snake.position.x}, ${snake.position.y})`
        );

        const testDirection = (
          dir: EDirection,
          hole: Vector,
          wrapTo: Vector
        ) => {
          // Test vertical wrapping with DOWN
          game.input({
            inputType: 'direction',
            dir,
            snakeIdx: 0,
          });
          game.advanceTime(100); // Allow direction change to take effect
          console.log(
            `After turning ${EDirection[dir]}: (${snake.position.x}, ${snake.position.y}), dir: ${EDirection[snake.dir]}`
          );
          expect(snake.dir).toBe(dir);

          // Move DIR until we hit 0, then wrap to 10
          for (let i = 0; i < 4; i++) {
            game.advanceTime(100);
            console.log(
              `${EDirection[dir]} step ${i + 1}: (${snake.position.x}, ${snake.position.y})`
            );
          }
          expect(snake.position).toEqual(hole);

          // One more step to wrap
          game.advanceTime(100);
          expect(snake.position).toEqual(wrapTo);
          console.log(
            `After ${EDirection[dir]} wrap: (${snake.position.x}, ${snake.position.y})`
          );

          game.advanceTime(500);
          console.log(
            `Back to center wrap: (${snake.position.x}, ${snake.position.y})`
          );
          expect(snake.position).toEqual(new Vector(5, 5));
        };

        testDirection(EDirection.RIGHT, new Vector(10, 5), new Vector(0, 5));
        testDirection(EDirection.DOWN, new Vector(5, 0), new Vector(5, 10));
        testDirection(EDirection.LEFT, new Vector(0, 5), new Vector(10, 5));
        testDirection(EDirection.UP, new Vector(5, 10), new Vector(5, 0));
      });
    });

    describe('Collisions', () => {
      it('should detect wall collisions and set gameOver', () => {
        const game = new GameLogic({
          ..._defaultStage,
          wallHoles: [], // No wall holes
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
        snake.length = 8; // Make snake longer to ensure body is long enough for collision

        // Create a snake that turns back on itself in a square pattern

        // Move right to build up snake body
        for (let i = 0; i < 3; i++) {
          game.advanceTime(100);
          console.log(
            `Snake body length: ${snake.tiles.length}, Position: ${snake.position.x},${snake.position.y}`
          );
        }

        // Turn down
        game.input({
          inputType: 'direction',
          dir: EDirection.DOWN,
          snakeIdx: 0,
        });
        game.advanceTime(100);
        console.log(`After down turn: ${snake.position.x},${snake.position.y}`);

        // Turn left
        game.input({
          inputType: 'direction',
          dir: EDirection.LEFT,
          snakeIdx: 0,
        });
        game.advanceTime(100);
        console.log(`After left turn: ${snake.position.x},${snake.position.y}`);

        // Turn up to collide with own body
        game.input({ inputType: 'direction', dir: EDirection.UP, snakeIdx: 0 });
        game.advanceTime(100);
        console.log(`Final position: ${snake.position.x},${snake.position.y}`);

        expect(game.state.gameOver).toBe(true);
        game.input({ inputType: 'direction', dir: EDirection.UP, snakeIdx: 0 });
        game.advanceTime(100); // Move up
        game.input({
          inputType: 'direction',
          dir: EDirection.LEFT,
          snakeIdx: 0,
        });
        game.advanceTime(100); // Move left
        game.input({
          inputType: 'direction',
          dir: EDirection.DOWN,
          snakeIdx: 0,
        });
        game.advanceTime(100); // Move down and collide

        expect(game.state.gameOver).toBe(true);
      });

      it('should stop further movement after collision', () => {
        const game = new GameLogic({
          ..._defaultStage,
          wallHoles: [], // No wall holes
          snakes: [{ position: new Vector(1, 1), direction: EDirection.LEFT }],
        });

        game.state.speed = 10;
        const initialPos = game.state.snakes[0].position.clone();

        // Trigger wall collision
        game.advanceTime(100);
        expect(game.state.gameOver).toBe(true);

        // Try to move after collision
        game.advanceTime(100);
        expect(game.state.snakes[0].position).toEqual(initialPos);
      });
    });
    describe('Apple Interactions', () => {
      it('should increase snake length when eating apple', () => {
        const game = new GameLogic(_defaultStage);
        const snake = game.state.snakes[0];
        const initialLength = snake.length;

        // Force apple position in snake's path
        game.state.applePos = new Vector(6, 5);
        game.state.speed = 10;

        // Move to apple
        game.advanceTime(100);

        expect(snake.length).toBe(initialLength + 2);
        expect(snake.tiles.length).toBeLessThanOrEqual(snake.length);
      });

      it('should remove apple when eaten and generate new one', () => {
        const game = new GameLogic(_defaultStage);

        // Force apple position
        game.state.applePos = new Vector(6, 5);
        game.state.speed = 10;

        // Move to apple
        game.advanceTime(100);

        // Apple should be replaced with a new one
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

        // Force apple generation
        game.state.applePos = null;
        game.advanceTime(100);

        const apple = game.state.applePos!;

        // Apple should be within bounds
        expect(apple.x).toBeGreaterThanOrEqual(0);
        expect(apple.x).toBeLessThan(10);
        expect(apple.y).toBeGreaterThanOrEqual(0);
        expect(apple.y).toBeLessThan(10);

        // Apple should not be on a wall
        expect(game.state.blocks.some(b => b.equals(apple))).toBe(false);

        // Apple should not be on snake
        expect(game.state.snakes[0].tiles.some(t => t.equals(apple))).toBe(
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

        // Generate first apple for both games
        game1.state.applePos = null;
        game2.state.applePos = null;
        game1.advanceTime(100);
        game2.advanceTime(100);

        expect(game1.state.applePos).toEqual(game2.state.applePos);

        // Eat apples and generate new ones
        game1.state.applePos = null;
        game2.state.applePos = null;
        game1.advanceTime(100);
        game2.advanceTime(100);

        expect(game1.state.applePos).toEqual(game2.state.applePos);
      });
    });
  });

  // Private method tests
  describe('Private Methods', () => {
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
        game.state.applePos = new Vector(3, 3);
        game.state.snakes[0].length = 8;
        game.state.snakes[0].tiles = [new Vector(4, 4), new Vector(3, 4)];
        game.advanceTime(1000); // This will modify totalDuration

        // Get private method access
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for testing private method
        const resetState = (game as any)['_resetState'].bind(game);
        resetState();

        // Verify reset state
        expect(game.state.speed).toBe(12); // Default speed
        expect(game.state.applePos).toBeNull();
        expect(game.state.snakes[0].length).toBe(4); // Default length
        expect(game.state.snakes[0].tiles).toEqual([]);
        expect(game.totalDuration).toBe(0);

        // Test PRNG reset by generating apples
        game.advanceTime(100);
        const firstApplePos = game.state.applePos?.clone();

        resetState();
        game.advanceTime(100);

        // Apple positions should match after reset due to same PRNG sequence
        expect(game.state.applePos).toEqual(firstApplePos);
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
          game.state.applePos = null;
          actionNewApple();

          const applePos = game.state.applePos;
          expect(applePos).not.toBeNull();

          // Verify apple is within bounds
          // We know applePos is not null here because we just generated it
          const apple = game.state.applePos!;
          expect(apple.x).toBeGreaterThanOrEqual(0);
          expect(apple.x).toBeLessThan(stage.xTiles);
          expect(apple.y).toBeGreaterThanOrEqual(0);
          expect(apple.y).toBeLessThan(stage.yTiles);

          // Verify apple is not on blocks
          expect(
            stage.blocks.some(block => block.equals(applePos!))
          ).toBeFalsy();

          // Verify apple is not on snake
          expect(
            game.state.snakes[0].tiles.some(tile => tile.equals(applePos!))
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
          game1.state.applePos = null;
          game2.state.applePos = null;

          actionNewApple1();
          actionNewApple2();

          applePositions1.push(game1.state.applePos!.clone());
          applePositions2.push(game2.state.applePos!.clone());
        }

        // Verify apple sequences match
        expect(applePositions1).toEqual(applePositions2);
      });
    });
  });
});
