/**
 * Fitness evaluation system for neural network training.
 * Runs game simulations to evaluate the performance of neural network agents.
 */

import { GameLogic, IGameStage, EDirection } from '../backend/game-logic';
import { Vector } from '../backend/utils';
import { NeuralNetwork } from './neural-network';
import { NNActor, DEFAULT_NN_ACTOR_CONFIG } from '../actors/nn-actor';
import { DEFAULT_ENCODER_CONFIG } from './state-encoder';
import { Individual } from './genetic-algorithm';

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
 * Results from a single game simulation.
 */
export interface GameResult {
  /** Final score achieved */
  score: number;
  /** Time survived in milliseconds */
  survivalTime: number;
  /** Number of game steps completed */
  steps: number;
  /** Whether the game ended due to collision */
  collision: boolean;
  /** Number of apples eaten */
  applesEaten: number;
  /** Total distance traveled */
  distanceTraveled: number;
  /** Unique positions visited (exploration) */
  uniquePositionsVisited: number;
  /** Number of times the snake moved toward the apple */
  appleApproaches: number;
  /** Final fitness score */
  fitness: number;
}

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
      const gameResult = await this.runSingleGame(neuralNetwork, gameIndex);
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
   * Runs a single game simulation with the given neural network.
   */
  private async runSingleGame(
    neuralNetwork: NeuralNetwork,
    seed: number
  ): Promise<GameResult> {
    // Create game stage with unique seed for this simulation
    const gameStage = {
      ...this.config.gameStage,
      seed: this.config.gameStage.seed + seed,
    };

    const gameLogic = new GameLogic(gameStage);

    // Create NN actor for the first snake
    const actor = new NNActor({
      ...DEFAULT_NN_ACTOR_CONFIG,
      snakeIndex: 0,
      neuralNetwork,
      encoderConfig: DEFAULT_ENCODER_CONFIG,
    });

    let steps = 0;
    let applesEaten = 0;
    let distanceTraveled = 0;
    let appleApproaches = 0;
    const visitedPositions = new Set<string>();
    let lastSnakePosition = gameLogic.state.snakes[0].position;
    let lastAppleDistance = Infinity;

    const startTime = Date.now();

    while (
      !gameLogic.state.gameOver &&
      steps < this.config.maxStepsPerGame &&
      Date.now() - startTime < this.config.maxGameTime
    ) {
      // Get action from neural network
      const gameInput = actor.onStateUpdate(gameLogic.state);

      if (gameInput) {
        gameLogic.input(gameInput);
      }

      // Advance game by one time step
      gameLogic.advanceTime(this.config.timeStep);
      steps++;

      const currentState = gameLogic.state;
      const snake = currentState.snakes[0];

      // Track exploration (unique positions visited)
      const positionKey = `${snake.position.x},${snake.position.y}`;
      visitedPositions.add(positionKey);

      // Track distance traveled
      const deltaX = snake.position.x - lastSnakePosition.x;
      const deltaY = snake.position.y - lastSnakePosition.y;
      distanceTraveled += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      lastSnakePosition = snake.position;

      // Track apple interactions
      if (currentState.apple) {
        const appleDistance = Math.sqrt(
          Math.pow(snake.position.x - currentState.apple.position.x, 2) +
            Math.pow(snake.position.y - currentState.apple.position.y, 2)
        );

        // Check if snake moved closer to apple
        if (appleDistance < lastAppleDistance) {
          appleApproaches++;
        }
        lastAppleDistance = appleDistance;

        // Check if apple was eaten (score increased)
        const currentScore = snake.score;
        if (currentScore > applesEaten * 10) {
          // Assuming 10 points per apple
          applesEaten++;
          lastAppleDistance = Infinity; // Reset for new apple
        }
      }
    }

    const survivalTime = Date.now() - startTime;
    const finalState = gameLogic.state;
    const finalSnake = finalState.snakes[0];

    // Calculate fitness components
    const survival = Math.min(survivalTime / this.config.maxGameTime, 1.0);
    const score = finalSnake.score / 1000; // Normalize score
    const efficiency =
      survivalTime > 0 ? finalSnake.score / (survivalTime / 1000) : 0;
    const exploration =
      visitedPositions.size /
      (this.config.gameStage.xTiles * this.config.gameStage.yTiles);
    const appleReach = appleApproaches > 0 ? applesEaten / appleApproaches : 0;

    // Calculate weighted fitness
    const fitness =
      this.config.fitnessWeights.survival * survival +
      this.config.fitnessWeights.score * Math.min(score, 1.0) +
      this.config.fitnessWeights.efficiency * Math.min(efficiency / 10, 1.0) +
      this.config.fitnessWeights.exploration * exploration +
      this.config.fitnessWeights.appleReach * appleReach;

    return {
      score: finalSnake.score,
      survivalTime,
      steps,
      collision: finalState.gameOver,
      applesEaten,
      distanceTraveled,
      uniquePositionsVisited: visitedPositions.size,
      appleApproaches,
      fitness: Math.max(0, Math.min(1, fitness)), // Clamp between 0 and 1
    };
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
