/**
 * Neural network implementation with forward propagation for the Snake AI.
 * Supports multi-layer architecture with configurable activation functions.
 */

/**
 * Represents a single layer in the neural network with weights and biases.
 */
export interface NetworkLayer {
  inputSize: number;
  outputSize: number;
  weights: number[][];  // weights[outputNeuron][inputNeuron]
  biases: number[];     // biases[outputNeuron]
}

/**
 * Complete neural network architecture definition.
 */
export interface NetworkArchitecture {
  layers: NetworkLayer[];
}

/**
 * Activation function type definition.
 */
export type ActivationFunction = (x: number) => number;

/**
 * Collection of common activation functions.
 */
export const ActivationFunctions = {
  relu: (x: number): number => Math.max(0, x),
  sigmoid: (x: number): number => 1 / (1 + Math.exp(-x)),
  tanh: (x: number): number => Math.tanh(x),
  linear: (x: number): number => x,
};

/**
 * Applies softmax activation to an array of values.
 * Used for the output layer to generate probability distribution.
 */
export function softmax(values: number[]): number[] {
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(v - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(exp => exp / sum);
}

/**
 * Neural network implementation with forward propagation.
 * Supports configurable layer architecture and activation functions.
 */
export class NeuralNetwork {
  private architecture: NetworkArchitecture;
  private hiddenActivation: ActivationFunction;
  private outputActivation: 'softmax' | 'linear';

  constructor(
    architecture: NetworkArchitecture,
    hiddenActivation: ActivationFunction = ActivationFunctions.relu,
    outputActivation: 'softmax' | 'linear' = 'softmax'
  ) {
    this.architecture = architecture;
    this.hiddenActivation = hiddenActivation;
    this.outputActivation = outputActivation;
    this.validateArchitecture();
  }

  /**
   * Validates that the network architecture is correctly structured.
   */
  private validateArchitecture(): void {
    if (this.architecture.layers.length === 0) {
      throw new Error('Neural network must have at least one layer');
    }

    for (let i = 1; i < this.architecture.layers.length; i++) {
      const prevLayer = this.architecture.layers[i - 1];
      const currentLayer = this.architecture.layers[i];
      
      if (prevLayer.outputSize !== currentLayer.inputSize) {
        throw new Error(
          `Layer size mismatch: layer ${i - 1} output (${prevLayer.outputSize}) ` +
          `does not match layer ${i} input (${currentLayer.inputSize})`
        );
      }
    }

    // Validate weights and biases dimensions
    this.architecture.layers.forEach((layer, layerIdx) => {
      if (layer.weights.length !== layer.outputSize) {
        throw new Error(`Layer ${layerIdx}: weights array length mismatch`);
      }
      
      layer.weights.forEach((neuronWeights, neuronIdx) => {
        if (neuronWeights.length !== layer.inputSize) {
          throw new Error(
            `Layer ${layerIdx}, neuron ${neuronIdx}: weights length mismatch`
          );
        }
      });

      if (layer.biases.length !== layer.outputSize) {
        throw new Error(`Layer ${layerIdx}: biases array length mismatch`);
      }
    });
  }

  /**
   * Performs forward propagation through the neural network.
   * 
   * @param input Input vector (must match first layer input size)
   * @returns Output vector from the network
   */
  public forward(input: number[]): number[] {
    if (input.length !== this.architecture.layers[0].inputSize) {
      throw new Error(
        `Input size mismatch: expected ${this.architecture.layers[0].inputSize}, ` +
        `got ${input.length}`
      );
    }

    let currentOutput = input;

    // Process through all layers
    for (let layerIdx = 0; layerIdx < this.architecture.layers.length; layerIdx++) {
      const layer = this.architecture.layers[layerIdx];
      const isOutputLayer = layerIdx === this.architecture.layers.length - 1;
      
      currentOutput = this.processLayer(layer, currentOutput, isOutputLayer);
    }

    return currentOutput;
  }

  /**
   * Processes a single layer of the neural network.
   */
  private processLayer(
    layer: NetworkLayer, 
    input: number[], 
    isOutputLayer: boolean
  ): number[] {
    const output: number[] = [];

    // Calculate each neuron's output
    for (let neuronIdx = 0; neuronIdx < layer.outputSize; neuronIdx++) {
      let sum = 0;
      
      // Weighted sum of inputs
      for (let inputIdx = 0; inputIdx < layer.inputSize; inputIdx++) {
        sum += input[inputIdx] * layer.weights[neuronIdx][inputIdx];
      }
      
      // Add bias
      sum += layer.biases[neuronIdx];
      
      output.push(sum);
    }

    // Apply activation function
    if (isOutputLayer && this.outputActivation === 'softmax') {
      return softmax(output);
    } else if (isOutputLayer && this.outputActivation === 'linear') {
      return output;
    } else {
      return output.map(this.hiddenActivation);
    }
  }

  /**
   * Gets the network architecture.
   */
  public getArchitecture(): NetworkArchitecture {
    return this.architecture;
  }

  /**
   * Gets the input size of the network (first layer input size).
   */
  public getInputSize(): number {
    return this.architecture.layers[0].inputSize;
  }

  /**
   * Gets the output size of the network (last layer output size).
   */
  public getOutputSize(): number {
    const lastLayer = this.architecture.layers[this.architecture.layers.length - 1];
    return lastLayer.outputSize;
  }

  /**
   * Creates a neural network with random weights for the given layer sizes.
   * Useful for initialization or testing.
   */
  public static createRandom(
    layerSizes: number[],
    weightRange: number = 1.0,
    randomSeed?: number
  ): NeuralNetwork {
    if (layerSizes.length < 2) {
      throw new Error('Neural network must have at least 2 layers (input and output)');
    }

    // Use seeded random if provided, otherwise use Math.random
    const random = randomSeed !== undefined 
      ? (() => {
          let seed = randomSeed;
          return (): number => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
          };
        })()
      : Math.random;

    const layers: NetworkLayer[] = [];

    for (let i = 1; i < layerSizes.length; i++) {
      const inputSize = layerSizes[i - 1];
      const outputSize = layerSizes[i];

      const weights: number[][] = [];
      for (let j = 0; j < outputSize; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < inputSize; k++) {
          neuronWeights.push((random() - 0.5) * 2 * weightRange);
        }
        weights.push(neuronWeights);
      }

      const biases: number[] = [];
      for (let j = 0; j < outputSize; j++) {
        biases.push((random() - 0.5) * 2 * weightRange);
      }

      layers.push({
        inputSize,
        outputSize,
        weights,
        biases,
      });
    }

    return new NeuralNetwork({ layers });
  }
}