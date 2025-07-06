/**
 * Fitness evaluation system for neural network training.
 * Runs game simulations to evaluate the performance of neural network agents.
 */

import { IGameStage, EDirection } from '../backend/game-logic';
import { Vector } from '../backend/utils';
import { NeuralNetwork } from './neural-network';
import { Individual } from './genetic-algorithm';
import { runSingleGame, GameResult, SimulationConfig } from './game-simulator';

/**
 * Configuration for fitness evaluation parameters.
 */
export interface FitnessConfig {
  /** Maximum time per game simulation (in milliseconds) */
  maxGameTime: number;
  /** Number of games to average per individual */
  gamesPerIndividual: number;
  /** Maximum steps per game (prevents infinite loops) */
  maxStepsPerGame: number;
  /** Weights for different fitness components */
  fitnessWeights: {
    survival: number; // Time survived
    score: number; // Points earned
    efficiency: number; // Score per time ratio
    exploration: number; // Area covered
    appleReach: number; // Apples reached vs. attempted
  };
  /** Game stage configuration */
  gameStage: IGameStage;
  /** Time step interval for game updates */
  timeStep: number;
}

/**
 * Default fitness evaluation configuration.
 */
export const defaultFitnessConfig: Partial<FitnessConfig> = {
  maxGameTime: 60000, // 60 seconds
  gamesPerIndividual: 5,
  maxStepsPerGame: 10000,
  fitnessWeights: {
    survival: 0.3,
    score: 0.4,
    efficiency: 0.15,
    exploration: 0.1,
    appleReach: 0.05,
  },
  timeStep: 100, // 100ms per step
};

/**
 * Aggregated results from multiple game simulations.
 */
export interface FitnessResult {
  /** Individual being evaluated */
  individual: Individual;
  /** Results from each game simulation */
  gameResults: GameResult[];
  /** Average fitness across all games */
  averageFitness: number;
  /** Best single game fitness */
  bestFitness: number;
  /** Standard deviation of fitness scores */
  fitnessStdDev: number;
  /** Total evaluation time in milliseconds */
  evaluationTime: number;
}

/**
 * Fitness evaluator that runs game simulations to assess neural network performance.
 */
export class FitnessEvaluator {
  private config: FitnessConfig;

  constructor(config: Partial<FitnessConfig>) {
    this.config = {
      ...defaultFitnessConfig,
      ...config,
      fitnessWeights: {
        ...defaultFitnessConfig.fitnessWeights,
        ...config.fitnessWeights,
      },
    } as FitnessConfig;

    this.validateConfig();
  }

  /**
   * Validates the fitness evaluation configuration.
   */
  private validateConfig(): void {
    if (this.config.maxGameTime <= 0) {
      throw new Error('Max game time must be positive');
    }
    if (this.config.gamesPerIndividual <= 0) {
      throw new Error('Games per individual must be positive');
    }
    if (this.config.maxStepsPerGame <= 0) {
      throw new Error('Max steps per game must be positive');
    }

    const weightSum = Object.values(this.config.fitnessWeights).reduce(
      (a, b) => a + b,
      0
    );
    if (Math.abs(weightSum - 1.0) > 0.001) {
      throw new Error('Fitness weights must sum to 1.0');
    }
  }

  /**
   * Evaluates a single individual by running multiple game simulations.
   */
  public async evaluateIndividual(
    individual: Individual
  ): Promise<FitnessResult> {
    const startTime = Date.now();
    const gameResults: GameResult[] = [];

    // Create neural network from individual's weights
    const neuralNetwork = new NeuralNetwork(individual.weights);

    // Run multiple games for averaging
    for (
      let gameIndex = 0;
      gameIndex < this.config.gamesPerIndividual;
      gameIndex++
    ) {
      const simulationConfig: SimulationConfig = {
        maxGameTime: this.config.maxGameTime,
        maxStepsPerGame: this.config.maxStepsPerGame,
        fitnessWeights: this.config.fitnessWeights,
        gameStage: this.config.gameStage,
        timeStep: this.config.timeStep,
      };
      const gameResult = await runSingleGame(
        neuralNetwork,
        gameIndex,
        simulationConfig
      );
      gameResults.push(gameResult);
    }

    // Calculate aggregate fitness metrics
    const fitnesses = gameResults.map(result => result.fitness);
    const averageFitness =
      fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const bestFitness = Math.max(...fitnesses);

    // Calculate standard deviation
    const variance =
      fitnesses.reduce((acc, fitness) => {
        return acc + Math.pow(fitness - averageFitness, 2);
      }, 0) / fitnesses.length;
    const fitnessStdDev = Math.sqrt(variance);

    const evaluationTime = Date.now() - startTime;

    return {
      individual,
      gameResults,
      averageFitness,
      bestFitness,
      fitnessStdDev,
      evaluationTime,
    };
  }

  /**
   * Evaluates multiple individuals in parallel.
   */
  public async evaluatePopulation(
    individuals: Individual[]
  ): Promise<FitnessResult[]> {
    const evaluationPromises = individuals.map(individual =>
      this.evaluateIndividual(individual)
    );

    return Promise.all(evaluationPromises);
  }

  /**
   * Updates fitness scores for a population based on evaluation results.
   */
  public updatePopulationFitness(
    individuals: Individual[],
    evaluationResults: FitnessResult[]
  ): void {
    if (individuals.length !== evaluationResults.length) {
      throw new Error(
        'Individuals and evaluation results arrays must have the same length'
      );
    }

    for (let i = 0; i < individuals.length; i++) {
      individuals[i].fitness = evaluationResults[i].averageFitness;
    }
  }

  /**
   * Gets the current fitness configuration.
   */
  public getConfig(): FitnessConfig {
    return this.config;
  }

  /**
   * Creates a default game stage for fitness evaluation.
   */
  public static createDefaultGameStage(seed: number = 12345): IGameStage {
    return {
      xTiles: 20,
      yTiles: 20,
      seed,
      wallHoles: [],
      blocks: [],
      snakes: [
        {
          position: new Vector(10, 10),
          direction: EDirection.RIGHT,
        },
      ],
    };
  }
}
