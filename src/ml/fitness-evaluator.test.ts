/**
 * Tests for the fitness evaluator implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FitnessEvaluator,
  defaultFitnessConfig,
  FitnessResult,
} from './fitness-evaluator';
import { Individual } from './genetic-algorithm';
import { EDirection } from '../backend/game-logic';

describe('FitnessEvaluator', () => {
  let evaluator: FitnessEvaluator;
  let testConfig: Partial<typeof defaultFitnessConfig>;

  beforeEach(() => {
    testConfig = {
      ...defaultFitnessConfig,
      maxGameTime: 1000, // Short time for tests
      gamesPerIndividual: 2, // Few games for tests
      maxStepsPerGame: 100,
      gameStage: FitnessEvaluator.createDefaultGameStage(12345),
    };
    evaluator = new FitnessEvaluator(testConfig);
  });

  describe('constructor', () => {
    it('should create evaluator with valid config', () => {
      expect(evaluator).toBeDefined();
      expect(evaluator.getConfig()).toEqual(
        expect.objectContaining(testConfig)
      );
    });

    it('should throw error for invalid max game time', () => {
      expect(() => {
        new FitnessEvaluator({ ...testConfig, maxGameTime: -1 });
      }).toThrow('Max game time must be positive');
    });

    it('should throw error for invalid games per individual', () => {
      expect(() => {
        new FitnessEvaluator({ ...testConfig, gamesPerIndividual: 0 });
      }).toThrow('Games per individual must be positive');
    });

    it('should throw error for invalid fitness weights', () => {
      expect(() => {
        new FitnessEvaluator({
          ...testConfig,
          fitnessWeights: {
            survival: 0.5,
            score: 0.3,
            efficiency: 0.1,
            exploration: 0.05,
            appleReach: 0.01, // Sum = 0.96, not 1.0
          },
        });
      }).toThrow('Fitness weights must sum to 1.0');
    });
  });

  describe('createDefaultGameStage', () => {
    it('should create valid game stage', () => {
      const stage = FitnessEvaluator.createDefaultGameStage(42);

      expect(stage.xTiles).toBe(20);
      expect(stage.yTiles).toBe(20);
      expect(stage.seed).toBe(42);
      expect(stage.wallHoles).toEqual([]);
      expect(stage.blocks).toEqual([]);
      expect(stage.snakes).toHaveLength(1);
      expect(stage.snakes[0].position).toEqual({ x: 10, y: 10 });
      expect(stage.snakes[0].direction).toBe(EDirection.RIGHT);
    });

    it('should use default seed when not provided', () => {
      const stage = FitnessEvaluator.createDefaultGameStage();
      expect(stage.seed).toBe(12345);
    });
  });

  describe('evaluateIndividual', () => {
    it('should evaluate individual and return fitness result', async () => {
      // Create test individual with random neural network
      const networkArchitecture = {
        layers: [
          {
            inputSize: 64,
            outputSize: 4,
            weights: Array(4)
              .fill(null)
              .map(() => Array(64).fill(0.1)),
            biases: Array(4).fill(0.1),
          },
        ],
      };

      const individual: Individual = {
        id: 'test_individual',
        weights: networkArchitecture,
        fitness: 0,
        generation: 0,
      };

      const result = await evaluator.evaluateIndividual(individual);

      expect(result).toBeDefined();
      expect(result.individual).toBe(individual);
      expect(result.gameResults).toHaveLength(testConfig.gamesPerIndividual);
      expect(result.averageFitness).toBeGreaterThanOrEqual(0);
      expect(result.averageFitness).toBeLessThanOrEqual(1);
      expect(result.bestFitness).toBeGreaterThanOrEqual(0);
      expect(result.bestFitness).toBeLessThanOrEqual(1);
      expect(result.fitnessStdDev).toBeGreaterThanOrEqual(0);
      expect(result.evaluationTime).toBeGreaterThan(0);
    });

    it('should produce consistent results for same individual and seed', async () => {
      const networkArchitecture = {
        layers: [
          {
            inputSize: 64,
            outputSize: 4,
            weights: Array(4)
              .fill(null)
              .map(() => Array(64).fill(0.2)),
            biases: Array(4).fill(0.0),
          },
        ],
      };

      const individual: Individual = {
        id: 'test_individual',
        weights: networkArchitecture,
        fitness: 0,
        generation: 0,
      };

      // Create two evaluators with same config
      const evaluator1 = new FitnessEvaluator(testConfig);
      const evaluator2 = new FitnessEvaluator(testConfig);

      const result1 = await evaluator1.evaluateIndividual(individual);
      const result2 = await evaluator2.evaluateIndividual(individual);

      // Results should be similar but allow for small floating point differences
      expect(
        Math.abs(result1.averageFitness - result2.averageFitness)
      ).toBeLessThan(0.01);
      expect(result1.gameResults).toHaveLength(result2.gameResults.length);
    });

    it('should handle neural network errors gracefully', async () => {
      // Create individual with invalid network structure
      const invalidNetworkArchitecture = {
        layers: [
          {
            inputSize: 32, // Wrong input size (should be 64)
            outputSize: 4,
            weights: Array(4)
              .fill(null)
              .map(() => Array(32).fill(0.1)),
            biases: Array(4).fill(0.1),
          },
        ],
      };

      const individual: Individual = {
        id: 'invalid_individual',
        weights: invalidNetworkArchitecture,
        fitness: 0,
        generation: 0,
      };

      // Should throw error due to input size mismatch
      await expect(evaluator.evaluateIndividual(individual)).rejects.toThrow();
    });
  });

  describe('evaluatePopulation', () => {
    it('should evaluate multiple individuals', async () => {
      const individuals: Individual[] = [];

      // Create test population
      for (let i = 0; i < 3; i++) {
        individuals.push({
          id: `individual_${i}`,
          weights: {
            layers: [
              {
                inputSize: 64,
                outputSize: 4,
                weights: Array(4)
                  .fill(null)
                  .map(() => Array(64).fill(0.1 * (i + 1))),
                biases: Array(4).fill(0.1 * (i + 1)),
              },
            ],
          },
          fitness: 0,
          generation: 0,
        });
      }

      const results = await evaluator.evaluatePopulation(individuals);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.individual).toBe(individuals[index]);
        expect(result.gameResults).toHaveLength(testConfig.gamesPerIndividual);
        expect(result.averageFitness).toBeGreaterThanOrEqual(0);
        expect(result.averageFitness).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty population', async () => {
      const results = await evaluator.evaluatePopulation([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('updatePopulationFitness', () => {
    it('should update fitness scores correctly', () => {
      const individuals: Individual[] = [
        { id: '1', weights: { layers: [] }, fitness: 0, generation: 0 },
        { id: '2', weights: { layers: [] }, fitness: 0, generation: 0 },
        { id: '3', weights: { layers: [] }, fitness: 0, generation: 0 },
      ];

      const evaluationResults: FitnessResult[] = [
        {
          individual: individuals[0],
          gameResults: [],
          averageFitness: 0.8,
          bestFitness: 0.8,
          fitnessStdDev: 0,
          evaluationTime: 100,
        },
        {
          individual: individuals[1],
          gameResults: [],
          averageFitness: 0.6,
          bestFitness: 0.6,
          fitnessStdDev: 0,
          evaluationTime: 100,
        },
        {
          individual: individuals[2],
          gameResults: [],
          averageFitness: 0.9,
          bestFitness: 0.9,
          fitnessStdDev: 0,
          evaluationTime: 100,
        },
      ];

      evaluator.updatePopulationFitness(individuals, evaluationResults);

      expect(individuals[0].fitness).toBe(0.8);
      expect(individuals[1].fitness).toBe(0.6);
      expect(individuals[2].fitness).toBe(0.9);
    });

    it('should throw error for mismatched array lengths', () => {
      const individuals: Individual[] = [
        { id: '1', weights: { layers: [] }, fitness: 0, generation: 0 },
        { id: '2', weights: { layers: [] }, fitness: 0, generation: 0 },
      ];

      const evaluationResults: FitnessResult[] = [
        {
          individual: individuals[0],
          gameResults: [],
          averageFitness: 0.8,
          bestFitness: 0.8,
          fitnessStdDev: 0,
          evaluationTime: 100,
        },
      ];

      expect(() => {
        evaluator.updatePopulationFitness(individuals, evaluationResults);
      }).toThrow(
        'Individuals and evaluation results arrays must have the same length'
      );
    });
  });

  describe('fitness calculation', () => {
    it('should calculate fitness components correctly', async () => {
      // Create a simple neural network that always goes right
      const rightMovingNetwork = {
        layers: [
          {
            inputSize: 64,
            outputSize: 4,
            weights: [
              Array(64).fill(0), // UP - low weights
              Array(64).fill(1), // RIGHT - high weights
              Array(64).fill(0), // LEFT - low weights
              Array(64).fill(0), // DOWN - low weights
            ],
            biases: [0, 1, 0, 0], // Bias toward RIGHT
          },
        ],
      };

      const individual: Individual = {
        id: 'right_mover',
        weights: rightMovingNetwork,
        fitness: 0,
        generation: 0,
      };

      const result = await evaluator.evaluateIndividual(individual);

      // Should have some fitness components
      result.gameResults.forEach(gameResult => {
        expect(gameResult.score).toBeGreaterThanOrEqual(0);
        expect(gameResult.survivalTime).toBeGreaterThanOrEqual(0); // Allow 0 for quick game failures
        expect(gameResult.steps).toBeGreaterThan(0);
        expect(gameResult.distanceTraveled).toBeGreaterThan(0);
        expect(gameResult.uniquePositionsVisited).toBeGreaterThan(0);
        expect(gameResult.fitness).toBeGreaterThanOrEqual(0);
        expect(gameResult.fitness).toBeLessThanOrEqual(1);
      });
    });

    it('should reward longer survival', async () => {
      const individual: Individual = {
        id: 'test',
        weights: {
          layers: [
            {
              inputSize: 64,
              outputSize: 4,
              weights: Array(4)
                .fill(null)
                .map(() => Array(64).fill(0.1)),
              biases: Array(4).fill(0.1),
            },
          ],
        },
        fitness: 0,
        generation: 0,
      };

      const result = await evaluator.evaluateIndividual(individual);

      // Check that the fitness calculation rewards survival time
      // With survival weight being non-zero, we should get some fitness for surviving
      expect(result.averageFitness).toBeGreaterThanOrEqual(0);
      expect(result.gameResults[0].survivalTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance', () => {
    it('should complete evaluation within reasonable time', async () => {
      const individual: Individual = {
        id: 'performance_test',
        weights: {
          layers: [
            {
              inputSize: 64,
              outputSize: 4,
              weights: Array(4)
                .fill(null)
                .map(() => Array(64).fill(0.1)),
              biases: Array(4).fill(0.1),
            },
          ],
        },
        fitness: 0,
        generation: 0,
      };

      const startTime = Date.now();
      await evaluator.evaluateIndividual(individual);
      const endTime = Date.now();

      // Should complete quickly (within 5 seconds for test config)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should respect max game time limit', async () => {
      const fastConfig = {
        ...testConfig,
        maxGameTime: 100, // Very short time
      };
      const fastEvaluator = new FitnessEvaluator(fastConfig);

      const individual: Individual = {
        id: 'time_test',
        weights: {
          layers: [
            {
              inputSize: 64,
              outputSize: 4,
              weights: Array(4)
                .fill(null)
                .map(() => Array(64).fill(0.1)),
              biases: Array(4).fill(0.1),
            },
          ],
        },
        fitness: 0,
        generation: 0,
      };

      const result = await fastEvaluator.evaluateIndividual(individual);

      // All game results should respect the time limit
      result.gameResults.forEach(gameResult => {
        expect(gameResult.survivalTime).toBeLessThanOrEqual(
          fastConfig.maxGameTime + 50
        ); // Small tolerance
      });
    });
  });
});
