/**
 * Training data collection and storage system for neural network training.
 * Manages training sessions, logs performance metrics, and stores results.
 */

import { Individual, GenerationStats } from './genetic-algorithm';
import { FitnessResult } from './fitness-evaluator';

/**
 * Training session metadata and configuration.
 */
export interface TrainingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  config: TrainingSessionConfig;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalGenerations: number;
  bestFitness: number;
  bestIndividual?: Individual;
  generations: GenerationData[];
}

/**
 * Configuration for a training session.
 */
export interface TrainingSessionConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  fitnessWeights: {
    survival: number;
    score: number;
    efficiency: number;
    exploration: number;
    appleReach: number;
  };
  gameConfig: {
    maxGameTime: number;
    gamesPerIndividual: number;
    maxStepsPerGame: number;
  };
  networkArchitecture: number[];
  seed: number;
}

/**
 * Data for a single generation during training.
 */
export interface GenerationData {
  generation: number;
  timestamp: Date;
  stats: GenerationStats;
  bestIndividual: Individual;
  evaluationResults: FitnessResult[];
  averageEvaluationTime: number;
  totalEvaluationTime: number;
}

/**
 * Performance metrics for analysis and monitoring.
 */
export interface PerformanceMetrics {
  fitnessProgression: number[];
  diversityProgression: number[];
  evaluationTimes: number[];
  convergenceGeneration?: number;
  plateauDetection: {
    isOnPlateau: boolean;
    plateauDuration: number;
    lastImprovement: number;
  };
}

/**
 * Export format for training data.
 */
export interface TrainingDataExport {
  session: TrainingSession;
  metrics: PerformanceMetrics;
  exportDate: Date;
  version: string;
}

/**
 * Data collector for managing training sessions and performance metrics.
 */
export class DataCollector {
  private sessions: Map<string, TrainingSession> = new Map();
  private currentSession: TrainingSession | null = null;

