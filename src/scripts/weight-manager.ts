#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

interface WeightValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    architecture: number[];
    totalParameters: number;
    trainingGenerations?: number;
    fitnessScore?: number;
    trainingDate?: string;
  };
}

interface WeightComparison {
  file1: string;
  file2: string;
  similarity: number;
  differenceStats: {
    meanDifference: number;
    maxDifference: number;
    standardDeviation: number;
  };
}

class WeightManager {
  private weightsDir: string;

  constructor() {
    this.weightsDir = path.join(process.cwd(), 'src', 'weights');
  }

  /**
   * Validate a weight file format and structure
   */
  validateWeightFile(filePath: string): WeightValidationResult {
    const result: WeightValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        result.isValid = false;
        result.errors.push(`File does not exist: ${filePath}`);
        return result;
      }

      // Parse JSON
      const content = fs.readFileSync(filePath, 'utf8');
      let weightData: {
        version?: string;
        layers?: unknown[];
        metadata?: Record<string, unknown>;
      };
      try {
        weightData = JSON.parse(content);
      } catch (error) {
        result.isValid = false;
        result.errors.push(`Invalid JSON format: ${(error as Error).message}`);
        return result;
      }

      // Validate structure
      if (!weightData.version) {
        result.warnings.push('Missing version field');
      }

      if (!weightData.layers || !Array.isArray(weightData.layers)) {
        result.isValid = false;
        result.errors.push('Missing or invalid layers array');
        return result;
      }

      // Validate layers
      const expectedSizes = [64, 128, 64, 4]; // Standard architecture
      if (weightData.layers.length !== expectedSizes.length - 1) {
        result.warnings.push(
          `Expected ${expectedSizes.length - 1} layers, found ${weightData.layers.length}`
        );
      }

      let totalParameters = 0;
      for (let i = 0; i < weightData.layers.length; i++) {
        const layer = weightData.layers[i];

        if (!layer.weights || !Array.isArray(layer.weights)) {
          result.isValid = false;
          result.errors.push(`Layer ${i}: Missing or invalid weights array`);
          continue;
        }

        if (!layer.biases || !Array.isArray(layer.biases)) {
          result.isValid = false;
          result.errors.push(`Layer ${i}: Missing or invalid biases array`);
          continue;
        }

        // Check dimensions
        const inputSize = layer.inputSize || layer.weights[0]?.length || 0;
        const outputSize = layer.outputSize || layer.weights.length || 0;

        if (layer.weights.length !== outputSize) {
          result.isValid = false;
          result.errors.push(`Layer ${i}: Weights array size mismatch`);
        }

        if (layer.biases.length !== outputSize) {
          result.isValid = false;
          result.errors.push(`Layer ${i}: Biases array size mismatch`);
        }

        // Check for NaN or infinite values
        for (let j = 0; j < layer.weights.length; j++) {
          if (!Array.isArray(layer.weights[j])) continue;
          for (let k = 0; k < layer.weights[j].length; k++) {
            if (!isFinite(layer.weights[j][k])) {
              result.isValid = false;
              result.errors.push(
                `Layer ${i}: Invalid weight value at [${j}][${k}]`
              );
            }
          }
        }

        for (let j = 0; j < layer.biases.length; j++) {
          if (!isFinite(layer.biases[j])) {
            result.isValid = false;
            result.errors.push(`Layer ${i}: Invalid bias value at [${j}]`);
          }
        }

        totalParameters += inputSize * outputSize + outputSize;
      }

      // Set metadata
      result.metadata = {
        architecture: [
          expectedSizes[0],
          ...weightData.layers.map(
            (l: { outputSize?: number; weights: number[][] }) =>
              l.outputSize || l.weights.length
          ),
        ],
        totalParameters,
        trainingGenerations: weightData.metadata?.trainedGenerations,
        fitnessScore: weightData.metadata?.fitnessScore,
        trainingDate: weightData.metadata?.trainingDate,
      };

