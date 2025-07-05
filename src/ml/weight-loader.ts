/**
 * Weight loader system for loading neural network weights from JSON files.
 * Supports validation, versioning, and metadata handling.
 */

import { NetworkArchitecture, NetworkLayer } from './neural-network';

/**
 * Metadata about the trained neural network weights.
 */
export interface WeightMetadata {
  architecture: number[]; // Layer sizes [input, hidden1, hidden2, output]
  trainedGenerations?: number; // Number of training generations
  fitnessScore?: number; // Best fitness score achieved
  trainingDate?: string; // ISO timestamp of training completion
  trainingConfig?: {
    // Training configuration used
    populationSize?: number;
    mutationRate?: number;
    crossoverRate?: number;
    elitismRate?: number;
    gameTimeLimit?: number;
    gamesPerAgent?: number;
  };
  description?: string; // Human-readable description
  authorInfo?: string; // Information about who trained this model
}

/**
 * Layer data structure in the weight file format.
 */
export interface WeightLayerData {
  inputSize: number;
  outputSize: number;
  weights: number[][]; // weights[outputNeuron][inputNeuron]
  biases: number[]; // biases[outputNeuron]
}

/**
 * Complete weight file format structure.
 */
export interface WeightFileFormat {
  version: string;
  metadata: WeightMetadata;
  layers: WeightLayerData[];
}

/**
 * Result of weight loading operation with validation information.
 */
export interface WeightLoadResult {
  architecture: NetworkArchitecture;
  metadata: WeightMetadata;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration options for weight loading.
 */
export interface WeightLoaderConfig {
  /** Whether to validate weight dimensions strictly */
  strictValidation: boolean;
  /** Whether to normalize weights if they're outside expected range */
  normalizeWeights: boolean;
  /** Maximum allowed weight magnitude */
  maxWeightMagnitude: number;
  /** Whether to allow loading weights with different architecture */
  allowArchitectureMismatch: boolean;
}

/**
 * Default configuration for weight loading.
 */
export const DEFAULT_WEIGHT_LOADER_CONFIG: WeightLoaderConfig = {
  strictValidation: true,
  normalizeWeights: false,
  maxWeightMagnitude: 10.0,
  allowArchitectureMismatch: false,
};

/**
 * Weight loader class for handling neural network weight files.
 * Provides loading, validation, and error handling functionality.
 */
export class WeightLoader {
  private config: WeightLoaderConfig;

  constructor(config: WeightLoaderConfig = DEFAULT_WEIGHT_LOADER_CONFIG) {
    this.config = config;
  }

