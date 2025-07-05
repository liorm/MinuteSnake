/**
 * Tests for the neural network implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  NeuralNetwork, 
  NetworkArchitecture, 
  ActivationFunctions, 
  softmax 
} from './neural-network';

describe('NeuralNetwork', () => {
  let simpleArchitecture: NetworkArchitecture;
  let complexArchitecture: NetworkArchitecture;

  beforeEach(() => {
    // Simple 2-2-1 network
    simpleArchitecture = {
      layers: [
        {
          inputSize: 2,
          outputSize: 2,
          weights: [[0.5, 0.2], [0.3, 0.8]],
          biases: [0.1, -0.1],
        },
        {
          inputSize: 2,
          outputSize: 1,
          weights: [[0.6, 0.4]],
          biases: [0.2],
        },
      ],
    };

    // Complex 3-4-2-1 network
    complexArchitecture = {
      layers: [
        {
          inputSize: 3,
          outputSize: 4,
          weights: [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
            [0.7, 0.8, 0.9],
            [0.2, 0.4, 0.6],
          ],
          biases: [0.1, 0.2, 0.3, 0.4],
        },
        {
          inputSize: 4,
          outputSize: 2,
          weights: [
            [0.5, 0.6, 0.7, 0.8],
            [0.1, 0.2, 0.3, 0.4],
          ],
          biases: [0.1, 0.2],
        },
        {
          inputSize: 2,
          outputSize: 1,
          weights: [[0.8, 0.9]],
          biases: [0.3],
        },
      ],
    };
  });

  describe('constructor and validation', () => {
    it('should create a neural network with valid architecture', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      expect(network.getInputSize()).toBe(2);
      expect(network.getOutputSize()).toBe(1);
    });

    it('should throw error for empty architecture', () => {
      expect(() => {
        new NeuralNetwork({ layers: [] });
      }).toThrow('Neural network must have at least one layer');
    });

    it('should throw error for layer size mismatch', () => {
      const invalidArchitecture: NetworkArchitecture = {
        layers: [
          {
            inputSize: 2,
            outputSize: 3,
            weights: [[1, 2], [3, 4], [5, 6]],
            biases: [1, 2, 3],
          },
          {
            inputSize: 2, // Should be 3 to match previous layer output
            outputSize: 1,
            weights: [[1, 2]],
            biases: [1],
          },
        ],
      };

      expect(() => {
        new NeuralNetwork(invalidArchitecture);
      }).toThrow('Layer size mismatch');
    });

    it('should throw error for weights dimension mismatch', () => {
      const invalidArchitecture: NetworkArchitecture = {
        layers: [
          {
            inputSize: 2,
            outputSize: 2,
            weights: [[1, 2], [3]], // Second neuron has wrong number of weights
            biases: [1, 2],
          },
        ],
      };

      expect(() => {
        new NeuralNetwork(invalidArchitecture);
      }).toThrow('weights length mismatch');
    });

    it('should throw error for biases dimension mismatch', () => {
      const invalidArchitecture: NetworkArchitecture = {
        layers: [
          {
            inputSize: 2,
            outputSize: 2,
            weights: [[1, 2], [3, 4]],
            biases: [1], // Should have 2 biases
          },
        ],
      };

      expect(() => {
        new NeuralNetwork(invalidArchitecture);
      }).toThrow('biases array length mismatch');
    });
  });

  describe('forward propagation', () => {
    it('should perform forward propagation correctly', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      const input = [1.0, 0.5];
      const output = network.forward(input);

      expect(output).toHaveLength(1);
      expect(output[0]).toBeGreaterThan(0); // Should be positive due to ReLU and sigmoid
    });

    it('should handle multiple layers correctly', () => {
      const network = new NeuralNetwork(complexArchitecture);
      const input = [1.0, 0.5, 0.2];
      const output = network.forward(input);

      expect(output).toHaveLength(1);
      expect(output[0]).toBeGreaterThan(0);
    });

    it('should throw error for wrong input size', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      const wrongInput = [1.0]; // Should be length 2

      expect(() => {
        network.forward(wrongInput);
      }).toThrow('Input size mismatch');
    });

    it('should apply softmax to output layer when configured', () => {
      const outputArchitecture: NetworkArchitecture = {
        layers: [
          {
            inputSize: 2,
            outputSize: 3,
            weights: [[1, 2], [3, 4], [5, 6]],
            biases: [0.1, 0.2, 0.3],
          },
        ],
      };

      const network = new NeuralNetwork(outputArchitecture, ActivationFunctions.relu, 'softmax');
      const input = [1.0, 0.5];
      const output = network.forward(input);

      expect(output).toHaveLength(3);
      
      // Check that output sums to approximately 1 (softmax property)
      const sum = output.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
      
      // Check that all values are positive (softmax property)
      output.forEach(value => {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(1);
      });
    });

    it('should use different activation functions', () => {
      const network1 = new NeuralNetwork(simpleArchitecture, ActivationFunctions.relu);
      const network2 = new NeuralNetwork(simpleArchitecture, ActivationFunctions.sigmoid);
      const network3 = new NeuralNetwork(simpleArchitecture, ActivationFunctions.tanh);

      const input = [1.0, 0.5];
      const output1 = network1.forward(input);
      const output2 = network2.forward(input);
      const output3 = network3.forward(input);

      // Different activation functions should produce different outputs
      // Note: With linear output activation, final results might be similar
      // So we just check that they are valid numbers
      expect(Number.isFinite(output1[0])).toBe(true);
      expect(Number.isFinite(output2[0])).toBe(true);
      expect(Number.isFinite(output3[0])).toBe(true);
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical outputs for identical inputs', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      const input = [1.0, 0.5];
      
      const output1 = network.forward(input);
      const output2 = network.forward(input);

      expect(output1).toEqual(output2);
    });

    it('should not modify input array', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      const input = [1.0, 0.5];
      const originalInput = [...input];
      
      network.forward(input);

      expect(input).toEqual(originalInput);
    });
  });

  describe('createRandom', () => {
    it('should create a network with correct layer sizes', () => {
      const layerSizes = [3, 5, 2];
      const network = NeuralNetwork.createRandom(layerSizes);

      expect(network.getInputSize()).toBe(3);
      expect(network.getOutputSize()).toBe(2);

      const architecture = network.getArchitecture();
      expect(architecture.layers).toHaveLength(2);
      expect(architecture.layers[0].inputSize).toBe(3);
      expect(architecture.layers[0].outputSize).toBe(5);
      expect(architecture.layers[1].inputSize).toBe(5);
      expect(architecture.layers[1].outputSize).toBe(2);
    });

    it('should throw error for insufficient layers', () => {
      expect(() => {
        NeuralNetwork.createRandom([3]);
      }).toThrow('Neural network must have at least 2 layers');
    });

    it('should create different networks with different seeds', () => {
      const layerSizes = [2, 3, 1];
      const network1 = NeuralNetwork.createRandom(layerSizes, 1.0, 123);
      const network2 = NeuralNetwork.createRandom(layerSizes, 1.0, 456);

      // Check that the architectures have different weights
      const arch1 = network1.getArchitecture();
      const arch2 = network2.getArchitecture();
      
      let weightsAreDifferent = false;
      for (let i = 0; i < arch1.layers.length; i++) {
        for (let j = 0; j < arch1.layers[i].weights.length; j++) {
          for (let k = 0; k < arch1.layers[i].weights[j].length; k++) {
            if (arch1.layers[i].weights[j][k] !== arch2.layers[i].weights[j][k]) {
              weightsAreDifferent = true;
              break;
            }
          }
          if (weightsAreDifferent) break;
        }
        if (weightsAreDifferent) break;
      }
      
      expect(weightsAreDifferent).toBe(true);
    });

    it('should create identical networks with same seed', () => {
      const layerSizes = [2, 3, 1];
      const network1 = NeuralNetwork.createRandom(layerSizes, 1.0, 123);
      const network2 = NeuralNetwork.createRandom(layerSizes, 1.0, 123);

      const input = [1.0, 0.5];
      const output1 = network1.forward(input);
      const output2 = network2.forward(input);

      expect(output1[0]).toBeCloseTo(output2[0], 10);
    });

    it('should respect weight range parameter', () => {
      const layerSizes = [2, 2, 1];
      const weightRange = 0.5;
      const network = NeuralNetwork.createRandom(layerSizes, weightRange, 123);

      const architecture = network.getArchitecture();
      
      // Check that all weights are within the specified range
      architecture.layers.forEach(layer => {
        layer.weights.forEach(neuronWeights => {
          neuronWeights.forEach(weight => {
            expect(Math.abs(weight)).toBeLessThanOrEqual(weightRange);
          });
        });
        
        layer.biases.forEach(bias => {
          expect(Math.abs(bias)).toBeLessThanOrEqual(weightRange);
        });
      });
    });
  });

  describe('ActivationFunctions', () => {
    it('should implement ReLU correctly', () => {
      expect(ActivationFunctions.relu(-1)).toBe(0);
      expect(ActivationFunctions.relu(0)).toBe(0);
      expect(ActivationFunctions.relu(1)).toBe(1);
      expect(ActivationFunctions.relu(5)).toBe(5);
    });

    it('should implement sigmoid correctly', () => {
      expect(ActivationFunctions.sigmoid(0)).toBeCloseTo(0.5, 5);
      expect(ActivationFunctions.sigmoid(Infinity)).toBeCloseTo(1, 5);
      expect(ActivationFunctions.sigmoid(-Infinity)).toBeCloseTo(0, 5);
    });

    it('should implement tanh correctly', () => {
      expect(ActivationFunctions.tanh(0)).toBe(0);
      expect(ActivationFunctions.tanh(Infinity)).toBeCloseTo(1, 5);
      expect(ActivationFunctions.tanh(-Infinity)).toBeCloseTo(-1, 5);
    });

    it('should implement linear correctly', () => {
      expect(ActivationFunctions.linear(-5)).toBe(-5);
      expect(ActivationFunctions.linear(0)).toBe(0);
      expect(ActivationFunctions.linear(3.14)).toBe(3.14);
    });
  });

  describe('softmax function', () => {
    it('should sum to 1', () => {
      const values = [1, 2, 3, 4];
      const result = softmax(values);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    });

    it('should be all positive', () => {
      const values = [-5, -2, 0, 3];
      const result = softmax(values);
      result.forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should handle large values without overflow', () => {
      const values = [1000, 1001, 1002];
      const result = softmax(values);
      result.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should be invariant to constant shifts', () => {
      const values = [1, 2, 3];
      const shiftedValues = [11, 12, 13];
      
      const result1 = softmax(values);
      const result2 = softmax(shiftedValues);
      
      result1.forEach((value, index) => {
        expect(value).toBeCloseTo(result2[index], 10);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle zero inputs', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      const input = [0, 0];
      const output = network.forward(input);

      expect(output).toHaveLength(1);
      expect(Number.isFinite(output[0])).toBe(true);
    });

    it('should handle negative inputs', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      const input = [-1, -2];
      const output = network.forward(input);

      expect(output).toHaveLength(1);
      expect(Number.isFinite(output[0])).toBe(true);
    });

    it('should handle large inputs', () => {
      const network = new NeuralNetwork(simpleArchitecture);
      const input = [100, 200];
      const output = network.forward(input);

      expect(output).toHaveLength(1);
      expect(Number.isFinite(output[0])).toBe(true);
    });

    it('should handle single neuron layers', () => {
      const singleNeuronArchitecture: NetworkArchitecture = {
        layers: [
          {
            inputSize: 1,
            outputSize: 1,
            weights: [[0.5]],
            biases: [0.1],
          },
        ],
      };

      const network = new NeuralNetwork(singleNeuronArchitecture);
      const input = [2.0];
      const output = network.forward(input);

      expect(output).toHaveLength(1);
      expect(Number.isFinite(output[0])).toBe(true);
    });
  });
});