      // Validate metadata if present
      if (weightData.metadata) {
        if (
          weightData.metadata.fitnessScore &&
          (weightData.metadata.fitnessScore < 0 ||
            weightData.metadata.fitnessScore > 1)
        ) {
          result.warnings.push('Fitness score should be between 0 and 1');
        }

        if (weightData.metadata.trainingDate) {
          const date = new Date(weightData.metadata.trainingDate);
          if (isNaN(date.getTime())) {
            result.warnings.push('Invalid training date format');
          }
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Compare two weight files and calculate similarity
   */
  compareWeightFiles(file1: string, file2: string): WeightComparison {
    try {
      const content1 = fs.readFileSync(file1, 'utf8');
      const content2 = fs.readFileSync(file2, 'utf8');
      const weights1 = JSON.parse(content1);
      const weights2 = JSON.parse(content2);

      const differences: number[] = [];

      // Compare all weights and biases
      for (
        let layerIndex = 0;
        layerIndex < weights1.layers.length;
        layerIndex++
      ) {
        const layer1 = weights1.layers[layerIndex];
        const layer2 = weights2.layers[layerIndex];

        // Compare weights
        if (layer1.weights && layer2.weights) {
          for (let i = 0; i < layer1.weights.length; i++) {
            if (layer1.weights[i] && layer2.weights[i]) {
              for (let j = 0; j < layer1.weights[i].length; j++) {
                differences.push(
                  Math.abs(layer1.weights[i][j] - layer2.weights[i][j])
                );
              }
            }
          }
        }

        // Compare biases
        if (layer1.biases && layer2.biases) {
          for (let i = 0; i < layer1.biases.length; i++) {
            differences.push(Math.abs(layer1.biases[i] - layer2.biases[i]));
          }
        }
      }

      const meanDifference =
        differences.reduce((a, b) => a + b, 0) / differences.length;
      const maxDifference = Math.max(...differences);
      const variance =
        differences.reduce((a, b) => a + Math.pow(b - meanDifference, 2), 0) /
        differences.length;
      const standardDeviation = Math.sqrt(variance);

      // Calculate similarity (0 = identical, 1 = completely different)
      const similarity = 1 - Math.min(meanDifference, 1);

      return {
        file1,
        file2,
        similarity,
        differenceStats: {
          meanDifference,
          maxDifference,
          standardDeviation,
        },
      };
    } catch (error) {
      throw new Error(`Failed to compare files: ${(error as Error).message}`);
    }
  }

  /**
   * List all weight files in the weights directory
   */
  listWeightFiles(): string[] {
    if (!fs.existsSync(this.weightsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.weightsDir)
      .filter((file: string) => file.endsWith('.json'))
      .map((file: string) => path.join(this.weightsDir, file));
  }

  /**
   * Get weight file information
   */
  getWeightInfo(filePath: string): {
    fileName: string;
    version?: string;
    metadata?: Record<string, unknown>;
    architecture?: number[];
    fileSize?: number;
    lastModified?: Date;
    error?: string;
  } {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      return {
        fileName: path.basename(filePath),
        version: data.version || 'Unknown',
        metadata: data.metadata || {},
        architecture: data.layers
          ? data.layers.map(
              (l: { outputSize?: number; weights: number[][] }) =>
                l.outputSize || l.weights.length
            )
          : [],
        fileSize: fs.statSync(filePath).size,
        lastModified: fs.statSync(filePath).mtime,
      };
    } catch (error) {
      return {
        fileName: path.basename(filePath),
        error: `Failed to read file: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Archive old weight files
   */
  archiveWeights(archiveName: string): void {
    const archiveDir = path.join(this.weightsDir, 'archives', archiveName);

    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const weightFiles = this.listWeightFiles();

    weightFiles.forEach(file => {
      const fileName = path.basename(file);
      const archivePath = path.join(archiveDir, fileName);

      if (fileName !== 'default.json') {
        // Keep default.json
        fs.copyFileSync(file, archivePath);
        fs.unlinkSync(file);
      }
    });

    console.log(
      `Archived ${weightFiles.length} weight files to: ${archiveDir}`
    );
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new WeightManager();

  switch (command) {
    case 'validate': {
      if (args.length < 2) {
        console.log('Usage: npm run weight-manager validate <file-path>');
        process.exit(1);
      }

      const filePath = args[1];
      const result = manager.validateWeightFile(filePath);

      console.log(`\n📊 Weight File Validation: ${path.basename(filePath)}`);
      console.log(`Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);

      if (result.metadata) {
        console.log(`\nMetadata:`);
        console.log(
          `  Architecture: [${result.metadata.architecture.join(', ')}]`
        );
        console.log(
          `  Total Parameters: ${result.metadata.totalParameters.toLocaleString()}`
        );
        if (result.metadata.trainingGenerations) {
          console.log(
            `  Training Generations: ${result.metadata.trainingGenerations}`
          );
        }
        if (result.metadata.fitnessScore) {
          console.log(
            `  Fitness Score: ${result.metadata.fitnessScore.toFixed(3)}`
          );
        }
        if (result.metadata.trainingDate) {
          console.log(`  Training Date: ${result.metadata.trainingDate}`);
        }
      }

      if (result.errors.length > 0) {
        console.log(`\n❌ Errors:`);
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

      if (result.warnings.length > 0) {
        console.log(`\n⚠️  Warnings:`);
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      process.exit(result.isValid ? 0 : 1);
    }

    case 'compare': {
      if (args.length < 3) {
        console.log('Usage: npm run weight-manager compare <file1> <file2>');
        process.exit(1);
      }

      try {
        const comparison = manager.compareWeightFiles(args[1], args[2]);

        console.log(`\n🔍 Weight File Comparison`);
        console.log(`File 1: ${path.basename(comparison.file1)}`);
        console.log(`File 2: ${path.basename(comparison.file2)}`);
        console.log(`Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
        console.log(`\nDifference Statistics:`);
        console.log(
          `  Mean Difference: ${comparison.differenceStats.meanDifference.toFixed(4)}`
        );
        console.log(
          `  Max Difference: ${comparison.differenceStats.maxDifference.toFixed(4)}`
        );
        console.log(
          `  Standard Deviation: ${comparison.differenceStats.standardDeviation.toFixed(4)}`
        );
      } catch (error) {
        console.error(`Error comparing files: ${(error as Error).message}`);
        process.exit(1);
      }

      break;
    }

    case 'list': {
      const weightFiles = manager.listWeightFiles();

      console.log(`\n📁 Weight Files (${weightFiles.length} found):`);
      weightFiles.forEach(file => {
        const info = manager.getWeightInfo(file);
        if (info.error) {
          console.log(`  ❌ ${info.fileName}: ${info.error}`);
        } else {
          console.log(`  📄 ${info.fileName}`);
          console.log(`     Version: ${info.version}`);
          if (info.architecture) {
            console.log(`     Architecture: [${info.architecture.join(', ')}]`);
          }
          if (info.fileSize) {
            console.log(`     Size: ${(info.fileSize / 1024).toFixed(1)} KB`);
          }
          if (info.lastModified) {
            console.log(
              `     Modified: ${info.lastModified.toISOString().split('T')[0]}`
            );
          }
          if (
            info.metadata &&
            typeof info.metadata === 'object' &&
            'fitnessScore' in info.metadata
          ) {
            console.log(
              `     Fitness: ${(info.metadata.fitnessScore as number).toFixed(3)}`
            );
          }
        }
      });

      break;
    }

    case 'archive': {
      if (args.length < 2) {
        console.log('Usage: npm run weight-manager archive <archive-name>');
        process.exit(1);
      }

      manager.archiveWeights(args[1]);
      break;
    }

    default:
      console.log('MinuteSnake Weight Manager');
      console.log('');
      console.log('Commands:');
      console.log(
        '  validate <file>     Validate weight file format and structure'
      );
      console.log('  compare <f1> <f2>   Compare two weight files');
      console.log(
        '  list                List all weight files with information'
      );
      console.log('  archive <name>      Archive current weight files');
      console.log('');
      console.log('Examples:');
      console.log(
        '  npm run weight-manager validate src/weights/my_agent.json'
      );
      console.log(
        '  npm run weight-manager compare src/weights/agent1.json src/weights/agent2.json'
      );
      console.log('  npm run weight-manager list');
      console.log('  npm run weight-manager archive "backup_2024-01-01"');

      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { WeightManager };
