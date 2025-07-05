/**
 * Tests for the data collector implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataCollector, TrainingSessionConfig } from './data-collector';
import { Individual, GenerationStats } from './genetic-algorithm';
import { FitnessResult } from './fitness-evaluator';

describe('DataCollector', () => {
  let dataCollector: DataCollector;
  let testConfig: TrainingSessionConfig;

  beforeEach(() => {
    dataCollector = new DataCollector();
    testConfig = {
      populationSize: 10,
      maxGenerations: 100,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      elitismRate: 0.1,
      fitnessWeights: {
        survival: 0.3,
        score: 0.4,
        efficiency: 0.15,
        exploration: 0.1,
        appleReach: 0.05,
      },
      gameConfig: {
        maxGameTime: 60000,
        gamesPerIndividual: 5,
        maxStepsPerGame: 10000,
      },
      networkArchitecture: [64, 128, 64, 4],
      seed: 12345,
    };
  });

  describe('session management', () => {
    it('should start a new session', () => {
      const sessionId = dataCollector.startSession(testConfig);

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);

      const session = dataCollector.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.id).toBe(sessionId);
      expect(session!.status).toBe('running');
      expect(session!.config).toEqual(testConfig);
      expect(session!.totalGenerations).toBe(0);
      expect(session!.bestFitness).toBe(0);
      expect(session!.generations).toHaveLength(0);
      expect(session!.startTime).toBeInstanceOf(Date);
      expect(session!.endTime).toBeUndefined();
    });

    it('should get current session', () => {
      const sessionId = dataCollector.startSession(testConfig);
      const currentSession = dataCollector.getCurrentSession();

      expect(currentSession).toBeDefined();
      expect(currentSession!.id).toBe(sessionId);
    });

    it('should complete a session', () => {
      const sessionId = dataCollector.startSession(testConfig);

      dataCollector.completeSession(sessionId, 'completed');

      const session = dataCollector.getSession(sessionId);
      expect(session!.status).toBe('completed');
      expect(session!.endTime).toBeInstanceOf(Date);
      expect(dataCollector.getCurrentSession()).toBeNull();
    });

    it('should throw error for completing non-existent session', () => {
      expect(() => {
        dataCollector.completeSession('non_existent', 'completed');
      }).toThrow('Session non_existent not found');
    });

    it('should get all sessions', () => {
      const sessionId1 = dataCollector.startSession(testConfig);
      const sessionId2 = dataCollector.startSession(testConfig);

      const allSessions = dataCollector.getAllSessions();
      expect(allSessions).toHaveLength(2);
      expect(allSessions.map(s => s.id)).toContain(sessionId1);
      expect(allSessions.map(s => s.id)).toContain(sessionId2);
    });
  });

  describe('generation recording', () => {
    it('should record generation data', () => {
      const sessionId = dataCollector.startSession(testConfig);

      const stats: GenerationStats = {
        generation: 0,
        bestFitness: 0.8,
        averageFitness: 0.5,
        worstFitness: 0.1,
        diversity: 0.3,
      };

      const bestIndividual: Individual = {
        id: 'best_gen0',
        weights: { layers: [] },
        fitness: 0.8,
        generation: 0,
      };

      const evaluationResults: FitnessResult[] = [
        {
          individual: bestIndividual,
          gameResults: [],
          averageFitness: 0.8,
          bestFitness: 0.8,
          fitnessStdDev: 0,
          evaluationTime: 1000,
        },
      ];

      dataCollector.recordGeneration(
        sessionId,
        0,
        stats,
        bestIndividual,
        evaluationResults
      );

      const session = dataCollector.getSession(sessionId);
      expect(session!.generations).toHaveLength(1);
      expect(session!.totalGenerations).toBe(1);
      expect(session!.bestFitness).toBe(0.8);
      expect(session!.bestIndividual).toEqual(bestIndividual);

      const generationData = session!.generations[0];
      expect(generationData.generation).toBe(0);
      expect(generationData.stats).toEqual(stats);
      expect(generationData.bestIndividual).toEqual(bestIndividual);
      expect(generationData.evaluationResults).toEqual(evaluationResults);
      expect(generationData.averageEvaluationTime).toBe(1000);
      expect(generationData.totalEvaluationTime).toBe(1000);
      expect(generationData.timestamp).toBeInstanceOf(Date);
    });

    it('should update best fitness across generations', () => {
      const sessionId = dataCollector.startSession(testConfig);

      // First generation with fitness 0.5
      const stats1: GenerationStats = {
        generation: 0,
        bestFitness: 0.5,
        averageFitness: 0.3,
        worstFitness: 0.1,
        diversity: 0.4,
      };

      const individual1: Individual = {
        id: 'best_gen0',
        weights: { layers: [] },
        fitness: 0.5,
        generation: 0,
      };

      dataCollector.recordGeneration(sessionId, 0, stats1, individual1, []);

      // Second generation with higher fitness 0.8
      const stats2: GenerationStats = {
        generation: 1,
        bestFitness: 0.8,
        averageFitness: 0.6,
        worstFitness: 0.2,
        diversity: 0.3,
      };

      const individual2: Individual = {
        id: 'best_gen1',
        weights: { layers: [] },
        fitness: 0.8,
        generation: 1,
      };

      dataCollector.recordGeneration(sessionId, 1, stats2, individual2, []);

      const session = dataCollector.getSession(sessionId);
      expect(session!.bestFitness).toBe(0.8);
      expect(session!.bestIndividual).toEqual(individual2);
    });

    it('should not downgrade best fitness', () => {
      const sessionId = dataCollector.startSession(testConfig);

      // First generation with high fitness
      const individual1: Individual = {
        id: 'best_gen0',
        weights: { layers: [] },
        fitness: 0.9,
        generation: 0,
      };

      dataCollector.recordGeneration(
        sessionId,
        0,
        {} as GenerationStats,
        individual1,
        []
      );

      // Second generation with lower fitness
      const individual2: Individual = {
        id: 'best_gen1',
        weights: { layers: [] },
        fitness: 0.6,
        generation: 1,
      };

      dataCollector.recordGeneration(
        sessionId,
        1,
        {} as GenerationStats,
        individual2,
        []
      );

      const session = dataCollector.getSession(sessionId);
      expect(session!.bestFitness).toBe(0.9); // Should remain 0.9
      expect(session!.bestIndividual).toEqual(individual1); // Should remain first individual
    });

    it('should throw error for recording to non-existent session', () => {
      expect(() => {
        dataCollector.recordGeneration(
          'non_existent',
          0,
          {} as GenerationStats,
          {} as Individual,
          []
        );
      }).toThrow('Session non_existent not found');
    });
  });

  describe('metrics calculation', () => {
    it('should calculate performance metrics', () => {
      const sessionId = dataCollector.startSession(testConfig);

      // Record several generations with progression
      const fitnessProgression = [0.1, 0.2, 0.4, 0.6, 0.65, 0.67, 0.68, 0.69];

      fitnessProgression.forEach((fitness, generation) => {
        const stats: GenerationStats = {
          generation,
          bestFitness: fitness,
          averageFitness: fitness * 0.7,
          worstFitness: fitness * 0.3,
          diversity: 0.3 - generation * 0.02, // Decreasing diversity
        };

        const individual: Individual = {
          id: `best_gen${generation}`,
          weights: { layers: [] },
          fitness,
          generation,
        };

        const evaluationResults: FitnessResult[] = [
          {
            individual,
            gameResults: [],
            averageFitness: fitness,
            bestFitness: fitness,
            fitnessStdDev: 0,
            evaluationTime: 1000 + generation * 100, // Increasing evaluation time
          },
        ];

        dataCollector.recordGeneration(
          sessionId,
          generation,
          stats,
          individual,
          evaluationResults
        );
      });

      const metrics = dataCollector.calculateMetrics(sessionId);

      expect(metrics.fitnessProgression).toEqual(fitnessProgression);
      expect(metrics.diversityProgression).toHaveLength(
        fitnessProgression.length
      );
      expect(metrics.evaluationTimes).toHaveLength(fitnessProgression.length);
      expect(metrics.evaluationTimes[0]).toBe(1000);
      expect(metrics.evaluationTimes[7]).toBe(1700);
    });

    it('should detect convergence', () => {
      const sessionId = dataCollector.startSession(testConfig);

      // Create a plateau after initial improvement
      const fitnessProgression = [
        0.1,
        0.2,
        0.3,
        0.4,
        0.5,
        0.6,
        0.7,
        0.8,
        0.9,
        0.95, // Initial improvement
        0.95,
        0.95,
        0.95,
        0.95,
        0.95,
        0.95,
        0.95,
        0.95,
        0.95,
        0.95, // Plateau
        0.95,
        0.95,
        0.95,
        0.95,
        0.95, // More plateau
      ];

      fitnessProgression.forEach((fitness, generation) => {
        const stats: GenerationStats = {
          generation,
          bestFitness: fitness,
          averageFitness: fitness * 0.8,
          worstFitness: fitness * 0.5,
          diversity: 0.3,
        };

        const individual: Individual = {
          id: `best_gen${generation}`,
          weights: { layers: [] },
          fitness,
          generation,
        };

        dataCollector.recordGeneration(
          sessionId,
          generation,
          stats,
          individual,
          []
        );
      });

      const metrics = dataCollector.calculateMetrics(sessionId);

      expect(metrics.convergenceGeneration).toBeDefined();
      expect(metrics.plateauDetection.isOnPlateau).toBe(true);
      expect(metrics.plateauDetection.plateauDuration).toBeGreaterThan(20);
    });

    it('should handle empty generations', () => {
      const sessionId = dataCollector.startSession(testConfig);

      const metrics = dataCollector.calculateMetrics(sessionId);

      expect(metrics.fitnessProgression).toEqual([]);
      expect(metrics.diversityProgression).toEqual([]);
      expect(metrics.evaluationTimes).toEqual([]);
      expect(metrics.plateauDetection.isOnPlateau).toBe(false);
      expect(metrics.plateauDetection.plateauDuration).toBe(0);
      expect(metrics.plateauDetection.lastImprovement).toBe(0);
    });
  });

  describe('early stopping', () => {
    it('should detect when to stop early due to high fitness', () => {
      const sessionId = dataCollector.startSession(testConfig);

      const individual: Individual = {
        id: 'high_fitness',
        weights: { layers: [] },
        fitness: 0.96, // Very high fitness
        generation: 10,
      };

      dataCollector.recordGeneration(
        sessionId,
        10,
        {} as GenerationStats,
        individual,
        []
      );

      const shouldStop = dataCollector.shouldStopEarly(sessionId);
      expect(shouldStop).toBe(true);
    });

    it('should detect when to stop early due to long plateau', () => {
      const sessionId = dataCollector.startSession(testConfig);

      // Create a very long plateau
      for (let i = 0; i < 150; i++) {
        const stats: GenerationStats = {
          generation: i,
          bestFitness: 0.7, // Constant fitness
          averageFitness: 0.6,
          worstFitness: 0.5,
          diversity: 0.1,
        };

        const individual: Individual = {
          id: `plateau_gen${i}`,
          weights: { layers: [] },
          fitness: 0.7,
          generation: i,
        };

        dataCollector.recordGeneration(sessionId, i, stats, individual, []);
      }

      const shouldStop = dataCollector.shouldStopEarly(sessionId);
      expect(shouldStop).toBe(true);
    });

    it('should not stop early for progressing fitness', () => {
      const sessionId = dataCollector.startSession(testConfig);

      // Create steady improvement
      for (let i = 0; i < 50; i++) {
        const stats: GenerationStats = {
          generation: i,
          bestFitness: 0.1 + i * 0.01, // Steady improvement
          averageFitness: 0.05 + i * 0.008,
          worstFitness: 0.01 + i * 0.005,
          diversity: 0.3,
        };

        const individual: Individual = {
          id: `improving_gen${i}`,
          weights: { layers: [] },
          fitness: 0.1 + i * 0.01,
          generation: i,
        };

        dataCollector.recordGeneration(sessionId, i, stats, individual, []);
      }

      const shouldStop = dataCollector.shouldStopEarly(sessionId);
      expect(shouldStop).toBe(false);
    });
  });

  describe('data export and import', () => {
    it('should export session data', () => {
      const sessionId = dataCollector.startSession(testConfig);

      // Add some generation data
      const individual: Individual = {
        id: 'test_individual',
        weights: { layers: [] },
        fitness: 0.8,
        generation: 0,
      };

      dataCollector.recordGeneration(
        sessionId,
        0,
        {} as GenerationStats,
        individual,
        []
      );
      dataCollector.completeSession(sessionId, 'completed');

      const exportData = dataCollector.exportSession(sessionId);

      expect(exportData.session.id).toBe(sessionId);
      expect(exportData.session.status).toBe('completed');
      expect(exportData.metrics).toBeDefined();
      expect(exportData.exportDate).toBeInstanceOf(Date);
      expect(exportData.version).toBe('1.0');
    });

    it('should import session data', () => {
      const sessionId = dataCollector.startSession(testConfig);
      dataCollector.completeSession(sessionId, 'completed');

      const exportData = dataCollector.exportSession(sessionId);
      const importedSessionId = dataCollector.importSession(exportData);

      expect(importedSessionId).not.toBe(sessionId); // Should get new ID

      const importedSession = dataCollector.getSession(importedSessionId);
      expect(importedSession).toBeDefined();
      expect(importedSession!.config).toEqual(testConfig);
      expect(importedSession!.status).toBe('completed');
    });

    it('should throw error for exporting non-existent session', () => {
      expect(() => {
        dataCollector.exportSession('non_existent');
      }).toThrow('Session non_existent not found');
    });
  });

  describe('session summary', () => {
    it('should calculate sessions summary', () => {
      // Create multiple sessions with different statuses
      const sessionId1 = dataCollector.startSession(testConfig);
      dataCollector.completeSession(sessionId1, 'completed');

      const sessionId2 = dataCollector.startSession(testConfig);
      dataCollector.completeSession(sessionId2, 'failed');

      const _sessionId3 = dataCollector.startSession(testConfig);
      // Leave running

      // Add some data to first session
      const individual: Individual = {
        id: 'test',
        weights: { layers: [] },
        fitness: 0.9,
        generation: 0,
      };

      dataCollector.recordGeneration(
        sessionId1,
        0,
        {} as GenerationStats,
        individual,
        []
      );
      dataCollector.recordGeneration(
        sessionId1,
        1,
        {} as GenerationStats,
        individual,
        []
      );

      const summary = dataCollector.getSessionsSummary();

      expect(summary.totalSessions).toBe(3);
      expect(summary.completedSessions).toBe(1);
      expect(summary.bestOverallFitness).toBe(0.9);
      expect(summary.totalGenerations).toBe(2);
      expect(summary.averageSessionDuration).toBeGreaterThan(0);
    });
  });

  describe('logging', () => {
    it('should log progress without throwing errors', () => {
      const sessionId = dataCollector.startSession(testConfig);

      const stats: GenerationStats = {
        generation: 0,
        bestFitness: 0.8,
        averageFitness: 0.6,
        worstFitness: 0.2,
        diversity: 0.3,
      };

      const individual: Individual = {
        id: 'test',
        weights: { layers: [] },
        fitness: 0.8,
        generation: 0,
      };

      const evaluationResults: FitnessResult[] = [
        {
          individual,
          gameResults: [],
          averageFitness: 0.8,
          bestFitness: 0.8,
          fitnessStdDev: 0,
          evaluationTime: 5000,
        },
      ];

      dataCollector.recordGeneration(
        sessionId,
        0,
        stats,
        individual,
        evaluationResults
      );

      // Should not throw
      expect(() => {
        dataCollector.logProgress(sessionId, 0);
      }).not.toThrow();
    });
  });

  describe('clear data', () => {
    it('should clear all data', () => {
      const sessionId = dataCollector.startSession(testConfig);

      dataCollector.clearAllData();

      expect(dataCollector.getSession(sessionId)).toBeNull();
      expect(dataCollector.getAllSessions()).toHaveLength(0);
      expect(dataCollector.getCurrentSession()).toBeNull();
    });
  });
});
