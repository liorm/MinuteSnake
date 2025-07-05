/**
 * Neural Network Actor implementation for Snake AI.
 * Uses trained neural networks to make movement decisions.
 */

import { IActor } from './actor';
import { GameInput, IGameState, EDirection } from '../backend/game-logic';
import { NeuralNetwork } from '../ml/neural-network';
import { StateEncoder, DEFAULT_ENCODER_CONFIG } from '../ml/state-encoder';
import { WeightLoader } from '../ml/weight-loader';

/**
 * Configuration options for the Neural Network Actor.
 */
export interface NNActorConfig {
  /** Index of the snake this actor controls */
  snakeIndex: number;
  /** Neural network to use for decision making */
  neuralNetwork: NeuralNetwork;
  /** State encoder configuration */
  encoderConfig: typeof DEFAULT_ENCODER_CONFIG;
  /** Decision threshold for movement (prevent jittery movement) */
  decisionThreshold: number;
  /** Whether to use probabilistic action selection */
  useProbabilisticSelection: boolean;
  /** Temperature for probabilistic selection (higher = more random) */
  selectionTemperature: number;
  /** Minimum time between direction changes (in game steps) */
  minDirectionChangeInterval: number;
}

/**
 * Default configuration for Neural Network Actor.
 */
export const DEFAULT_NN_ACTOR_CONFIG: Partial<NNActorConfig> = {
  decisionThreshold: 0.1,
  useProbabilisticSelection: false,
  selectionTemperature: 1.0,
  minDirectionChangeInterval: 2,
};

/**
 * Neural Network Actor that uses trained neural networks to control snake movement.
 * Implements the IActor interface for seamless integration with the game engine.
 */
export class NNActor implements IActor {
  private config: NNActorConfig;
  private neuralNetwork: NeuralNetwork;
  private stateEncoder: StateEncoder;
  private lastActionTime: number = 0;
  private stepCounter: number = 0;
  private gameStartTime: number = 0;

  constructor(
    config: Partial<NNActorConfig> & {
      snakeIndex: number;
      neuralNetwork: NeuralNetwork;
    }
  ) {
    this.config = {
      ...DEFAULT_NN_ACTOR_CONFIG,
      encoderConfig: DEFAULT_ENCODER_CONFIG,
      ...config,
    } as NNActorConfig;

    this.neuralNetwork = config.neuralNetwork;
    this.stateEncoder = new StateEncoder(this.config.encoderConfig);

    this.validateConfiguration();
  }

  /**
   * Validates the actor configuration for consistency.
   */
  private validateConfiguration(): void {
    if (this.config.snakeIndex < 0) {
      throw new Error('Snake index must be non-negative');
    }

    if (this.neuralNetwork.getInputSize() !== 64) {
      throw new Error(
        `Neural network input size must be 64, got ${this.neuralNetwork.getInputSize()}`
      );
    }

    if (this.neuralNetwork.getOutputSize() !== 4) {
      throw new Error(
        `Neural network output size must be 4, got ${this.neuralNetwork.getOutputSize()}`
      );
    }

    if (
      this.config.decisionThreshold < 0 ||
      this.config.decisionThreshold > 1
    ) {
      throw new Error('Decision threshold must be between 0 and 1');
    }

    if (this.config.selectionTemperature <= 0) {
      throw new Error('Selection temperature must be positive');
    }
  }

  /**
   * Called when the game state changes. Makes movement decisions using the neural network.
   *
   * @param state Current game state
   * @returns Game input or null if no action needed
   */
  public onStateUpdate(state: IGameState): GameInput | null {
    try {
      // Initialize game start time if not set
      if (this.gameStartTime === 0) {
        this.gameStartTime = Date.now();
      }

      // Check if this actor's snake exists and is alive
      if (this.config.snakeIndex >= state.snakes.length) {
        return null; // Snake doesn't exist
      }

      const snake = state.snakes[this.config.snakeIndex];
      if (!snake) {
        return null; // Snake is dead or doesn't exist
      }

      // Increment step counter
      this.stepCounter++;

      // Check minimum direction change interval
      if (
        this.stepCounter - this.lastActionTime <
        this.config.minDirectionChangeInterval
      ) {
        return null; // Too soon to change direction
      }

      // Encode current game state
      const gameTime = Date.now() - this.gameStartTime;
      const encodedState = this.stateEncoder.encode(
        state,
        this.config.snakeIndex,
        gameTime
      );

      // Get neural network prediction
      const networkOutput = this.neuralNetwork.forward(encodedState);

      // Select action based on network output
      const selectedDirection = this.selectAction(networkOutput, snake.dir);

      // Check if we should change direction
      if (selectedDirection !== null && selectedDirection !== snake.dir) {
        // Prevent 180-degree turns (opposing directions sum to 0)
        if (selectedDirection + snake.dir === 0) {
          return null; // Invalid move, would cause immediate collision
        }

        this.lastActionTime = this.stepCounter;

        return {
          inputType: 'direction',
          dir: selectedDirection,
          snakeIdx: this.config.snakeIndex,
        };
      }

      return null; // No direction change needed
    } catch (error) {
      console.error('NNActor error:', error);
      return null; // Fail gracefully
    }
  }

  /**
   * Selects an action based on neural network output.
   *
   * @param networkOutput Raw output from neural network (4 values for UP, RIGHT, DOWN, LEFT)
   * @param currentDirection Current snake direction
   * @returns Selected direction or null if no change needed
   */
  private selectAction(
    networkOutput: number[],
    currentDirection: EDirection
  ): EDirection | null {
    if (networkOutput.length !== 4) {
      throw new Error(
        `Expected 4 network outputs, got ${networkOutput.length}`
      );
    }

    const directions = [
      EDirection.UP,
      EDirection.RIGHT,
      EDirection.DOWN,
      EDirection.LEFT,
    ];

    if (this.config.useProbabilisticSelection) {
      return this.selectActionProbabilistic(
        networkOutput,
        directions,
        currentDirection
      );
    } else {
      return this.selectActionDeterministic(
        networkOutput,
        directions,
        currentDirection
      );
    }
  }

