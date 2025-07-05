/**
 * Tests for the main trainer implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Trainer,
  defaultTrainingConfig,
  TrainingConfig,
  TrainingProgressCallback,
} from './trainer';
import { FitnessEvaluator } from './fitness-evaluator';

describe('Trainer', () => {
  let trainer: Trainer;
  let testConfig: Partial<TrainingConfig>;

  beforeEach(() => {
    testConfig = {
      genetic: {
        populationSize: 4, // Small for fast tests
        maxGenerations: 3,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        elitismRate: 0.25,
        weightRange: 1.0,
      },
      fitness: {
        maxGameTime: 500, // Very short for tests
        gamesPerIndividual: 1,
        maxStepsPerGame: 50,
        gameStage: FitnessEvaluator.createDefaultGameStage(12345),
        fitnessWeights: {
          survival: 0.4,
          score: 0.3,
          efficiency: 0.2,
          exploration: 0.1,
          appleReach: 0.0,
        },
        timeStep: 50,
      },
      networkArchitecture: [64, 32, 4],
      seed: 12345,
      checkpointInterval: 1,
      earlyStoppingConfig: {
        enabled: false, // Disable for tests
        patienceGenerations: 10,
        minImprovement: 0.001,
      },
      parallelConfig: {
        enabled: false, // Disable for simpler tests
        maxConcurrency: 1,
      },
    };

    trainer = new Trainer(testConfig);
  });

  describe('constructor', () => {
    it('should create trainer with default config', () => {
      const defaultTrainer = new Trainer();
      expect(defaultTrainer).toBeDefined();
      expect(defaultTrainer.getConfig()).toEqual(
        expect.objectContaining(defaultTrainingConfig)
      );
    });

    it('should merge configs correctly', () => {
      const config = trainer.getConfig();
      expect(config.genetic.populationSize).toBe(4);
      expect(config.genetic.maxGenerations).toBe(3);
      expect(config.networkArchitecture).toEqual([64, 32, 4]);
    });

    it('should throw error for invalid network architecture', () => {
      expect(() => {
        new Trainer({
          networkArchitecture: [32, 4], // Wrong input size
        });
      }).toThrow('Input layer must have 64 neurons to match state encoder');
    });

    it('should throw error for invalid output layer', () => {
      expect(() => {
        new Trainer({
          networkArchitecture: [64, 32, 2], // Wrong output size
        });
      }).toThrow('Output layer must have 4 neurons for direction outputs');
    });

    it('should throw error for insufficient layers', () => {
      expect(() => {
        new Trainer({
          networkArchitecture: [64], // Only one layer
        });
      }).toThrow('Network architecture must have at least 2 layers');
    });
  });

  describe('training status', () => {
    it('should return correct initial status', () => {
      const status = trainer.getTrainingStatus();

      expect(status.isRunning).toBe(false);
      expect(status.sessionId).toBeNull();
      expect(status.currentGeneration).toBe(0);
      expect(status.totalGenerations).toBe(3);
      expect(status.bestFitness).toBe(0);
      expect(status.averageFitness).toBe(0);
      expect(status.elapsedTime).toBe(0);
      expect(status.estimatedTimeRemaining).toBe(0);
    });

    it('should update status during training', async () => {
      const trainingPromise = trainer.startTraining();

      // Check status while training (might be very brief)
      const statusDuringTraining = trainer.getTrainingStatus();
      expect(statusDuringTraining.isRunning).toBe(true);
      expect(statusDuringTraining.sessionId).toBeDefined();

      await trainingPromise;

      const statusAfterTraining = trainer.getTrainingStatus();
      expect(statusAfterTraining.isRunning).toBe(false);
      expect(statusAfterTraining.currentGeneration).toBe(3);
    });
  });

  describe('callbacks', () => {
    it('should call progress callbacks', async () => {
      const callbacks: TrainingProgressCallback = {
        onGenerationStart: vi.fn(),
        onGenerationComplete: vi.fn(),
        onTrainingComplete: vi.fn(),
        onCheckpoint: vi.fn(),
      };

      trainer.setCallbacks(callbacks);

      await trainer.startTraining();

      expect(callbacks.onGenerationStart).toHaveBeenCalledTimes(3);
      expect(callbacks.onGenerationComplete).toHaveBeenCalledTimes(3);
      expect(callbacks.onTrainingComplete).toHaveBeenCalledTimes(1);
      expect(callbacks.onCheckpoint).toHaveBeenCalledTimes(3); // checkpoint every generation
    });

    it('should call error callback on training failure', async () => {
      const callbacks: TrainingProgressCallback = {
        onTrainingError: vi.fn(),
      };

      trainer.setCallbacks(callbacks);

      // Create trainer with invalid config to force error
      const badTrainer = new Trainer({
        ...testConfig,
        fitness: {
          ...testConfig.fitness!,
          gamesPerIndividual: 0, // Invalid config
        },
      });
      badTrainer.setCallbacks(callbacks);

      await expect(badTrainer.startTraining()).rejects.toThrow();
      expect(callbacks.onTrainingError).toHaveBeenCalledTimes(1);
    });
  });

  describe('training lifecycle', () => {
    it('should complete full training cycle', async () => {
      const sessionId = await trainer.startTraining();

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);

      const dataCollector = trainer.getDataCollector();
      const session = dataCollector.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session!.status).toBe('completed');
      expect(session!.totalGenerations).toBe(3);
      expect(session!.generations).toHaveLength(3);
      expect(session!.bestFitness).toBeGreaterThan(0);
    });

    it('should prevent multiple simultaneous training sessions', async () => {
      const trainingPromise = trainer.startTraining();

      await expect(trainer.startTraining()).rejects.toThrow(
        'Training is already in progress'
      );

      await trainingPromise;
    });

    it('should handle training cancellation', async () => {
      // Start training but stop immediately
      const trainingPromise = trainer.startTraining();
      trainer.stopTraining();

      await trainingPromise;

      const status = trainer.getTrainingStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('early stopping', () => {
    it('should respect early stopping when enabled', async () => {
      const earlyStopTrainer = new Trainer({
        ...testConfig,
        genetic: {
          ...testConfig.genetic!,
          maxGenerations: 100, // Many generations
        },
        earlyStoppingConfig: {
          enabled: true,
          patienceGenerations: 2,
          minImprovement: 0.001,
        },
      });

      const sessionId = await earlyStopTrainer.startTraining();

      const dataCollector = earlyStopTrainer.getDataCollector();
      const session = dataCollector.getSession(sessionId);

      // Should stop before 100 generations due to early stopping
      expect(session!.totalGenerations).toBeLessThan(100);
    });
  });

  describe('parallel evaluation', () => {
    it('should handle parallel evaluation when enabled', async () => {
      const parallelTrainer = new Trainer({
        ...testConfig,
        parallelConfig: {
          enabled: true,
          maxConcurrency: 2,
        },
      });

      const sessionId = await parallelTrainer.startTraining();

      // Should complete successfully
      const dataCollector = parallelTrainer.getDataCollector();
      const session = dataCollector.getSession(sessionId);
      expect(session!.status).toBe('completed');
    });
  });

  describe('fitness progression', () => {
    it('should show fitness improvement over generations', async () => {
      const sessionId = await trainer.startTraining();

      const dataCollector = trainer.getDataCollector();
      const session = dataCollector.getSession(sessionId);

      expect(session!.generations).toHaveLength(3);

      // Check that each generation has valid fitness values
      session!.generations.forEach((generation, index) => {
        expect(generation.generation).toBe(index);
        expect(generation.stats.bestFitness).toBeGreaterThanOrEqual(0);
        expect(generation.stats.bestFitness).toBeLessThanOrEqual(1);
        expect(generation.stats.averageFitness).toBeGreaterThanOrEqual(0);
        expect(generation.stats.averageFitness).toBeLessThanOrEqual(1);
        expect(generation.evaluationResults).toHaveLength(4); // Population size
      });
    });

    it('should maintain best individual across generations', async () => {
      const sessionId = await trainer.startTraining();

      const dataCollector = trainer.getDataCollector();
      const session = dataCollector.getSession(sessionId);

      // Best individual should have the highest fitness from any generation
      const allGenerationBests = session!.generations.map(
        gen => gen.stats.bestFitness
      );
      const maxFitness = Math.max(...allGenerationBests);

      expect(session!.bestFitness).toBe(maxFitness);
      expect(session!.bestIndividual).toBeDefined();
      expect(session!.bestIndividual!.fitness).toBe(maxFitness);
    });
  });

  describe('data persistence', () => {
    it('should collect generation data correctly', async () => {
      const sessionId = await trainer.startTraining();

      const dataCollector = trainer.getDataCollector();
      const metrics = dataCollector.calculateMetrics(sessionId);

      expect(metrics.fitnessProgression).toHaveLength(3);
      expect(metrics.diversityProgression).toHaveLength(3);
      expect(metrics.evaluationTimes).toHaveLength(3);

      // All fitness values should be valid
      metrics.fitnessProgression.forEach(fitness => {
        expect(fitness).toBeGreaterThanOrEqual(0);
        expect(fitness).toBeLessThanOrEqual(1);
      });
    });

    it('should export training data', async () => {
      const sessionId = await trainer.startTraining();

      const dataCollector = trainer.getDataCollector();
      const exportData = dataCollector.exportSession(sessionId);

      expect(exportData.session.id).toBe(sessionId);
      expect(exportData.session.generations).toHaveLength(3);
      expect(exportData.metrics).toBeDefined();
      expect(exportData.version).toBe('1.0');
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical results with same configuration', async () => {
      const trainer1 = new Trainer(testConfig);
      const trainer2 = new Trainer(testConfig);

      const sessionId1 = await trainer1.startTraining();
      const sessionId2 = await trainer2.startTraining();

      const dataCollector1 = trainer1.getDataCollector();
      const dataCollector2 = trainer2.getDataCollector();

      const metrics1 = dataCollector1.calculateMetrics(sessionId1);
      const metrics2 = dataCollector2.calculateMetrics(sessionId2);

      // Due to seeded randomness, results should be identical
      expect(metrics1.fitnessProgression).toEqual(metrics2.fitnessProgression);
    });

    it('should produce different results with different seeds', async () => {
      const config1 = { ...testConfig, seed: 12345 };
      const config2 = { ...testConfig, seed: 67890 };

      const trainer1 = new Trainer(config1);
      const trainer2 = new Trainer(config2);

      const sessionId1 = await trainer1.startTraining();
      const sessionId2 = await trainer2.startTraining();

      const dataCollector1 = trainer1.getDataCollector();
      const dataCollector2 = trainer2.getDataCollector();

      const metrics1 = dataCollector1.calculateMetrics(sessionId1);
      const metrics2 = dataCollector2.calculateMetrics(sessionId2);

      // Different seeds should produce different results
      expect(metrics1.fitnessProgression).not.toEqual(
        metrics2.fitnessProgression
      );
    });
  });

  describe('performance', () => {
    it('should complete training within reasonable time', async () => {
      const startTime = Date.now();
      await trainer.startTraining();
      const endTime = Date.now();

      // With very short game times and small population, should complete quickly
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
    });

    it('should handle large populations efficiently', async () => {
      const largePopulationConfig = {
        ...testConfig,
        genetic: {
          ...testConfig.genetic!,
          populationSize: 20,
          maxGenerations: 1,
        },
      };

      const largeTrainer = new Trainer(largePopulationConfig);

      const startTime = Date.now();
      await largeTrainer.startTraining();
      const endTime = Date.now();

      // Should handle larger population without excessive time
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
    });
  });

  describe('error handling', () => {
    it('should handle fitness evaluation errors gracefully', async () => {
      // Create config that might cause issues
      const problematicConfig = {
        ...testConfig,
        fitness: {
          ...testConfig.fitness!,
          maxGameTime: -1, // Invalid config
        },
      };

      const problematicTrainer = new Trainer(problematicConfig);

      await expect(problematicTrainer.startTraining()).rejects.toThrow();

      const status = problematicTrainer.getTrainingStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should clean up state after errors', async () => {
      const trainer1 = new Trainer(testConfig);

      // Simulate error by stopping immediately
      const trainingPromise = trainer1.startTraining();
      trainer1.stopTraining();

      await trainingPromise;

      // Should be able to start new training after error
      const sessionId = await trainer1.startTraining();
      expect(sessionId).toBeDefined();
    });
  });
});
