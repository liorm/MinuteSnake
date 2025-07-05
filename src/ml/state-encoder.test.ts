/**
 * Tests for the state encoder implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateEncoder, DEFAULT_ENCODER_CONFIG } from './state-encoder';
import { IGameState, IGameStateSnake, AppleType, EDirection } from '../backend/game-logic';

describe('StateEncoder', () => {
  let encoder: StateEncoder;
  let basicGameState: IGameState;
  let basicSnake: IGameStateSnake;

  beforeEach(() => {
    encoder = new StateEncoder();

    basicSnake = {
      position: { x: 5, y: 3 },
      length: 4,
      targetLength: 6,
      tiles: [
        { x: 4, y: 3 },
        { x: 3, y: 3 },
        { x: 2, y: 3 },
      ],
      dir: EDirection.RIGHT,
      pendingDirs: [],
      score: 150,
    };

    basicGameState = {
      blocks: [{ x: 10, y: 10 }],
      speed: 5,
      apple: {
        position: { x: 8, y: 7 },
        type: AppleType.NORMAL,
      },
      snakes: [basicSnake],
      gameOver: false,
    };
  });

  describe('basic encoding', () => {
    it('should encode game state to exactly 64 values', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      expect(encoded).toHaveLength(64);
    });

    it('should normalize all values to [0, 1] range', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      encoded.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    it('should throw error for invalid snake index', () => {
      expect(() => {
        encoder.encode(basicGameState, 5, 1000); // Snake index 5 doesn't exist
      }).toThrow('Snake index 5 out of bounds');
    });

    it('should be deterministic for same inputs', () => {
      const encoded1 = encoder.encode(basicGameState, 0, 1000);
      const encoded2 = encoder.encode(basicGameState, 0, 1000);
      
      expect(encoded1).toEqual(encoded2);
    });
  });

  describe('snake state encoding', () => {
    it('should encode snake head position correctly', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Snake head at (5, 3) with default max field size 50x50
      const expectedX = 5 / DEFAULT_ENCODER_CONFIG.maxFieldWidth;
      const expectedY = 3 / DEFAULT_ENCODER_CONFIG.maxFieldHeight;
      
      expect(encoded[0]).toBeCloseTo(expectedX, 5);
      expect(encoded[1]).toBeCloseTo(expectedY, 5);
    });

    it('should encode snake length and target length', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      const expectedLength = (4 - 1) / (DEFAULT_ENCODER_CONFIG.maxSnakeLength - 1);
      const expectedTargetLength = (6 - 1) / (DEFAULT_ENCODER_CONFIG.maxSnakeLength - 1);
      
      expect(encoded[2]).toBeCloseTo(expectedLength, 5);
      expect(encoded[3]).toBeCloseTo(expectedTargetLength, 5);
    });

    it('should encode snake body positions relative to head', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Body positions start at index 4, with 2 values per segment (x, y)
      // First body segment at (4, 3), head at (5, 3)
      const relativeX = (4 - 5) / DEFAULT_ENCODER_CONFIG.maxFieldWidth; // -1/50 normalized to [0,1]
      const relativeY = (3 - 3) / DEFAULT_ENCODER_CONFIG.maxFieldHeight; // 0/50 normalized to [0,1]
      
      expect(encoded[4]).toBeCloseTo((relativeX + 1) / 2, 5); // Normalize [-1,1] to [0,1]
      expect(encoded[5]).toBeCloseTo((relativeY + 1) / 2, 5);
    });

    it('should handle snakes with no body segments', () => {
      const snakeWithoutBody = { ...basicSnake, tiles: [] };
      const gameState = { ...basicGameState, snakes: [snakeWithoutBody] };
      
      const encoded = encoder.encode(gameState, 0, 1000);
      
      // Body position values should be padded with zeros
      for (let i = 4; i < 16; i++) { // 12 body position values
        expect(encoded[i]).toBe(0);
      }
    });
  });

  describe('apple state encoding', () => {
    it('should encode apple position and type', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Apple at (8, 7) with normal type
      const expectedX = 8 / DEFAULT_ENCODER_CONFIG.maxFieldWidth;
      const expectedY = 7 / DEFAULT_ENCODER_CONFIG.maxFieldHeight;
      
      expect(encoded[16]).toBeCloseTo(expectedX, 5); // Apple X
      expect(encoded[17]).toBeCloseTo(expectedY, 5); // Apple Y
      expect(encoded[18]).toBe(0); // Normal apple type = 0
    });

    it('should encode diet apple type correctly', () => {
      const gameStateWithDietApple = {
        ...basicGameState,
        apple: {
          position: { x: 8, y: 7 },
          type: AppleType.DIET,
        },
      };
      
      const encoded = encoder.encode(gameStateWithDietApple, 0, 1000);
      expect(encoded[18]).toBe(1); // Diet apple type = 1
    });

    it('should handle missing apple', () => {
      const gameStateWithoutApple = { ...basicGameState, apple: null };
      const encoded = encoder.encode(gameStateWithoutApple, 0, 1000);
      
      // Apple values should be zeros
      expect(encoded[16]).toBe(0); // Apple X
      expect(encoded[17]).toBe(0); // Apple Y
      expect(encoded[18]).toBe(0); // Apple type
      expect(encoded[19]).toBe(0); // Apple distance
    });

    it('should calculate apple distance correctly', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Snake head at (5, 3), apple at (8, 7)
      const actualDistance = Math.sqrt((8 - 5) ** 2 + (7 - 3) ** 2);
      const maxDistance = Math.sqrt(
        DEFAULT_ENCODER_CONFIG.maxFieldWidth ** 2 + 
        DEFAULT_ENCODER_CONFIG.maxFieldHeight ** 2
      );
      const expectedNormalizedDistance = actualDistance / maxDistance;
      
      expect(encoded[19]).toBeCloseTo(expectedNormalizedDistance, 5);
    });
  });

  describe('environment state encoding', () => {
    it('should encode wall distances correctly', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Snake head at (5, 3)
      const maxDistance = Math.max(DEFAULT_ENCODER_CONFIG.maxFieldWidth, DEFAULT_ENCODER_CONFIG.maxFieldHeight);
      
      // Wall distances start at index 20
      expect(encoded[20]).toBeCloseTo(3 / maxDistance, 5); // Distance to top wall
      expect(encoded[21]).toBeCloseTo((DEFAULT_ENCODER_CONFIG.maxFieldHeight - 3) / maxDistance, 5); // Distance to bottom wall
      expect(encoded[22]).toBeCloseTo(5 / maxDistance, 5); // Distance to left wall
      expect(encoded[23]).toBeCloseTo((DEFAULT_ENCODER_CONFIG.maxFieldWidth - 5) / maxDistance, 5); // Distance to right wall
    });

    it('should detect collision risks', () => {
      // Create a game state where the snake is about to hit a wall
      const snakeNearWall = {
        ...basicSnake,
        position: { x: 0, y: 3 }, // At left edge
      };
      const gameState = { ...basicGameState, snakes: [snakeNearWall] };
      
      const encoded = encoder.encode(gameState, 0, 1000);
      
      // Collision risks start at index 24 (8 directions)
      // West direction (index 30) should show high collision risk
      expect(encoded[30]).toBe(1); // High collision risk to the west
    });

    it('should calculate safety scores', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Safety scores start at index 32 (8 directions)
      // All safety scores should be between 0 and 1
      for (let i = 32; i < 40; i++) {
        expect(encoded[i]).toBeGreaterThanOrEqual(0);
        expect(encoded[i]).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('game state encoding', () => {
    it('should encode current direction as one-hot', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Direction one-hot starts at index 55
      // Snake direction is RIGHT (EDirection.RIGHT = 2)
      expect(encoded[55]).toBe(0); // UP
      expect(encoded[56]).toBe(1); // RIGHT
      expect(encoded[57]).toBe(0); // DOWN
      expect(encoded[58]).toBe(0); // LEFT
    });

    it('should encode game speed and time', () => {
      const gameTime = 30000; // 30 seconds
      const encoded = encoder.encode(basicGameState, 0, gameTime);
      
      const expectedSpeed = 5 / DEFAULT_ENCODER_CONFIG.maxGameSpeed;
      const expectedTime = gameTime / DEFAULT_ENCODER_CONFIG.maxGameTime;
      
      expect(encoded[52]).toBeCloseTo(expectedSpeed, 5); // Game speed
      expect(encoded[53]).toBeCloseTo(expectedTime, 5); // Game time
    });

    it('should encode snake score', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      const expectedScore = 150 / DEFAULT_ENCODER_CONFIG.maxScore;
      expect(encoded[54]).toBeCloseTo(expectedScore, 5);
    });

    it('should have reserved values as zeros', () => {
      const encoded = encoder.encode(basicGameState, 0, 1000);
      
      // Reserved values at indices 59-63 (5 values)
      for (let i = 59; i < 64; i++) {
        expect(encoded[i]).toBe(0);
      }
    });
  });

  describe('multi-snake scenarios', () => {
    it('should handle multiple snakes correctly', () => {
      const secondSnake: IGameStateSnake = {
        position: { x: 10, y: 15 },
        length: 3,
        targetLength: 3,
        tiles: [{ x: 9, y: 15 }, { x: 8, y: 15 }],
        dir: EDirection.LEFT,
        pendingDirs: [],
        score: 50,
      };

      const multiSnakeGameState = {
        ...basicGameState,
        snakes: [basicSnake, secondSnake],
      };

      const encoded1 = encoder.encode(multiSnakeGameState, 0, 1000);
      const encoded2 = encoder.encode(multiSnakeGameState, 1, 1000);

      expect(encoded1).toHaveLength(64);
      expect(encoded2).toHaveLength(64);
      expect(encoded1).not.toEqual(encoded2); // Different perspectives
    });

    it('should encode other snake distances', () => {
      const secondSnake: IGameStateSnake = {
        position: { x: 10, y: 8 },
        length: 3,
        targetLength: 3,
        tiles: [{ x: 9, y: 8 }],
        dir: EDirection.LEFT,
        pendingDirs: [],
        score: 50,
      };

      const multiSnakeGameState = {
        ...basicGameState,
        snakes: [basicSnake, secondSnake],
      };

      const encoded = encoder.encode(multiSnakeGameState, 0, 1000);
      
      // Other snake distances start at index 40
      const headDistance = Math.sqrt((10 - 5) ** 2 + (8 - 3) ** 2);
      const maxDistance = Math.sqrt(
        DEFAULT_ENCODER_CONFIG.maxFieldWidth ** 2 + 
        DEFAULT_ENCODER_CONFIG.maxFieldHeight ** 2
      );
      
      expect(encoded[40]).toBeCloseTo(headDistance / maxDistance, 5);
      expect(encoded[41]).toBeGreaterThan(0); // Distance to other snake's body
    });
  });

  describe('configuration', () => {
    it('should use custom configuration correctly', () => {
      const customConfig = {
        ...DEFAULT_ENCODER_CONFIG,
        maxFieldWidth: 20,
        maxFieldHeight: 20,
      };
      
      const customEncoder = new StateEncoder(customConfig);
      const encoded = customEncoder.encode(basicGameState, 0, 1000);
      
      // Snake head at (5, 3) with custom field size 20x20
      const expectedX = 5 / 20;
      const expectedY = 3 / 20;
      
      expect(encoded[0]).toBeCloseTo(expectedX, 5);
      expect(encoded[1]).toBeCloseTo(expectedY, 5);
    });

    it('should update configuration', () => {
      encoder.updateConfig({ maxFieldWidth: 30 });
      const config = encoder.getConfig();
      
      expect(config.maxFieldWidth).toBe(30);
      expect(config.maxFieldHeight).toBe(DEFAULT_ENCODER_CONFIG.maxFieldHeight); // Unchanged
    });
  });

  describe('edge cases', () => {
    it('should handle very long snakes', () => {
      const longSnake = {
        ...basicSnake,
        length: 50,
        tiles: Array.from({ length: 20 }, (_, i) => ({ x: 5 - i - 1, y: 3 })),
      };
      const gameState = { ...basicGameState, snakes: [longSnake] };
      
      const encoded = encoder.encode(gameState, 0, 1000);
      expect(encoded).toHaveLength(64);
      
      // Should handle more body segments than maxBodySegments
      encoded.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should handle snake at field boundaries', () => {
      const boundarySnake = {
        ...basicSnake,
        position: { x: 0, y: 0 }, // Top-left corner
      };
      const gameState = { ...basicGameState, snakes: [boundarySnake] };
      
      const encoded = encoder.encode(gameState, 0, 1000);
      expect(encoded[0]).toBe(0); // Normalized X position
      expect(encoded[1]).toBe(0); // Normalized Y position
    });

    it('should handle maximum values without overflow', () => {
      const maxSnake = {
        ...basicSnake,
        position: { x: DEFAULT_ENCODER_CONFIG.maxFieldWidth - 1, y: DEFAULT_ENCODER_CONFIG.maxFieldHeight - 1 },
        length: DEFAULT_ENCODER_CONFIG.maxSnakeLength,
        targetLength: DEFAULT_ENCODER_CONFIG.maxSnakeLength,
        score: DEFAULT_ENCODER_CONFIG.maxScore,
      };
      
      const maxGameState = {
        ...basicGameState,
        snakes: [maxSnake],
        speed: DEFAULT_ENCODER_CONFIG.maxGameSpeed,
      };
      
      const encoded = encoder.encode(maxGameState, 0, DEFAULT_ENCODER_CONFIG.maxGameTime);
      
      encoded.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should handle zero and negative values gracefully', () => {
      const gameTime = -1000; // Negative time
      const encoded = encoder.encode(basicGameState, 0, gameTime);
      
      expect(encoded[53]).toBe(0); // Time should be clamped to 0
    });
  });
});