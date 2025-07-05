/**
 * Main training orchestrator for neural network genetic algorithm training.
 * Coordinates genetic algorithm, fitness evaluation, and data collection.
 */

import {
  GeneticAlgorithm,
  GeneticConfig,
  defaultGeneticConfig,
  Individual,
} from './genetic-algorithm';
import {
  FitnessEvaluator,
  FitnessConfig,
  defaultFitnessConfig,
  FitnessResult,
} from './fitness-evaluator';
import { DataCollector, TrainingSessionConfig } from './data-collector';
import { WeightLoader } from './weight-loader';
// Import types only for type annotations

/**
 * Complete training configuration combining all subsystem configs.
 */
export interface TrainingConfig {
  /** Genetic algorithm configuration */
  genetic: GeneticConfig;
  /** Fitness evaluation configuration */
  fitness: FitnessConfig;
  /** Neural network architecture (layer sizes) */
  networkArchitecture: number[];
  /** Random seed for reproducible training */
  seed: number;
  /** Training session name */
  sessionName?: string;
  /** Whether to save best individuals during training */
  saveBestIndividuals: boolean;
  /** How often to save checkpoints (every N generations) */
  checkpointInterval: number;
  /** Early stopping criteria */
  earlyStoppingConfig: {
    enabled: boolean;
    patienceGenerations: number;
    minImprovement: number;
  };
  /** Parallel processing configuration */
  parallelConfig: {
    enabled: boolean;
    maxConcurrency: number;
  };
}

/**
 * Default training configuration.
 */
export const defaultTrainingConfig: TrainingConfig = {
  genetic: defaultGeneticConfig,
  fitness: {
    ...defaultFitnessConfig,
    gameStage: FitnessEvaluator.createDefaultGameStage(),
  } as FitnessConfig,
  networkArchitecture: [64, 128, 64, 4],
  seed: 12345,
  saveBestIndividuals: true,
  checkpointInterval: 50,
  earlyStoppingConfig: {
    enabled: true,
    patienceGenerations: 100,
    minImprovement: 0.001,
  },
  parallelConfig: {
    enabled: true,
    maxConcurrency: 4,
  },
};

/**
 * Training progress callback interface.
 */
export interface TrainingProgressCallback {
  onGenerationStart?: (generation: number) => void;
  onGenerationComplete?: (
    generation: number,
    bestFitness: number,
    avgFitness: number
  ) => void;
  onTrainingComplete?: (sessionId: string, bestIndividual: Individual) => void;
  onTrainingError?: (error: Error) => void;
  onCheckpoint?: (generation: number, bestIndividual: Individual) => void;
}

/**
 * Training status information.
 */
export interface TrainingStatus {
  isRunning: boolean;
  sessionId: string | null;
  currentGeneration: number;
  totalGenerations: number;
  bestFitness: number;
  averageFitness: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
}

/**
 * Main training orchestrator that coordinates all training components.
 */
export class Trainer {
  private config: TrainingConfig;
  private geneticAlgorithm: GeneticAlgorithm;
  private fitnessEvaluator: FitnessEvaluator;
  private dataCollector: DataCollector;
  private isTraining: boolean = false;
  private currentSessionId: string | null = null;
  private trainingStartTime: number = 0;
  private callbacks: TrainingProgressCallback = {};

  constructor(config: Partial<TrainingConfig> = {}) {
    this.config = this.mergeConfigs(defaultTrainingConfig, config);
    this.validateConfig();

    this.geneticAlgorithm = new GeneticAlgorithm(
      this.config.networkArchitecture,
      this.config.genetic,
      this.config.seed
    );

    this.fitnessEvaluator = new FitnessEvaluator(this.config.fitness);
    this.dataCollector = new DataCollector();
  }

  /**
   * Merges training configurations with proper deep merging.
   */
  private mergeConfigs(
    defaultConfig: TrainingConfig,
    userConfig: Partial<TrainingConfig>
  ): TrainingConfig {
    return {
      ...defaultConfig,
      ...userConfig,
      genetic: { ...defaultConfig.genetic, ...userConfig.genetic },
      fitness: {
        ...defaultConfig.fitness,
        ...userConfig.fitness,
        fitnessWeights: {
          ...defaultConfig.fitness.fitnessWeights,
          ...userConfig.fitness?.fitnessWeights,
        },
      },
      earlyStoppingConfig: {
        ...defaultConfig.earlyStoppingConfig,
        ...userConfig.earlyStoppingConfig,
      },
      parallelConfig: {
        ...defaultConfig.parallelConfig,
        ...userConfig.parallelConfig,
      },
    };
  }

  /**
   * Validates the training configuration.
   */
  private validateConfig(): void {
    if (this.config.networkArchitecture.length < 2) {
      throw new Error('Network architecture must have at least 2 layers');
    }

    if (this.config.networkArchitecture[0] !== 64) {
      throw new Error(
        'Input layer must have 64 neurons to match state encoder'
      );
    }

    if (
      this.config.networkArchitecture[
        this.config.networkArchitecture.length - 1
      ] !== 4
    ) {
      throw new Error('Output layer must have 4 neurons for direction outputs');
    }

    if (this.config.checkpointInterval <= 0) {
      throw new Error('Checkpoint interval must be positive');
    }
  }