  /**
   * Starts a new training session.
   */
  public startSession(config: TrainingSessionConfig): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: TrainingSession = {
      id: sessionId,
      startTime: new Date(),
      config,
      status: 'running',
      totalGenerations: 0,
      bestFitness: 0,
      generations: [],
    };

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    return sessionId;
  }

  /**
   * Records data for a completed generation.
   */
  public recordGeneration(
    sessionId: string,
    generation: number,
    stats: GenerationStats,
    bestIndividual: Individual,
    evaluationResults: FitnessResult[]
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Calculate evaluation timing metrics
    const evaluationTimes = evaluationResults.map(
      result => result.evaluationTime
    );
    const totalEvaluationTime = evaluationTimes.reduce((a, b) => a + b, 0);
    const averageEvaluationTime = totalEvaluationTime / evaluationTimes.length;

    const generationData: GenerationData = {
      generation,
      timestamp: new Date(),
      stats,
      bestIndividual: this.deepCopyIndividual(bestIndividual),
      evaluationResults: evaluationResults.map(result => ({
        ...result,
        individual: this.deepCopyIndividual(result.individual),
      })),
      averageEvaluationTime,
      totalEvaluationTime,
    };

    session.generations.push(generationData);
    session.totalGenerations = generation + 1;

    // Update best fitness and individual
    if (bestIndividual.fitness > session.bestFitness) {
      session.bestFitness = bestIndividual.fitness;
      session.bestIndividual = this.deepCopyIndividual(bestIndividual);
    }
  }

  /**
   * Completes the current training session.
   */
  public completeSession(
    sessionId: string,
    status: 'completed' | 'failed' | 'cancelled'
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = status;
    session.endTime = new Date();

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
  }

  /**
   * Gets a training session by ID.
   */
  public getSession(sessionId: string): TrainingSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Gets all training sessions.
   */
  public getAllSessions(): TrainingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Gets the currently active training session.
   */
  public getCurrentSession(): TrainingSession | null {
    return this.currentSession;
  }

  /**
   * Calculates performance metrics for a training session.
   */
  public calculateMetrics(sessionId: string): PerformanceMetrics {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const generations = session.generations;
    if (generations.length === 0) {
      return {
        fitnessProgression: [],
        diversityProgression: [],
        evaluationTimes: [],
        plateauDetection: {
          isOnPlateau: false,
          plateauDuration: 0,
          lastImprovement: 0,
        },
      };
    }

    // Extract progression data
    const fitnessProgression = generations.map(gen => gen.stats.bestFitness);
    const diversityProgression = generations.map(gen => gen.stats.diversity);
    const evaluationTimes = generations.map(gen => gen.averageEvaluationTime);

    // Detect convergence (when improvement becomes minimal)
    let convergenceGeneration: number | undefined;
    const improvementThreshold = 0.001; // 0.1% improvement

    for (let i = 10; i < fitnessProgression.length; i++) {
      const recentImprovement =
        fitnessProgression[i] - fitnessProgression[i - 10];
      const relativeImprovement =
        recentImprovement / (fitnessProgression[i - 10] || 1);

      if (Math.abs(relativeImprovement) < improvementThreshold) {
        convergenceGeneration = i;
        break;
      }
    }

    // Detect plateau (sustained period without improvement)
    let lastImprovement = 0;
    let plateauDuration = 0;
    let isOnPlateau = false;

    const plateauThreshold = 0.005; // 0.5% improvement threshold
    const plateauMinDuration = 20; // Minimum generations to consider a plateau

    for (let i = 1; i < fitnessProgression.length; i++) {
      const improvement = fitnessProgression[i] - fitnessProgression[i - 1];
      const relativeImprovement =
        improvement / (fitnessProgression[i - 1] || 1);

      if (relativeImprovement > plateauThreshold) {
        lastImprovement = i;
        plateauDuration = 0;
      } else {
        plateauDuration = i - lastImprovement;
      }
    }

    isOnPlateau = plateauDuration >= plateauMinDuration;

    return {
      fitnessProgression,
      diversityProgression,
      evaluationTimes,
      convergenceGeneration,
      plateauDetection: {
        isOnPlateau,
        plateauDuration,
        lastImprovement,
      },
    };
  }

  /**
   * Exports training data to a portable format.
   */
  public exportSession(sessionId: string): TrainingDataExport {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const metrics = this.calculateMetrics(sessionId);

    return {
      session: JSON.parse(JSON.stringify(session)), // Deep copy
      metrics,
      exportDate: new Date(),
      version: '1.0',
    };
  }

  /**
   * Imports training data from an export.
   */
  public importSession(exportData: TrainingDataExport): string {
    const session = exportData.session;

    // Generate new ID to avoid conflicts
    const newSessionId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    session.id = newSessionId;

    this.sessions.set(newSessionId, session);
    return newSessionId;
  }

  /**
   * Saves training data to JSON file.
   */
  public async saveToFile(sessionId: string, filePath: string): Promise<void> {
    const exportData = this.exportSession(sessionId);
    const jsonData = JSON.stringify(exportData, null, 2);

    // In a browser environment, this would trigger a download
    // In Node.js, this would write to the file system
    if (
      typeof window !== 'undefined' &&
      typeof Blob !== 'undefined' &&
      typeof URL !== 'undefined'
    ) {
      // Browser environment - trigger download
      // eslint-disable-next-line no-undef
      const blob = new Blob([jsonData], { type: 'application/json' });
      // eslint-disable-next-line no-undef
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath;
      a.click();
      // eslint-disable-next-line no-undef
      URL.revokeObjectURL(url);
    } else {
      // Node.js environment - write to file
      const { promises: fs } = await import('fs');
      await fs.writeFile(filePath, jsonData, 'utf8');
    }
  }

  /**
   * Loads training data from JSON file.
   */
  public async loadFromFile(filePath: string): Promise<string> {
    let jsonData: string;

    if (typeof window !== 'undefined') {
      // Browser environment - would need file input
      throw new Error('File loading not supported in browser environment');
    } else {
      // Node.js environment - read from file
      const { promises: fs } = await import('fs');
      jsonData = await fs.readFile(filePath, 'utf8');
    }

    const exportData: TrainingDataExport = JSON.parse(jsonData);
    return this.importSession(exportData);
  }

  /**
   * Clears all training data.
   */
  public clearAllData(): void {
    this.sessions.clear();
    this.currentSession = null;
  }

  /**
   * Gets summary statistics for all sessions.
   */
  public getSessionsSummary(): {
    totalSessions: number;
    completedSessions: number;
    bestOverallFitness: number;
    totalGenerations: number;
    averageSessionDuration: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const completedSessions = sessions.filter(s => s.status === 'completed');

    const bestOverallFitness = sessions.reduce(
      (max, session) => Math.max(max, session.bestFitness),
      0
    );

    const totalGenerations = sessions.reduce(
      (sum, session) => sum + session.totalGenerations,
      0
    );

    const sessionsWithDuration = completedSessions.filter(s => s.endTime);
    const averageSessionDuration =
      sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((sum, session) => {
            const duration =
              session.endTime!.getTime() - session.startTime.getTime();
            return sum + duration;
          }, 0) / sessionsWithDuration.length
        : 0;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      bestOverallFitness,
      totalGenerations,
      averageSessionDuration,
    };
  }

  /**
   * Creates a deep copy of an individual to avoid reference issues.
   */
  private deepCopyIndividual(individual: Individual): Individual {
    return JSON.parse(JSON.stringify(individual));
  }

  /**
   * Logs training progress to console.
   */
  public logProgress(sessionId: string, generation: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const generationData = session.generations[session.generations.length - 1];
    if (!generationData) return;

    const stats = generationData.stats;
    const evaluationTime = generationData.totalEvaluationTime;

    console.warn(
      `Generation ${generation + 1}/${session.config.maxGenerations}:`
    );
    console.warn(`  Best Fitness: ${stats.bestFitness.toFixed(4)}`);
    console.warn(`  Avg Fitness:  ${stats.averageFitness.toFixed(4)}`);
    console.warn(`  Diversity:    ${stats.diversity.toFixed(4)}`);
    console.warn(`  Eval Time:    ${(evaluationTime / 1000).toFixed(2)}s`);
    console.warn(`  Session Best: ${session.bestFitness.toFixed(4)}`);
    console.warn('');
  }

  /**
   * Checks if training should be stopped early based on convergence criteria.
   */
  public shouldStopEarly(sessionId: string): boolean {
    const metrics = this.calculateMetrics(sessionId);

    // Stop if converged for too long
    if (
      metrics.plateauDetection.isOnPlateau &&
      metrics.plateauDetection.plateauDuration > 100
    ) {
      return true;
    }

    // Stop if achieved very high fitness
    const session = this.sessions.get(sessionId);
    if (session && session.bestFitness > 0.95) {
      return true;
    }

    return false;
  }
}
