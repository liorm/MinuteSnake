/**
 * Game simulation utilities for neural network training.
 * Runs single game instances to evaluate neural network performance.
 */

import { GameLogic, IGameStage } from '../backend/game-logic';
import { NeuralNetwork } from './neural-network';
import { NNActor, DEFAULT_NN_ACTOR_CONFIG } from '../actors/nn-actor';
import { DEFAULT_ENCODER_CONFIG } from './state-encoder';

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
 * Configuration for game simulation parameters.
 */
export interface SimulationConfig {
  /** Maximum time per game simulation (in milliseconds) */
  maxGameTime: number;
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
 * Runs a single game simulation with the given neural network.
 */
export async function runSingleGame(
  neuralNetwork: NeuralNetwork,
  seed: number,
  config: SimulationConfig
): Promise<GameResult> {
  // Create game stage with unique seed for this simulation
  const gameStage = {
    ...config.gameStage,
    seed: config.gameStage.seed + seed,
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
    steps < config.maxStepsPerGame &&
    Date.now() - startTime < config.maxGameTime
  ) {
    // Get action from neural network
    const gameInput = actor.onStateUpdate(gameLogic.state);

    if (gameInput) {
      gameLogic.input(gameInput);
    }

    // Advance game by one time step
    gameLogic.advanceTime(config.timeStep);
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
  const survival = Math.min(survivalTime / config.maxGameTime, 1.0);
  const score = finalSnake.score / 1000; // Normalize score
  const efficiency =
    survivalTime > 0 ? finalSnake.score / (survivalTime / 1000) : 0;
  const exploration =
    visitedPositions.size / (config.gameStage.xTiles * config.gameStage.yTiles);
  const appleReach = appleApproaches > 0 ? applesEaten / appleApproaches : 0;

  // Calculate weighted fitness
  const fitness =
    config.fitnessWeights.survival * survival +
    config.fitnessWeights.score * Math.min(score, 1.0) +
    config.fitnessWeights.efficiency * Math.min(efficiency / 10, 1.0) +
    config.fitnessWeights.exploration * exploration +
    config.fitnessWeights.appleReach * appleReach;

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