  /**
   * Sets training progress callbacks.
   */
  public setCallbacks(callbacks: TrainingProgressCallback): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts the training process.
   */
  public async startTraining(): Promise<string> {
    if (this.isTraining) {
      throw new Error('Training is already in progress');
    }

    this.isTraining = true;
    this.trainingStartTime = Date.now();

    try {
      // Start data collection session
      const sessionConfig = this.createSessionConfig();
      this.currentSessionId = this.dataCollector.startSession(sessionConfig);

      // Initialize population
      const population = this.geneticAlgorithm.initializePopulation();

      console.warn(`Starting training session: ${this.currentSessionId}`);
      console.warn(`Population size: ${population.length}`);
      console.warn(`Max generations: ${this.config.genetic.maxGenerations}`);
      console.warn(
        `Network architecture: [${this.config.networkArchitecture.join(', ')}]`
      );
      console.warn('');

      // Main training loop
      for (
        let generation = 0;
        generation < this.config.genetic.maxGenerations;
        generation++
      ) {
        if (!this.isTraining) {
          console.warn('Training cancelled by user');
          break;
        }

        this.callbacks.onGenerationStart?.(generation);

        // Evaluate population fitness
        const evaluationResults = await this.evaluatePopulation(population);

        // Update fitness scores
        this.fitnessEvaluator.updatePopulationFitness(
          population,
          evaluationResults
        );

        // Get best individual
        const bestIndividual = this.geneticAlgorithm.getBestIndividual();
        if (!bestIndividual) {
          throw new Error('No best individual found');
        }

        // Record generation data
        const currentStats =
          this.geneticAlgorithm.calculateCurrentGenerationStats();

        this.dataCollector.recordGeneration(
          this.currentSessionId,
          generation,
          currentStats,
          bestIndividual,
          evaluationResults
        );

        // Log progress
        this.dataCollector.logProgress(this.currentSessionId, generation);

        const avgFitness =
          population.reduce((sum, ind) => sum + ind.fitness, 0) /
          population.length;
        this.callbacks.onGenerationComplete?.(
          generation,
          bestIndividual.fitness,
          avgFitness
        );

        // Check for checkpoints
        if (
          this.config.saveBestIndividuals &&
          generation % this.config.checkpointInterval === 0
        ) {
          await this.saveCheckpoint(generation, bestIndividual);
          this.callbacks.onCheckpoint?.(generation, bestIndividual);
        }

        // Check early stopping conditions
        if (this.shouldStopEarly(generation)) {
          console.warn(`Early stopping triggered at generation ${generation}`);
          break;
        }

        // Evolve to next generation (except on last iteration)
        if (generation < this.config.genetic.maxGenerations - 1) {
          this.geneticAlgorithm.evolveGeneration();
        }
      }

      // Complete training session
      this.dataCollector.completeSession(this.currentSessionId, 'completed');

      const finalBestIndividual = this.geneticAlgorithm.getBestIndividual();
      if (finalBestIndividual) {
        // Save final best individual
        await this.saveBestIndividual(finalBestIndividual, 'final');
        this.callbacks.onTrainingComplete?.(
          this.currentSessionId,
          finalBestIndividual
        );
      }

      console.warn(`Training completed! Session ID: ${this.currentSessionId}`);
      console.warn(
        `Best fitness achieved: ${finalBestIndividual?.fitness.toFixed(4)}`
      );

      return this.currentSessionId;
    } catch (error) {
      console.error('Training failed:', error);

      if (this.currentSessionId) {
        this.dataCollector.completeSession(this.currentSessionId, 'failed');
      }

      this.callbacks.onTrainingError?.(error as Error);
      throw error;
    } finally {
      this.isTraining = false;
      this.currentSessionId = null;
    }
  }

  /**
   * Stops the training process.
   */
  public stopTraining(): void {
    if (!this.isTraining) {
      console.warn('No training session is currently running');
      return;
    }

    console.warn('Stopping training...');
    this.isTraining = false;

    if (this.currentSessionId) {
      this.dataCollector.completeSession(this.currentSessionId, 'cancelled');
    }
  }

  /**
   * Evaluates the fitness of the entire population.
   */
  private async evaluatePopulation(
    population: Individual[]
  ): Promise<FitnessResult[]> {
    if (this.config.parallelConfig.enabled) {
      // Parallel evaluation with concurrency limit
      const results: FitnessResult[] = [];
      const batchSize = this.config.parallelConfig.maxConcurrency;

      for (let i = 0; i < population.length; i += batchSize) {
        const batch = population.slice(i, i + batchSize);
        const batchResults =
          await this.fitnessEvaluator.evaluatePopulation(batch);
        results.push(...batchResults);
      }

      return results;
    } else {
      // Sequential evaluation
      return this.fitnessEvaluator.evaluatePopulation(population);
    }
  }

