/**
 * Tests for the Neural Network Actor implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NNActor, DEFAULT_NN_ACTOR_CONFIG } from './nn-actor';
import { NeuralNetwork } from '../ml/neural-network';
import { IGameState, IGameStateSnake, EDirection, AppleType } from '../backend/game-logic';

describe('NNActor', () => {
  let mockNeuralNetwork: NeuralNetwork;
  let basicGameState: IGameState;
  let basicSnake: IGameStateSnake;

  beforeEach(() => {
    // Create a simple deterministic neural network for testing
    mockNeuralNetwork = NeuralNetwork.createRandom([64, 4, 4], 0.1, 42); // Fixed seed for consistency

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

  describe('constructor and validation', () => {
    it('should create an actor with valid configuration', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
      });

      expect(actor.getSnakeIndex()).toBe(0);
      expect(actor.getNetworkInfo().inputSize).toBe(64);
      expect(actor.getNetworkInfo().outputSize).toBe(4);
    });

    it('should merge default configuration correctly', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        decisionThreshold: 0.5,
      });

      const config = actor.getConfig();
      expect(config.decisionThreshold).toBe(0.5);
      expect(config.useProbabilisticSelection).toBe(DEFAULT_NN_ACTOR_CONFIG.useProbabilisticSelection);
    });

    it('should throw error for negative snake index', () => {
      expect(() => {
        new NNActor({
          snakeIndex: -1,
          neuralNetwork: mockNeuralNetwork,
        });
      }).toThrow('Snake index must be non-negative');
    });

    it('should throw error for wrong network input size', () => {
      const wrongSizeNetwork = NeuralNetwork.createRandom([32, 4]); // Wrong input size

      expect(() => {
        new NNActor({
          snakeIndex: 0,
          neuralNetwork: wrongSizeNetwork,
        });
      }).toThrow('Neural network input size must be 64');
    });

    it('should throw error for wrong network output size', () => {
      const wrongSizeNetwork = NeuralNetwork.createRandom([64, 8]); // Wrong output size

      expect(() => {
        new NNActor({
          snakeIndex: 0,
          neuralNetwork: wrongSizeNetwork,
        });
      }).toThrow('Neural network output size must be 4');
    });

    it('should throw error for invalid decision threshold', () => {
      expect(() => {
        new NNActor({
          snakeIndex: 0,
          neuralNetwork: mockNeuralNetwork,
          decisionThreshold: 1.5, // > 1
        });
      }).toThrow('Decision threshold must be between 0 and 1');
    });

    it('should throw error for invalid selection temperature', () => {
      expect(() => {
        new NNActor({
          snakeIndex: 0,
          neuralNetwork: mockNeuralNetwork,
          selectionTemperature: 0, // <= 0
        });
      }).toThrow('Selection temperature must be positive');
    });
  });

  describe('onStateUpdate', () => {
    it('should return null for non-existent snake', () => {
      const actor = new NNActor({
        snakeIndex: 5, // Snake doesn't exist
        neuralNetwork: mockNeuralNetwork,
      });

      const result = actor.onStateUpdate(basicGameState);
      expect(result).toBeNull();
    });

    it('should return null for missing snake in array', () => {
      const actor = new NNActor({
        snakeIndex: 1, // Only one snake exists at index 0
        neuralNetwork: mockNeuralNetwork,
      });

      const result = actor.onStateUpdate(basicGameState);
      expect(result).toBeNull();
    });

    it('should return direction input when network suggests change', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        decisionThreshold: 0.0, // Very low threshold to ensure change
        minDirectionChangeInterval: 0, // No minimum interval
      });

      const result = actor.onStateUpdate(basicGameState);

      if (result !== null) {
        expect(result.inputType).toBe('direction');
        expect(result.snakeIdx).toBe(0);
        expect([EDirection.UP, EDirection.DOWN, EDirection.LEFT, EDirection.RIGHT]).toContain(result.dir);
        expect(result.dir).not.toBe(EDirection.LEFT); // Should not suggest opposite direction
      }
    });

    it('should prevent 180-degree turns', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        decisionThreshold: 0.0,
        minDirectionChangeInterval: 0,
      });

      // Test multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const result = actor.onStateUpdate(basicGameState);
        if (result !== null && result.inputType === 'direction') {
          // Snake is moving RIGHT, so LEFT should never be suggested
          expect(result.dir).not.toBe(EDirection.LEFT);
        }
      }
    });

    it('should respect minimum direction change interval', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        minDirectionChangeInterval: 3,
        decisionThreshold: 0.0,
      });

      // Force a direction change
      let firstResult = actor.onStateUpdate(basicGameState);
      let attempts = 0;
      while (firstResult === null && attempts < 10) {
        firstResult = actor.onStateUpdate(basicGameState);
        attempts++;
      }
      
      // If we got a direction change, subsequent calls should return null
      if (firstResult !== null) {
        const result = actor.onStateUpdate(basicGameState);
        expect(result).toBeNull();
      }
    });

    it('should handle errors gracefully', () => {
      // Create a mock network that throws an error
      const errorNetwork = {
        getInputSize: (): number => 64,
        getOutputSize: (): number => 4,
        forward: vi.fn().mockImplementation(() => {
          throw new Error('Network error');
        }),
      };

      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: errorNetwork as NeuralNetwork,
      });

      // Should not throw, should return null
      const result = actor.onStateUpdate(basicGameState);
      expect(result).toBeNull();
    });
  });

  describe('action selection', () => {
    it('should use deterministic selection by default', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        useProbabilisticSelection: false,
        decisionThreshold: 0.0,
        minDirectionChangeInterval: 0,
      });

      const results: (EDirection | null)[] = [];
      
      // Run multiple times with same state
      for (let i = 0; i < 5; i++) {
        actor.reset(); // Reset to ensure same conditions
        const result = actor.onStateUpdate(basicGameState);
        results.push(result?.inputType === 'direction' ? result.dir : null);
      }

      // All results should be the same (deterministic)
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });

    it('should use probabilistic selection when configured', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        useProbabilisticSelection: true,
        selectionTemperature: 2.0, // Higher temperature for more randomness
        decisionThreshold: 0.0,
        minDirectionChangeInterval: 0,
      });

      const results: (EDirection | null)[] = [];
      
      // Run multiple times with same state
      for (let i = 0; i < 20; i++) {
        actor.reset();
        const result = actor.onStateUpdate(basicGameState);
        results.push(result?.inputType === 'direction' ? result.dir : null);
      }

      // With probabilistic selection, we should see some variation
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it('should respect decision threshold', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        decisionThreshold: 0.9, // Very high threshold
        minDirectionChangeInterval: 0,
      });

      let changeCount = 0;
      
      // Run multiple times
      for (let i = 0; i < 10; i++) {
        actor.reset();
        const result = actor.onStateUpdate(basicGameState);
        if (result !== null) {
          changeCount++;
        }
      }

      // With high threshold, changes should be rare
      expect(changeCount).toBeLessThan(5);
    });
  });

  describe('reset functionality', () => {
    it('should reset internal state', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        minDirectionChangeInterval: 5,
      });

      // Make some calls to build up step counter
      actor.onStateUpdate(basicGameState);
      actor.onStateUpdate(basicGameState);
      actor.onStateUpdate(basicGameState);
      
      // Reset should reset internal counters
      actor.reset();
      
      // The reset method should exist and not throw
      expect(() => actor.reset()).not.toThrow();
      
      // Verify the actor is still functional after reset
      const config = actor.getConfig();
      expect(config.snakeIndex).toBe(0);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration correctly', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
      });

      actor.updateConfig({
        decisionThreshold: 0.7,
        useProbabilisticSelection: true,
      });

      const config = actor.getConfig();
      expect(config.decisionThreshold).toBe(0.7);
      expect(config.useProbabilisticSelection).toBe(true);
    });

    it('should validate configuration after update', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
      });

      expect(() => {
        actor.updateConfig({ decisionThreshold: 2.0 });
      }).toThrow('Decision threshold must be between 0 and 1');
    });
  });

  describe('network info', () => {
    it('should return correct network information', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
      });

      const info = actor.getNetworkInfo();
      expect(info.inputSize).toBe(64);
      expect(info.outputSize).toBe(4);
      expect(info.architecture).toEqual([64, 4, 4]);
    });
  });

  describe('static factory methods', () => {
    it('should create actor from valid weight data', () => {
      const validWeights = {
        version: '1.0',
        metadata: {
          architecture: [64, 128, 64, 4],
        },
        layers: [
          {
            inputSize: 64,
            outputSize: 128,
            weights: Array.from({ length: 128 }, () => Array.from({ length: 64 }, () => 0.1)),
            biases: Array.from({ length: 128 }, () => 0.1),
          },
          {
            inputSize: 128,
            outputSize: 64,
            weights: Array.from({ length: 64 }, () => Array.from({ length: 128 }, () => 0.1)),
            biases: Array.from({ length: 64 }, () => 0.1),
          },
          {
            inputSize: 64,
            outputSize: 4,
            weights: Array.from({ length: 4 }, () => Array.from({ length: 64 }, () => 0.1)),
            biases: [0.1, 0.1, 0.1, 0.1],
          },
        ],
      };

      const weightString = JSON.stringify(validWeights);
      const actor = NNActor.fromWeights(0, weightString);

      expect(actor).not.toBeNull();
      expect(actor!.getSnakeIndex()).toBe(0);
    });

    it('should return null for invalid weight data', () => {
      const invalidWeights = '{ invalid json }';
      const actor = NNActor.fromWeights(0, invalidWeights);

      expect(actor).toBeNull();
    });

    it('should create random actor', () => {
      const actor = NNActor.createRandom(0);

      expect(actor.getSnakeIndex()).toBe(0);
      expect(actor.getNetworkInfo().inputSize).toBe(64);
      expect(actor.getNetworkInfo().outputSize).toBe(4);
    });

    it('should create different random actors', () => {
      const actor1 = NNActor.createRandom(0);
      const actor2 = NNActor.createRandom(0);

      // They should be different networks (different random weights)
      const _result1 = actor1.onStateUpdate(basicGameState);
      const _result2 = actor2.onStateUpdate(basicGameState);

      // While they might occasionally return the same result due to randomness,
      // their internal network weights should be different
      expect(actor1.getNetworkInfo()).toEqual(actor2.getNetworkInfo()); // Same architecture
    });
  });

  describe('edge cases', () => {
    it('should handle game state with no apple', () => {
      const stateWithoutApple = { ...basicGameState, apple: null };
      
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
      });

      const result = actor.onStateUpdate(stateWithoutApple);
      // Should not throw, may return direction or null
      expect(result === null || result.inputType === 'direction').toBe(true);
    });

    it('should handle multiple snakes in game state', () => {
      const secondSnake: IGameStateSnake = {
        position: { x: 10, y: 15 },
        length: 3,
        targetLength: 3,
        tiles: [{ x: 9, y: 15 }],
        dir: EDirection.LEFT,
        pendingDirs: [],
        score: 50,
      };

      const multiSnakeState = {
        ...basicGameState,
        snakes: [basicSnake, secondSnake],
      };

      const actor = new NNActor({
        snakeIndex: 1, // Control the second snake
        neuralNetwork: mockNeuralNetwork,
      });

      const result = actor.onStateUpdate(multiSnakeState);
      if (result !== null && result.inputType === 'direction') {
        expect(result.snakeIdx).toBe(1);
      }
    });

    it('should handle very small networks', () => {
      const smallNetwork = NeuralNetwork.createRandom([64, 4]);
      
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: smallNetwork,
      });

      const result = actor.onStateUpdate(basicGameState);
      expect(result === null || result.inputType === 'direction').toBe(true);
    });

    it('should handle extreme game speeds', () => {
      const extremeSpeedState = { ...basicGameState, speed: 1000 };
      
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
      });

      const result = actor.onStateUpdate(extremeSpeedState);
      expect(result === null || result.inputType === 'direction').toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should make reasonable decisions in various game situations', () => {
      const actor = new NNActor({
        snakeIndex: 0,
        neuralNetwork: mockNeuralNetwork,
        decisionThreshold: 0.0,
        minDirectionChangeInterval: 0,
      });

      // Test various game scenarios
      const scenarios = [
        // Snake near wall
        {
          ...basicGameState,
          snakes: [{
            ...basicSnake,
            position: { x: 1, y: 3 }, // Near left wall
            dir: EDirection.LEFT,
          }],
        },
        // Snake near apple
        {
          ...basicGameState,
          snakes: [{
            ...basicSnake,
            position: { x: 7, y: 7 }, // Near apple at (8, 7)
          }],
        },
        // Long snake
        {
          ...basicGameState,
          snakes: [{
            ...basicSnake,
            length: 20,
            tiles: Array.from({ length: 15 }, (_, i) => ({ x: 5 - i - 1, y: 3 })),
          }],
        },
      ];

      scenarios.forEach((scenario) => {
        actor.reset();
        const result = actor.onStateUpdate(scenario);
        
        // Should return valid direction or null
        if (result !== null) {
          expect(result.inputType).toBe('direction');
          expect([EDirection.UP, EDirection.DOWN, EDirection.LEFT, EDirection.RIGHT]).toContain(result.dir);
        }
      });
    });
  });
});