  /**
   * Selects action deterministically (highest probability).
   */
  private selectActionDeterministic(
    networkOutput: number[],
    directions: EDirection[],
    currentDirection: EDirection
  ): EDirection | null {
    // Find the action with highest probability
    let maxValue = -Infinity;
    let bestDirection: EDirection | null = null;

    for (let i = 0; i < networkOutput.length; i++) {
      const direction = directions[i];
      const probability = networkOutput[i];

      // Skip if this would be a 180-degree turn
      if (direction + currentDirection === 0) {
        continue;
      }

      if (probability > maxValue) {
        maxValue = probability;
        bestDirection = direction;
      }
    }

    // Only change direction if the best action is significantly better than current
    if (bestDirection !== null && bestDirection !== currentDirection) {
      const currentDirectionIndex = directions.indexOf(currentDirection);
      const currentProbability =
        currentDirectionIndex >= 0 ? networkOutput[currentDirectionIndex] : 0;

      if (maxValue - currentProbability > this.config.decisionThreshold) {
        return bestDirection;
      }
    }

    return null; // Stay with current direction
  }

  /**
   * Selects action probabilistically based on output probabilities.
   */
  private selectActionProbabilistic(
    networkOutput: number[],
    directions: EDirection[],
    currentDirection: EDirection
  ): EDirection | null {
    // Apply temperature scaling
    const scaledOutput = networkOutput.map(
      value => value / this.config.selectionTemperature
    );

    // Filter out invalid directions (180-degree turns)
    const validDirections: {
      direction: EDirection;
      probability: number;
      index: number;
    }[] = [];

    for (let i = 0; i < scaledOutput.length; i++) {
      const direction = directions[i];

      // Skip if this would be a 180-degree turn
      if (direction + currentDirection === 0) {
        continue;
      }

      validDirections.push({
        direction,
        probability: Math.exp(scaledOutput[i]),
        index: i,
      });
    }

    if (validDirections.length === 0) {
      return null; // No valid directions
    }

    // Normalize probabilities
    const totalProbability = validDirections.reduce(
      (sum, item) => sum + item.probability,
      0
    );
    validDirections.forEach(item => {
      item.probability /= totalProbability;
    });

    // Select direction based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const item of validDirections) {
      cumulativeProbability += item.probability;
      if (random <= cumulativeProbability) {
        return item.direction;
      }
    }

    // Fallback to last valid direction
    return validDirections[validDirections.length - 1].direction;
  }

  /**
   * Resets the actor state (useful for new games).
   */
  public reset(): void {
    this.lastActionTime = 0;
    this.stepCounter = 0;
    this.gameStartTime = 0;
  }

  /**
   * Updates the actor configuration.
   */
  public updateConfig(newConfig: Partial<NNActorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.encoderConfig) {
      this.stateEncoder.updateConfig(newConfig.encoderConfig);
    }

    this.validateConfiguration();
  }

  /**
   * Gets the current actor configuration.
   */
  public getConfig(): NNActorConfig {
    return { ...this.config };
  }

  /**
   * Gets information about the neural network being used.
   */
  public getNetworkInfo(): {
    inputSize: number;
    outputSize: number;
    architecture: number[];
  } {
    const architecture = this.neuralNetwork.getArchitecture();
    const layerSizes = [architecture.layers[0].inputSize];

    for (const layer of architecture.layers) {
      layerSizes.push(layer.outputSize);
    }

    return {
      inputSize: this.neuralNetwork.getInputSize(),
      outputSize: this.neuralNetwork.getOutputSize(),
      architecture: layerSizes,
    };
  }

  /**
   * Gets the current snake index this actor is controlling.
   */
  public getSnakeIndex(): number {
    return this.config.snakeIndex;
  }

  /**
   * Creates a Neural Network Actor from weight file data.
   *
   * @param snakeIndex Index of snake to control
   * @param weightData JSON string containing neural network weights
   * @param config Optional configuration overrides
   * @returns NNActor instance or null if loading failed
   */
  public static fromWeights(
    snakeIndex: number,
    weightData: string,
    config?: Partial<NNActorConfig>
  ): NNActor | null {
    try {
      const weightLoader = new WeightLoader();
      const loadResult = weightLoader.loadFromJSON(weightData);

      if (!loadResult.isValid) {
        console.error(
          'Failed to load neural network weights:',
          loadResult.errors
        );
        return null;
      }

      if (loadResult.warnings.length > 0) {
        console.warn('Neural network weight warnings:', loadResult.warnings);
      }

      const neuralNetwork = new NeuralNetwork(loadResult.architecture);

      return new NNActor({
        snakeIndex,
        neuralNetwork,
        ...config,
      });
    } catch (error) {
      console.error('Error creating NNActor from weights:', error);
      return null;
    }
  }

  /**
   * Creates a Neural Network Actor with random weights for testing.
   *
   * @param snakeIndex Index of snake to control
   * @param config Optional configuration overrides
   * @returns NNActor instance with random weights
   */
  public static createRandom(
    snakeIndex: number,
    config?: Partial<NNActorConfig>
  ): NNActor {
    const neuralNetwork = NeuralNetwork.createRandom([64, 128, 64, 4], 1.0);

    return new NNActor({
      snakeIndex,
      neuralNetwork,
      ...config,
    });
  }
}