  /**
   * Checks if training should stop early.
   */
  private shouldStopEarly(_generation: number): boolean {
    if (!this.config.earlyStoppingConfig.enabled || !this.currentSessionId) {
      return false;
    }

    // Check data collector's early stopping logic
    if (this.dataCollector.shouldStopEarly(this.currentSessionId)) {
      return true;
    }

    // Check patience-based early stopping
    const stats = this.geneticAlgorithm.getGenerationStats();
    if (stats.length < this.config.earlyStoppingConfig.patienceGenerations) {
      return false;
    }

    const recentStats = stats.slice(
      -this.config.earlyStoppingConfig.patienceGenerations
    );
    const maxRecentFitness = Math.max(...recentStats.map(s => s.bestFitness));
    const minRecentFitness = Math.min(...recentStats.map(s => s.bestFitness));
    const improvement = maxRecentFitness - minRecentFitness;

    return improvement < this.config.earlyStoppingConfig.minImprovement;
  }

  /**
   * Saves a checkpoint of the best individual.
   */
  private async saveCheckpoint(
    generation: number,
    individual: Individual
  ): Promise<void> {
    const filename = `checkpoint_gen${generation}_fitness${individual.fitness.toFixed(4)}.json`;
    await WeightLoader.saveWeights(individual.weights, filename, {
      trainedGenerations: generation,
      fitnessScore: individual.fitness,
      trainingDate: new Date().toISOString(),
    });
  }

  /**
   * Saves the best individual from training.
   */
  private async saveBestIndividual(
    individual: Individual,
    suffix: string
  ): Promise<void> {
    const filename = `best_${suffix}_fitness${individual.fitness.toFixed(4)}.json`;
    await WeightLoader.saveWeights(individual.weights, filename, {
      trainedGenerations: individual.generation,
      fitnessScore: individual.fitness,
      trainingDate: new Date().toISOString(),
    });
  }

  /**
   * Creates a session configuration for data collection.
   */
  private createSessionConfig(): TrainingSessionConfig {
    return {
      populationSize: this.config.genetic.populationSize,
      maxGenerations: this.config.genetic.maxGenerations,
      mutationRate: this.config.genetic.mutationRate,
      crossoverRate: this.config.genetic.crossoverRate,
      elitismRate: this.config.genetic.elitismRate,
      fitnessWeights: this.config.fitness.fitnessWeights,
      gameConfig: {
        maxGameTime: this.config.fitness.maxGameTime,
        gamesPerIndividual: this.config.fitness.gamesPerIndividual,
        maxStepsPerGame: this.config.fitness.maxStepsPerGame,
      },
      networkArchitecture: this.config.networkArchitecture,
      seed: this.config.seed,
    };
  }

  /**
   * Gets the current training status.
   */
  public getTrainingStatus(): TrainingStatus {
    const elapsedTime = this.isTraining
      ? Date.now() - this.trainingStartTime
      : 0;
    const currentGeneration = this.geneticAlgorithm.getCurrentGeneration();
    const totalGenerations = this.config.genetic.maxGenerations;

    // Estimate remaining time based on progress
    const progress = currentGeneration / totalGenerations;
    const estimatedTotalTime = progress > 0 ? elapsedTime / progress : 0;
    const estimatedTimeRemaining = Math.max(
      0,
      estimatedTotalTime - elapsedTime
    );

    const bestIndividual = this.geneticAlgorithm.getBestIndividual();
    const population = this.geneticAlgorithm.getPopulation();
    const averageFitness =
      population.length > 0
        ? population.reduce((sum, ind) => sum + ind.fitness, 0) /
          population.length
        : 0;

    return {
      isRunning: this.isTraining,
      sessionId: this.currentSessionId,
      currentGeneration,
      totalGenerations,
      bestFitness: bestIndividual?.fitness || 0,
      averageFitness,
      elapsedTime,
      estimatedTimeRemaining,
    };
  }

  /**
   * Gets the data collector for accessing training data.
   */
  public getDataCollector(): DataCollector {
    return this.dataCollector;
  }

  /**
   * Gets the current configuration.
   */
  public getConfig(): TrainingConfig {
    return this.config;
  }

  /**
   * Loads training configuration from a file.
   */
  public static async loadConfig(filePath: string): Promise<TrainingConfig> {
    if (typeof window !== 'undefined') {
      throw new Error('Config loading not supported in browser environment');
    }

    const fs = await import('fs/promises');
    const configData = await fs.readFile(filePath, 'utf8');
    const userConfig = JSON.parse(configData);

    const trainer = new Trainer(userConfig);
    return trainer.getConfig();
  }

  /**
   * Saves training configuration to a file.
   */
  public async saveConfig(filePath: string): Promise<void> {
    const configData = JSON.stringify(this.config, null, 2);

    if (
      typeof window !== 'undefined' &&
      typeof Blob !== 'undefined' &&
      typeof URL !== 'undefined'
    ) {
      // Browser environment - trigger download
      // eslint-disable-next-line no-undef
      const blob = new Blob([configData], { type: 'application/json' });
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
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, configData, 'utf8');
    }
  }
}
