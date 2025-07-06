import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WeightManager } from './weight-manager';

describe('WeightManager', () => {
  let manager: WeightManager;
  let tempDir: string;

  beforeEach(() => {
    manager = new WeightManager();
    tempDir = path.join(process.cwd(), 'src', 'weights', 'test-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateWeightFile', () => {
    it('should validate a correct weight file', () => {
      const validWeights = {
        version: '1.0',
        metadata: {
          architecture: [64, 128, 64, 4],
          trainedGenerations: 100,
          fitnessScore: 0.75,
          trainingDate: '2024-01-01T00:00:00Z',
        },
        layers: [
          {
            inputSize: 64,
            outputSize: 128,
            weights: Array(128)
              .fill(0)
              .map(() => Array(64).fill(0.1)),
            biases: Array(128).fill(0.0),
          },
          {
            inputSize: 128,
            outputSize: 64,
            weights: Array(64)
              .fill(0)
              .map(() => Array(128).fill(0.1)),
            biases: Array(64).fill(0.0),
          },
          {
            inputSize: 64,
            outputSize: 4,
            weights: Array(4)
              .fill(0)
              .map(() => Array(64).fill(0.1)),
            biases: Array(4).fill(0.0),
          },
        ],
      };

      const testFile = path.join(tempDir, 'valid.json');
      fs.writeFileSync(testFile, JSON.stringify(validWeights));

      const result = manager.validateWeightFile(testFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata?.totalParameters).toBe(16836);
    });

    it('should detect invalid JSON format', () => {
      const testFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(testFile, 'invalid json content');

      const result = manager.validateWeightFile(testFile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid JSON format');
    });

    it('should detect missing layers', () => {
      const invalidWeights = {
        version: '1.0',
        metadata: {},
      };

      const testFile = path.join(tempDir, 'no-layers.json');
      fs.writeFileSync(testFile, JSON.stringify(invalidWeights));

      const result = manager.validateWeightFile(testFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing or invalid layers array');
    });

    it('should detect non-existent file', () => {
      const result = manager.validateWeightFile('/non/existent/file.json');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File does not exist');
    });

    it('should detect invalid weights structure', () => {
      const invalidWeights = {
        version: '1.0',
        layers: [
          {
            inputSize: 64,
            outputSize: 128,
            weights: 'invalid', // Should be array
            biases: Array(128).fill(0.0),
          },
        ],
      };

      const testFile = path.join(tempDir, 'invalid-weights.json');
      fs.writeFileSync(testFile, JSON.stringify(invalidWeights));

      const result = manager.validateWeightFile(testFile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Missing or invalid weights array');
    });

    it('should detect invalid bias structure', () => {
      const invalidWeights = {
        version: '1.0',
        layers: [
          {
            inputSize: 64,
            outputSize: 128,
            weights: Array(128)
              .fill(0)
              .map(() => Array(64).fill(0.1)),
            biases: 'invalid', // Should be array
          },
        ],
      };

      const testFile = path.join(tempDir, 'invalid-biases.json');
      fs.writeFileSync(testFile, JSON.stringify(invalidWeights));

      const result = manager.validateWeightFile(testFile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Missing or invalid biases array');
    });

    it('should detect NaN values in weights', () => {
      const invalidWeights = {
        version: '1.0',
        layers: [
          {
            inputSize: 2,
            outputSize: 2,
            weights: [
              [0.1, null],
              [0.2, 0.3],
            ],
            biases: [0.0, 0.0],
          },
        ],
      };

      const testFile = path.join(tempDir, 'nan-weights.json');
      fs.writeFileSync(testFile, JSON.stringify(invalidWeights));

      const result = manager.validateWeightFile(testFile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid weight value');
    });

    it('should detect invalid fitness score', () => {
      const invalidWeights = {
        version: '1.0',
        metadata: {
          fitnessScore: 1.5, // Should be between 0 and 1
        },
        layers: [
          {
            inputSize: 64,
            outputSize: 4,
            weights: Array(4)
              .fill(0)
              .map(() => Array(64).fill(0.1)),
            biases: Array(4).fill(0.0),
          },
        ],
      };

      const testFile = path.join(tempDir, 'invalid-fitness.json');
      fs.writeFileSync(testFile, JSON.stringify(invalidWeights));

      const result = manager.validateWeightFile(testFile);
      expect(result.warnings).toContain(
        'Fitness score should be between 0 and 1'
      );
    });
  });

  describe('compareWeightFiles', () => {
    it('should compare identical weight files', () => {
      const weights = {
        version: '1.0',
        layers: [
          {
            inputSize: 2,
            outputSize: 2,
            weights: [
              [0.1, 0.2],
              [0.3, 0.4],
            ],
            biases: [0.1, 0.2],
          },
        ],
      };

      const file1 = path.join(tempDir, 'weights1.json');
      const file2 = path.join(tempDir, 'weights2.json');
      fs.writeFileSync(file1, JSON.stringify(weights));
      fs.writeFileSync(file2, JSON.stringify(weights));

      const comparison = manager.compareWeightFiles(file1, file2);
      expect(comparison.similarity).toBe(1);
      expect(comparison.differenceStats.meanDifference).toBe(0);
      expect(comparison.differenceStats.maxDifference).toBe(0);
    });

    it('should compare different weight files', () => {
      const weights1 = {
        version: '1.0',
        layers: [
          {
            inputSize: 2,
            outputSize: 2,
            weights: [
              [0.1, 0.2],
              [0.3, 0.4],
            ],
            biases: [0.1, 0.2],
          },
        ],
      };

      const weights2 = {
        version: '1.0',
        layers: [
          {
            inputSize: 2,
            outputSize: 2,
            weights: [
              [0.2, 0.3],
              [0.4, 0.5],
            ],
            biases: [0.2, 0.3],
          },
        ],
      };

      const file1 = path.join(tempDir, 'weights1.json');
      const file2 = path.join(tempDir, 'weights2.json');
      fs.writeFileSync(file1, JSON.stringify(weights1));
      fs.writeFileSync(file2, JSON.stringify(weights2));

      const comparison = manager.compareWeightFiles(file1, file2);
      expect(comparison.similarity).toBeLessThan(1);
      expect(comparison.differenceStats.meanDifference).toBeGreaterThan(0);
    });
  });

  describe('getWeightInfo', () => {
    it('should extract weight file information', () => {
      const weights = {
        version: '1.0',
        metadata: {
          trainedGenerations: 100,
          fitnessScore: 0.75,
        },
        layers: [
          {
            inputSize: 64,
            outputSize: 4,
            weights: Array(4)
              .fill(0)
              .map(() => Array(64).fill(0.1)),
            biases: Array(4).fill(0.0),
          },
        ],
      };

      const testFile = path.join(tempDir, 'info-test.json');
      fs.writeFileSync(testFile, JSON.stringify(weights));

      const info = manager.getWeightInfo(testFile);
      expect(info.fileName).toBe('info-test.json');
      expect(info.version).toBe('1.0');
      expect(info.metadata?.trainedGenerations).toBe(100);
      expect(info.metadata?.fitnessScore).toBe(0.75);
      expect(info.architecture).toEqual([4]);
    });

    it('should handle invalid weight files', () => {
      const testFile = path.join(tempDir, 'invalid-info.json');
      fs.writeFileSync(testFile, 'invalid json');

      const info = manager.getWeightInfo(testFile);
      expect(info.fileName).toBe('invalid-info.json');
      expect(info.error).toContain('Failed to read file');
    });
  });

  describe('listWeightFiles', () => {
    it('should list JSON files in weights directory', () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'test1.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'test2.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'not json');

      // Mock the weights directory
      const originalWeightsDir = (manager as any).weightsDir;
      (manager as any).weightsDir = tempDir;

      const files = manager.listWeightFiles();
      expect(files).toHaveLength(2);
      expect(files.map(f => path.basename(f))).toEqual(
        expect.arrayContaining(['test1.json', 'test2.json'])
      );

      // Restore original directory
      (manager as any).weightsDir = originalWeightsDir;
    });
  });
});