  /**
   * Loads neural network weights from a JSON string.
   *
   * @param jsonData JSON string containing weight data
   * @returns Weight load result with architecture and validation info
   */
  public loadFromJSON(jsonData: string): WeightLoadResult {
    const result: WeightLoadResult = {
      architecture: { layers: [] },
      metadata: { architecture: [] },
      isValid: false,
      errors: [],
      warnings: [],
    };

    try {
      const weightData: WeightFileFormat = JSON.parse(jsonData);
      return this.loadFromObject(weightData);
    } catch (error) {
      result.errors.push(
        `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Loads neural network weights from a parsed object.
   *
   * @param weightData Parsed weight file object
   * @returns Weight load result with architecture and validation info
   */
  public loadFromObject(weightData: WeightFileFormat): WeightLoadResult {
    const result: WeightLoadResult = {
      architecture: { layers: [] },
      metadata: { architecture: [] },
      isValid: false,
      errors: [],
      warnings: [],
    };

    // Validate file format version
    if (!this.validateVersion(weightData.version, result)) {
      return result;
    }

    // Validate metadata
    if (!this.validateMetadata(weightData.metadata, result)) {
      return result;
    }

    // Validate and convert layers
    if (!this.validateAndConvertLayers(weightData.layers, result)) {
      return result;
    }

    // Validate architecture consistency
    if (
      !this.validateArchitectureConsistency(
        weightData.metadata,
        result.architecture,
        result
      )
    ) {
      return result;
    }

    // Additional validations
    this.performAdditionalValidations(result);

    result.metadata = weightData.metadata;
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Loads weights from a file path (Node.js environment).
   * Note: This is a placeholder for file system integration.
   */
  public async loadFromFile(_filePath: string): Promise<WeightLoadResult> {
    try {
      // In a real implementation, this would use fs.readFile or similar
      // For now, this is a placeholder that would be implemented based on the runtime environment
      throw new Error(
        'File loading not implemented - use loadFromJSON with file contents'
      );
    } catch (error) {
      return {
        architecture: { layers: [] },
        metadata: { architecture: [] },
        isValid: false,
        errors: [
          `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Saves neural network weights to JSON format.
   *
   * @param architecture Network architecture to save
   * @param metadata Metadata about the training
   * @returns JSON string representation
   */
  public saveToJSON(
    architecture: NetworkArchitecture,
    metadata: WeightMetadata
  ): string {
    const layers: WeightLayerData[] = architecture.layers.map(layer => ({
      inputSize: layer.inputSize,
      outputSize: layer.outputSize,
      weights: layer.weights.map(neuronWeights => [...neuronWeights]), // Deep copy
      biases: [...layer.biases], // Deep copy
    }));

    const weightFile: WeightFileFormat = {
      version: '1.0',
      metadata: {
        ...metadata,
        architecture: this.extractArchitecture(architecture),
      },
      layers,
    };

    return JSON.stringify(weightFile, null, 2);
  }

  /**
   * Validates the file format version.
   */
  private validateVersion(version: string, result: WeightLoadResult): boolean {
    const supportedVersions = ['1.0'];

    if (!version) {
      result.errors.push('Missing version field');
      return false;
    }

    if (!supportedVersions.includes(version)) {
      result.errors.push(
        `Unsupported version: ${version}. Supported versions: ${supportedVersions.join(', ')}`
      );
      return false;
    }

    return true;
  }

  /**
   * Validates the metadata structure.
   */
  private validateMetadata(
    metadata: WeightMetadata,
    result: WeightLoadResult
  ): boolean {
    if (!metadata) {
      result.errors.push('Missing metadata field');
      return false;
    }

    if (!metadata.architecture || !Array.isArray(metadata.architecture)) {
      result.errors.push('Invalid or missing architecture in metadata');
      return false;
    }

    if (metadata.architecture.length < 2) {
      result.errors.push(
        'Architecture must have at least 2 layers (input and output)'
      );
      return false;
    }

    if (
      metadata.architecture.some(size => !Number.isInteger(size) || size <= 0)
    ) {
      result.errors.push('Architecture layer sizes must be positive integers');
      return false;
    }

    return true;
  }

  /**
   * Validates and converts layer data to NetworkLayer format.
   */
  private validateAndConvertLayers(
    layerData: WeightLayerData[],
    result: WeightLoadResult
  ): boolean {
    if (!Array.isArray(layerData)) {
      result.errors.push('Layers field must be an array');
      return false;
    }

    if (layerData.length === 0) {
      result.errors.push('Must have at least one layer');
      return false;
    }

    const layers: NetworkLayer[] = [];

    for (let i = 0; i < layerData.length; i++) {
      const layer = layerData[i];

      if (!this.validateLayerStructure(layer, i, result)) {
        return false;
      }

      if (!this.validateLayerDimensions(layer, i, result)) {
        return false;
      }

      if (!this.validateWeightValues(layer, i, result)) {
        return false;
      }

      layers.push({
        inputSize: layer.inputSize,
        outputSize: layer.outputSize,
        weights: layer.weights.map(neuronWeights => [...neuronWeights]), // Deep copy
        biases: [...layer.biases], // Deep copy
      });
    }

    // Validate layer connectivity
    if (!this.validateLayerConnectivity(layers, result)) {
      return false;
    }

    result.architecture.layers = layers;
    return true;
  }

  /**
   * Validates the basic structure of a layer.
   */
  private validateLayerStructure(
    layer: WeightLayerData,
    index: number,
    result: WeightLoadResult
  ): boolean {
    if (typeof layer !== 'object' || layer === null) {
      result.errors.push(`Layer ${index}: Must be an object`);
      return false;
    }

    const requiredFields = ['inputSize', 'outputSize', 'weights', 'biases'];
    for (const field of requiredFields) {
      if (!(field in layer)) {
        result.errors.push(`Layer ${index}: Missing required field '${field}'`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validates the dimensions of a layer.
   */
  private validateLayerDimensions(
    layer: WeightLayerData,
    index: number,
    result: WeightLoadResult
  ): boolean {
    // Validate size fields
    if (!Number.isInteger(layer.inputSize) || layer.inputSize <= 0) {
      result.errors.push(
        `Layer ${index}: inputSize must be a positive integer`
      );
      return false;
    }

    if (!Number.isInteger(layer.outputSize) || layer.outputSize <= 0) {
      result.errors.push(
        `Layer ${index}: outputSize must be a positive integer`
      );
      return false;
    }

    // Validate weights array structure
    if (!Array.isArray(layer.weights)) {
      result.errors.push(`Layer ${index}: weights must be an array`);
      return false;
    }

    if (layer.weights.length !== layer.outputSize) {
      result.errors.push(
        `Layer ${index}: weights array length (${layer.weights.length}) must match outputSize (${layer.outputSize})`
      );
      return false;
    }

    // Validate each neuron's weights
    for (let neuronIdx = 0; neuronIdx < layer.weights.length; neuronIdx++) {
      const neuronWeights = layer.weights[neuronIdx];

      if (!Array.isArray(neuronWeights)) {
        result.errors.push(
          `Layer ${index}, neuron ${neuronIdx}: weights must be an array`
        );
        return false;
      }

      if (neuronWeights.length !== layer.inputSize) {
        result.errors.push(
          `Layer ${index}, neuron ${neuronIdx}: weights length (${neuronWeights.length}) must match inputSize (${layer.inputSize})`
        );
        return false;
      }
    }

    // Validate biases array
    if (!Array.isArray(layer.biases)) {
      result.errors.push(`Layer ${index}: biases must be an array`);
      return false;
    }

    if (layer.biases.length !== layer.outputSize) {
      result.errors.push(
        `Layer ${index}: biases array length (${layer.biases.length}) must match outputSize (${layer.outputSize})`
      );
      return false;
    }

    return true;
  }

  /**
   * Validates weight and bias values.
   */
  private validateWeightValues(
    layer: WeightLayerData,
    index: number,
    result: WeightLoadResult
  ): boolean {
    // Check weights
    for (let neuronIdx = 0; neuronIdx < layer.weights.length; neuronIdx++) {
      const neuronWeights = layer.weights[neuronIdx];

      for (let weightIdx = 0; weightIdx < neuronWeights.length; weightIdx++) {
        const weight = neuronWeights[weightIdx];

        if (typeof weight !== 'number' || !isFinite(weight)) {
          result.errors.push(
            `Layer ${index}, neuron ${neuronIdx}, weight ${weightIdx}: must be a finite number`
          );
          return false;
        }

        if (Math.abs(weight) > this.config.maxWeightMagnitude) {
          if (this.config.strictValidation) {
            result.errors.push(
              `Layer ${index}, neuron ${neuronIdx}, weight ${weightIdx}: magnitude (${Math.abs(weight)}) exceeds limit (${this.config.maxWeightMagnitude})`
            );
            return false;
          } else {
            result.warnings.push(
              `Layer ${index}, neuron ${neuronIdx}, weight ${weightIdx}: large magnitude (${Math.abs(weight)})`
            );
          }
        }
      }
    }

    // Check biases
    for (let biasIdx = 0; biasIdx < layer.biases.length; biasIdx++) {
      const bias = layer.biases[biasIdx];

      if (typeof bias !== 'number' || !isFinite(bias)) {
        result.errors.push(
          `Layer ${index}, bias ${biasIdx}: must be a finite number`
        );
        return false;
      }

      if (Math.abs(bias) > this.config.maxWeightMagnitude) {
        if (this.config.strictValidation) {
          result.errors.push(
            `Layer ${index}, bias ${biasIdx}: magnitude (${Math.abs(bias)}) exceeds limit (${this.config.maxWeightMagnitude})`
          );
          return false;
        } else {
          result.warnings.push(
            `Layer ${index}, bias ${biasIdx}: large magnitude (${Math.abs(bias)})`
          );
        }
      }
    }

    return true;
  }

  /**
   * Validates that layers are properly connected.
   */
  private validateLayerConnectivity(
    layers: NetworkLayer[],
    result: WeightLoadResult
  ): boolean {
    for (let i = 1; i < layers.length; i++) {
      const prevLayer = layers[i - 1];
      const currentLayer = layers[i];

      if (prevLayer.outputSize !== currentLayer.inputSize) {
        result.errors.push(
          `Layer connectivity error: layer ${i - 1} output (${prevLayer.outputSize}) does not match layer ${i} input (${currentLayer.inputSize})`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Validates architecture consistency between metadata and actual layers.
   */
  private validateArchitectureConsistency(
    metadata: WeightMetadata,
    architecture: NetworkArchitecture,
    result: WeightLoadResult
  ): boolean {
    const actualArchitecture = this.extractArchitecture(architecture);
    const expectedArchitecture = metadata.architecture;

    if (actualArchitecture.length !== expectedArchitecture.length) {
      if (this.config.allowArchitectureMismatch) {
        result.warnings.push(
          `Architecture mismatch: expected ${expectedArchitecture.length} layers, got ${actualArchitecture.length}`
        );
      } else {
        result.errors.push(
          `Architecture mismatch: expected ${expectedArchitecture.length} layers, got ${actualArchitecture.length}`
        );
        return false;
      }
    }

    for (
      let i = 0;
      i < Math.min(actualArchitecture.length, expectedArchitecture.length);
      i++
    ) {
      if (actualArchitecture[i] !== expectedArchitecture[i]) {
        if (this.config.allowArchitectureMismatch) {
          result.warnings.push(
            `Architecture mismatch at layer ${i}: expected ${expectedArchitecture[i]}, got ${actualArchitecture[i]}`
          );
        } else {
          result.errors.push(
            `Architecture mismatch at layer ${i}: expected ${expectedArchitecture[i]}, got ${actualArchitecture[i]}`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Performs additional validations and optimizations.
   */
  private performAdditionalValidations(result: WeightLoadResult): void {
    // Check for potential issues
    const layers = result.architecture.layers;

    // Check for dead neurons (all weights near zero)
    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];

      for (let neuronIdx = 0; neuronIdx < layer.outputSize; neuronIdx++) {
        const weights = layer.weights[neuronIdx];
        const bias = layer.biases[neuronIdx];

        const maxWeight = Math.max(...weights.map(Math.abs));
        const totalMagnitude = Math.abs(bias) + maxWeight;

        if (totalMagnitude < 1e-6) {
          result.warnings.push(
            `Layer ${layerIdx}, neuron ${neuronIdx}: appears to be dead (very small weights and bias)`
          );
        }
      }
    }

    // Normalize weights if requested
    if (this.config.normalizeWeights) {
      this.normalizeArchitectureWeights(result.architecture);
      result.warnings.push('Weights have been normalized');
    }
  }

  /**
   * Normalizes weights in the architecture to prevent extreme values.
   */
  private normalizeArchitectureWeights(
    architecture: NetworkArchitecture
  ): void {
    for (const layer of architecture.layers) {
      for (let neuronIdx = 0; neuronIdx < layer.outputSize; neuronIdx++) {
        const weights = layer.weights[neuronIdx];

        // Find max weight magnitude for this neuron
        const maxMagnitude = Math.max(...weights.map(Math.abs));

        if (maxMagnitude > this.config.maxWeightMagnitude) {
          const scale = this.config.maxWeightMagnitude / maxMagnitude;

          // Scale weights
          for (let i = 0; i < weights.length; i++) {
            weights[i] *= scale;
          }

          // Scale bias
          layer.biases[neuronIdx] *= scale;
        }
      }
    }
  }

  /**
   * Extracts layer size array from architecture.
   */
  private extractArchitecture(architecture: NetworkArchitecture): number[] {
    if (architecture.layers.length === 0) return [];

    const sizes = [architecture.layers[0].inputSize];
    for (const layer of architecture.layers) {
      sizes.push(layer.outputSize);
    }

    return sizes;
  }

  /**
   * Updates the loader configuration.
   */
  public updateConfig(newConfig: Partial<WeightLoaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current loader configuration.
   */
  public getConfig(): WeightLoaderConfig {
    return { ...this.config };
  }
}
