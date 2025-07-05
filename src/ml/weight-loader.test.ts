/**
 * Tests for the weight loader implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WeightLoader, 
  WeightFileFormat, 
  WeightMetadata,
  DEFAULT_WEIGHT_LOADER_CONFIG 
} from './weight-loader';
import { NetworkArchitecture } from './neural-network';

describe('WeightLoader', () => {
  let loader: WeightLoader;
  let validWeightData: WeightFileFormat;

  beforeEach(() => {
    loader = new WeightLoader();

    validWeightData = {
      version: '1.0',
      metadata: {
        architecture: [3, 4, 2],
        trainedGenerations: 100,
        fitnessScore: 0.85,
        trainingDate: '2024-01-01T00:00:00Z',
        trainingConfig: {
          populationSize: 50,
          mutationRate: 0.1,
          crossoverRate: 0.7,
        },
        description: 'Test neural network',
        authorInfo: 'Test Author',
      },
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
      ],
    };
  });

  describe('loadFromObject', () => {
    it('should load valid weight data successfully', () => {
      const result = loader.loadFromObject(validWeightData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.architecture.layers).toHaveLength(2);
      expect(result.metadata.architecture).toEqual([3, 4, 2]);
    });

    it('should validate architecture consistency', () => {
      const result = loader.loadFromObject(validWeightData);

      const layers = result.architecture.layers;
      expect(layers[0].inputSize).toBe(3);
      expect(layers[0].outputSize).toBe(4);
      expect(layers[1].inputSize).toBe(4);
      expect(layers[1].outputSize).toBe(2);
    });

    it('should preserve weight and bias values', () => {
      const result = loader.loadFromObject(validWeightData);

      const firstLayer = result.architecture.layers[0];
      expect(firstLayer.weights[0]).toEqual([0.1, 0.2, 0.3]);
      expect(firstLayer.biases).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    it('should deep copy weights to prevent mutation', () => {
      const result = loader.loadFromObject(validWeightData);

      // Modify original data
      validWeightData.layers[0].weights[0][0] = 999;
      validWeightData.layers[0].biases[0] = 999;

      // Loaded data should be unchanged
      expect(result.architecture.layers[0].weights[0][0]).toBe(0.1);
      expect(result.architecture.layers[0].biases[0]).toBe(0.1);
    });
  });

  describe('loadFromJSON', () => {
    it('should load valid JSON string successfully', () => {
      const jsonString = JSON.stringify(validWeightData);
      const result = loader.loadFromJSON(jsonString);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';
      const result = loader.loadFromJSON(invalidJson);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/Failed to parse JSON/);
    });

    it('should handle empty string', () => {
      const result = loader.loadFromJSON('');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('version validation', () => {
    it('should accept supported version', () => {
      const result = loader.loadFromObject(validWeightData);
      expect(result.isValid).toBe(true);
    });

    it('should reject unsupported version', () => {
      const invalidData = { ...validWeightData, version: '2.0' };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Unsupported version'))).toBe(true);
    });

    it('should reject missing version', () => {
      const invalidData = { ...validWeightData };
      delete (invalidData as Partial<WeightFileFormat>).version;
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Missing version'))).toBe(true);
    });
  });

  describe('metadata validation', () => {
    it('should require metadata field', () => {
      const invalidData = { ...validWeightData };
      delete (invalidData as Partial<WeightFileFormat>).metadata;
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Missing metadata'))).toBe(true);
    });

    it('should require architecture in metadata', () => {
      const invalidData = {
        ...validWeightData,
        metadata: { ...validWeightData.metadata },
      };
      delete (invalidData.metadata as Partial<WeightMetadata>).architecture;
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid or missing architecture'))).toBe(true);
    });

    it('should require at least 2 layers in architecture', () => {
      const invalidData = {
        ...validWeightData,
        metadata: {
          ...validWeightData.metadata,
          architecture: [3], // Only one layer
        },
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('at least 2 layers'))).toBe(true);
    });

    it('should require positive integer layer sizes', () => {
      const invalidData = {
        ...validWeightData,
        metadata: {
          ...validWeightData.metadata,
          architecture: [3, 0, 2], // Zero layer size
        },
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('positive integers'))).toBe(true);
    });
  });

  describe('layer validation', () => {
    it('should require layers to be an array', () => {
      const invalidData = { ...validWeightData, layers: 'not an array' as unknown as WeightFileFormat['layers'] };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Layers field must be an array'))).toBe(true);
    });

    it('should require at least one layer', () => {
      const invalidData = { ...validWeightData, layers: [] };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Must have at least one layer'))).toBe(true);
    });

    it('should validate layer structure', () => {
      const invalidData = {
        ...validWeightData,
        layers: [
          null as unknown as WeightFileFormat['layers'][0], // Invalid layer
        ],
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Must be an object'))).toBe(true);
    });

    it('should require all layer fields', () => {
      const invalidLayer = {
        inputSize: 3,
        outputSize: 4,
        weights: [[0.1, 0.2, 0.3]],
        // Missing biases
      };
      const invalidData = { ...validWeightData, layers: [invalidLayer as WeightFileFormat['layers'][0]] };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Missing required field'))).toBe(true);
    });
  });

  describe('dimension validation', () => {
    it('should validate weights array dimensions', () => {
      const invalidData = {
        ...validWeightData,
        layers: [
          {
            inputSize: 3,
            outputSize: 2, // But weights array has 4 neurons
            weights: [
              [0.1, 0.2, 0.3],
              [0.4, 0.5, 0.6],
              [0.7, 0.8, 0.9],
              [0.2, 0.4, 0.6],
            ],
            biases: [0.1, 0.2],
          },
        ],
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('weights array length'))).toBe(true);
    });

    it('should validate individual neuron weights dimensions', () => {
      const invalidData = {
        ...validWeightData,
        layers: [
          {
            inputSize: 3,
            outputSize: 2,
            weights: [
              [0.1, 0.2], // Should have 3 weights, not 2
              [0.4, 0.5, 0.6],
            ],
            biases: [0.1, 0.2],
          },
        ],
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('weights length'))).toBe(true);
    });

    it('should validate biases array dimensions', () => {
      const invalidData = {
        ...validWeightData,
        layers: [
          {
            inputSize: 3,
            outputSize: 2,
            weights: [
              [0.1, 0.2, 0.3],
              [0.4, 0.5, 0.6],
            ],
            biases: [0.1], // Should have 2 biases, not 1
          },
        ],
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('biases array length'))).toBe(true);
    });
  });

  describe('layer connectivity validation', () => {
    it('should validate layer connectivity', () => {
      const invalidData = {
        ...validWeightData,
        layers: [
          {
            inputSize: 3,
            outputSize: 4,
            weights: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9], [0.2, 0.4, 0.6]],
            biases: [0.1, 0.2, 0.3, 0.4],
          },
          {
            inputSize: 5, // Should be 4 to match previous layer output
            outputSize: 2,
            weights: [[0.1, 0.2, 0.3, 0.4, 0.5], [0.6, 0.7, 0.8, 0.9, 1.0]],
            biases: [0.1, 0.2],
          },
        ],
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Layer connectivity error'))).toBe(true);
    });
  });

  describe('weight value validation', () => {
    it('should validate finite weight values', () => {
      const invalidData = {
        ...validWeightData,
        layers: [
          {
            inputSize: 2,
            outputSize: 1,
            weights: [[0.1, Infinity]], // Invalid weight
            biases: [0.1],
          },
        ],
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('must be a finite number'))).toBe(true);
    });

    it('should validate finite bias values', () => {
      const invalidData = {
        ...validWeightData,
        layers: [
          {
            inputSize: 2,
            outputSize: 1,
            weights: [[0.1, 0.2]],
            biases: [NaN], // Invalid bias
          },
        ],
      };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('must be a finite number'))).toBe(true);
    });

    it('should handle large weight magnitudes based on config', () => {
      const strictLoader = new WeightLoader({ ...DEFAULT_WEIGHT_LOADER_CONFIG, maxWeightMagnitude: 1.0 });
      
      const dataWithLargeWeights = {
        ...validWeightData,
        layers: [
          {
            inputSize: 2,
            outputSize: 1,
            weights: [[0.1, 5.0]], // Exceeds magnitude limit
            biases: [0.1],
          },
        ],
      };
      
      const result = strictLoader.loadFromObject(dataWithLargeWeights);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds limit'))).toBe(true);
    });

    it('should generate warnings for large weights in non-strict mode', () => {
      const lenientLoader = new WeightLoader({ 
        ...DEFAULT_WEIGHT_LOADER_CONFIG, 
        strictValidation: false,
        maxWeightMagnitude: 1.0 
      });
      
      const dataWithLargeWeights = {
        ...validWeightData,
        metadata: {
          ...validWeightData.metadata,
          architecture: [2, 1],
        },
        layers: [
          {
            inputSize: 2,
            outputSize: 1,
            weights: [[0.1, 5.0]], // Exceeds magnitude limit
            biases: [0.1],
          },
        ],
      };
      
      const result = lenientLoader.loadFromObject(dataWithLargeWeights);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('large magnitude'))).toBe(true);
    });
  });

  describe('architecture consistency validation', () => {
    it('should detect architecture mismatch in strict mode', () => {
      const dataWithMismatch = {
        ...validWeightData,
        metadata: {
          ...validWeightData.metadata,
          architecture: [3, 5, 2], // Metadata says 5, but actual layer has 4
        },
      };
      
      const result = loader.loadFromObject(dataWithMismatch);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Architecture mismatch'))).toBe(true);
    });

    it('should generate warnings for architecture mismatch in lenient mode', () => {
      const lenientLoader = new WeightLoader({ 
        ...DEFAULT_WEIGHT_LOADER_CONFIG, 
        allowArchitectureMismatch: true 
      });
      
      const dataWithMismatch = {
        ...validWeightData,
        metadata: {
          ...validWeightData.metadata,
          architecture: [3, 5, 2], // Metadata says 5, but actual layer has 4
        },
      };
      
      const result = lenientLoader.loadFromObject(dataWithMismatch);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('Architecture mismatch'))).toBe(true);
    });
  });

  describe('saveToJSON', () => {
    it('should save architecture to valid JSON format', () => {
      const architecture: NetworkArchitecture = {
        layers: [
          {
            inputSize: 2,
            outputSize: 3,
            weights: [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]],
            biases: [0.1, 0.2, 0.3],
          },
        ],
      };

      const metadata: WeightMetadata = {
        architecture: [2, 3],
        description: 'Test save',
      };

      const jsonString = loader.saveToJSON(architecture, metadata);
      const parsed = JSON.parse(jsonString);

      expect(parsed.version).toBe('1.0');
      expect(parsed.metadata.architecture).toEqual([2, 3]);
      expect(parsed.layers).toHaveLength(1);
      expect(parsed.layers[0].weights).toEqual([[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]);
    });

    it('should create deep copies in saved data', () => {
      const architecture: NetworkArchitecture = {
        layers: [
          {
            inputSize: 2,
            outputSize: 1,
            weights: [[0.1, 0.2]],
            biases: [0.1],
          },
        ],
      };

      const metadata: WeightMetadata = {
        architecture: [2, 1],
      };

      const jsonString = loader.saveToJSON(architecture, metadata);
      
      // Modify original data
      architecture.layers[0].weights[0][0] = 999;
      architecture.layers[0].biases[0] = 999;

      // Saved JSON should be unchanged
      const parsed = JSON.parse(jsonString);
      expect(parsed.layers[0].weights[0][0]).toBe(0.1);
      expect(parsed.layers[0].biases[0]).toBe(0.1);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        strictValidation: false,
        normalizeWeights: true,
        maxWeightMagnitude: 0.5,
        allowArchitectureMismatch: true,
      };

      const customLoader = new WeightLoader(customConfig);
      const config = customLoader.getConfig();

      expect(config.strictValidation).toBe(false);
      expect(config.normalizeWeights).toBe(true);
      expect(config.maxWeightMagnitude).toBe(0.5);
      expect(config.allowArchitectureMismatch).toBe(true);
    });

    it('should update configuration', () => {
      loader.updateConfig({ maxWeightMagnitude: 5.0 });
      const config = loader.getConfig();

      expect(config.maxWeightMagnitude).toBe(5.0);
      expect(config.strictValidation).toBe(DEFAULT_WEIGHT_LOADER_CONFIG.strictValidation); // Unchanged
    });
  });

  describe('edge cases', () => {
    it('should handle empty layers array', () => {
      const invalidData = { ...validWeightData, layers: [] };
      const result = loader.loadFromObject(invalidData);

      expect(result.isValid).toBe(false);
    });

    it('should handle single layer network', () => {
      const singleLayerData = {
        ...validWeightData,
        metadata: {
          ...validWeightData.metadata,
          architecture: [2, 1],
        },
        layers: [
          {
            inputSize: 2,
            outputSize: 1,
            weights: [[0.1, 0.2]],
            biases: [0.1],
          },
        ],
      };

      const result = loader.loadFromObject(singleLayerData);
      expect(result.isValid).toBe(true);
    });

    it('should handle very large networks', () => {
      const largeLayerData = {
        ...validWeightData,
        metadata: {
          ...validWeightData.metadata,
          architecture: [100, 200, 50],
        },
        layers: [
          {
            inputSize: 100,
            outputSize: 200,
            weights: Array.from({ length: 200 }, () => Array.from({ length: 100 }, () => 0.1)),
            biases: Array.from({ length: 200 }, () => 0.1),
          },
          {
            inputSize: 200,
            outputSize: 50,
            weights: Array.from({ length: 50 }, () => Array.from({ length: 200 }, () => 0.1)),
            biases: Array.from({ length: 50 }, () => 0.1),
          },
        ],
      };

      const result = loader.loadFromObject(largeLayerData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('integration with actual weight files', () => {
    it('should load and validate the default weight file format', () => {
      const defaultWeightFormat: WeightFileFormat = {
        version: '1.0',
        metadata: {
          architecture: [64, 128, 64, 4],
          trainedGenerations: 0,
          fitnessScore: 0.0,
          description: 'Default weights',
        },
        layers: [
          {
            inputSize: 64,
            outputSize: 128,
            weights: Array.from({ length: 128 }, () => Array.from({ length: 64 }, () => 0.1)),
            biases: Array.from({ length: 128 }, () => 0.0),
          },
          {
            inputSize: 128,
            outputSize: 64,
            weights: Array.from({ length: 64 }, () => Array.from({ length: 128 }, () => 0.1)),
            biases: Array.from({ length: 64 }, () => 0.0),
          },
          {
            inputSize: 64,
            outputSize: 4,
            weights: Array.from({ length: 4 }, () => Array.from({ length: 64 }, () => 0.1)),
            biases: Array.from({ length: 4 }, () => 0.0),
          },
        ],
      };

      const result = loader.loadFromObject(defaultWeightFormat);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.architecture.layers).toHaveLength(3);
    });
  });
});