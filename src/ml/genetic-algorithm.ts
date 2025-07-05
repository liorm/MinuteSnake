/**
 * Genetic algorithm implementation for neural network weight optimization.
 * Uses population-based evolution with crossover, mutation, and selection.
 */

import { NetworkArchitecture, NetworkLayer } from './neural-network';

/**
 * Individual in the genetic algorithm population.
 * Represents a complete neural network with weights and fitness score.
 */
export interface Individual {
  id: string;
  weights: NetworkArchitecture;
  fitness: number;
  generation: number;
}

/**
 * Configuration parameters for the genetic algorithm.
 */
export interface GeneticConfig {
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  weightRange: number;
  maxGenerations: number;
}

/**
 * Default genetic algorithm configuration.
 */
export const defaultGeneticConfig: GeneticConfig = {
  populationSize: 100,
  mutationRate: 0.1,
  crossoverRate: 0.7,
  elitismRate: 0.1,
  weightRange: 2.0,
  maxGenerations: 1000,
};

/**
 * Statistics for tracking genetic algorithm progress.
 */
export interface GenerationStats {
  generation: number;
  bestFitness: number;
  averageFitness: number;
  worstFitness: number;
  diversity: number;
}

/**
 * Genetic algorithm for evolving neural network weights.
 * Implements selection, crossover, mutation, and elitism strategies.
 */
export class GeneticAlgorithm {
  private config: GeneticConfig;
  private layerSizes: number[];
  private currentGeneration: number;
  private population: Individual[];
  private generationStats: GenerationStats[];
  private randomSeed: number;

  constructor(
    layerSizes: number[],
    config: Partial<GeneticConfig> = {},
    randomSeed?: number
  ) {
    this.config = { ...defaultGeneticConfig, ...config };
    this.layerSizes = layerSizes;
    this.currentGeneration = 0;
    this.population = [];
    this.generationStats = [];
    this.randomSeed = randomSeed || Date.now();

    this.validateConfig();
  }

  /**
   * Validates the genetic algorithm configuration.
   */
  private validateConfig(): void {
    if (this.config.populationSize < 4) {
      throw new Error('Population size must be at least 4');
    }
    if (this.config.mutationRate < 0 || this.config.mutationRate > 1) {
      throw new Error('Mutation rate must be between 0 and 1');
    }
    if (this.config.crossoverRate < 0 || this.config.crossoverRate > 1) {
      throw new Error('Crossover rate must be between 0 and 1');
    }
    if (this.config.elitismRate < 0 || this.config.elitismRate > 1) {
      throw new Error('Elitism rate must be between 0 and 1');
    }
    if (this.layerSizes.length < 2) {
      throw new Error('Neural network must have at least 2 layers');
    }
  }

  /**
   * Seeded random number generator for reproducible results.
   */
  private random(): number {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }

  /**
   * Initializes a random population of neural networks.
   */
  public initializePopulation(): Individual[] {
    this.population = [];
    this.currentGeneration = 0;

    for (let i = 0; i < this.config.populationSize; i++) {
      const individual: Individual = {
        id: `gen0_ind${i}`,
        weights: this.createRandomWeights(),
        fitness: 0,
        generation: 0,
      };
      this.population.push(individual);
    }

    return this.population;
  }

  /**
   * Creates random weights for a neural network architecture.
   */
  private createRandomWeights(): NetworkArchitecture {
    const layers: NetworkLayer[] = [];

    for (let i = 1; i < this.layerSizes.length; i++) {
      const inputSize = this.layerSizes[i - 1];
      const outputSize = this.layerSizes[i];

      const weights: number[][] = [];
      for (let j = 0; j < outputSize; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < inputSize; k++) {
          neuronWeights.push(
            (this.random() - 0.5) * 2 * this.config.weightRange
          );
        }
        weights.push(neuronWeights);
      }

      const biases: number[] = [];
      for (let j = 0; j < outputSize; j++) {
        biases.push((this.random() - 0.5) * 2 * this.config.weightRange);
      }

      layers.push({
        inputSize,
        outputSize,
        weights,
        biases,
      });
    }

    return { layers };
  }

  /**
   * Evolves the population for one generation.
   */
  public evolveGeneration(): Individual[] {
    if (this.population.length === 0) {
      throw new Error('Population must be initialized before evolution');
    }

    // Sort population by fitness (descending)
    this.population.sort((a, b) => b.fitness - a.fitness);

    // Calculate generation statistics
    this.calculateGenerationStats();

    // Create new generation
    const newPopulation: Individual[] = [];
    const eliteCount = Math.floor(
      this.config.populationSize * this.config.elitismRate
    );

    // Elite selection - keep best individuals
    for (let i = 0; i < eliteCount; i++) {
      const elite = this.copyIndividual(this.population[i]);
      elite.generation = this.currentGeneration + 1;
      elite.id = `gen${this.currentGeneration + 1}_elite${i}`;
      newPopulation.push(elite);
    }

    // Fill remaining population with offspring
    let offspringCount = 0;
    while (newPopulation.length < this.config.populationSize) {
      const parent1 = this.selectParent();
      const parent2 = this.selectParent();

      if (this.random() < this.config.crossoverRate) {
        const offspring = this.crossover(parent1, parent2);
        offspring.id = `gen${this.currentGeneration + 1}_off${offspringCount}`;
        offspring.generation = this.currentGeneration + 1;

        this.mutate(offspring);
        newPopulation.push(offspring);
        offspringCount++;
      } else {
        // If no crossover, add mutated copy of parent
        const offspring = this.copyIndividual(parent1);
        offspring.id = `gen${this.currentGeneration + 1}_mut${offspringCount}`;
        offspring.generation = this.currentGeneration + 1;

        this.mutate(offspring);
        newPopulation.push(offspring);
        offspringCount++;
      }
    }

    this.population = newPopulation;
    this.currentGeneration++;

    return this.population;
  }

  /**
   * Calculates and stores statistics for the current generation.
   */
  private calculateGenerationStats(): void {
    const fitnesses = this.population.map(ind => ind.fitness);
    const bestFitness = Math.max(...fitnesses);
    const worstFitness = Math.min(...fitnesses);
    const averageFitness =
      fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

    // Calculate diversity as standard deviation of fitness scores
    const variance =
      fitnesses.reduce((acc, fitness) => {
        return acc + Math.pow(fitness - averageFitness, 2);
      }, 0) / fitnesses.length;
    const diversity = Math.sqrt(variance);

    const stats: GenerationStats = {
      generation: this.currentGeneration,
      bestFitness,
      averageFitness,
      worstFitness,
      diversity,
    };

    this.generationStats.push(stats);
  }

  /**
   * Selects a parent using tournament selection.
   */
  private selectParent(): Individual {
    const tournamentSize = Math.max(
      2,
      Math.floor(this.config.populationSize * 0.05)
    );
    const tournament: Individual[] = [];

    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(this.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }

    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
  }

  /**
   * Performs crossover between two parents to create offspring.
   */
  private crossover(parent1: Individual, parent2: Individual): Individual {
    const offspring: Individual = {
      id: '',
      weights: { layers: [] },
      fitness: 0,
      generation: 0,
    };

    // Layer-wise crossover
    for (
      let layerIdx = 0;
      layerIdx < parent1.weights.layers.length;
      layerIdx++
    ) {
      const layer1 = parent1.weights.layers[layerIdx];
      const layer2 = parent2.weights.layers[layerIdx];

      const offspringLayer: NetworkLayer = {
        inputSize: layer1.inputSize,
        outputSize: layer1.outputSize,
        weights: [],
        biases: [],
      };

      // Crossover weights
      for (let i = 0; i < layer1.outputSize; i++) {
        const neuronWeights: number[] = [];
        for (let j = 0; j < layer1.inputSize; j++) {
          // Uniform crossover - randomly choose from either parent
          const weight =
            this.random() < 0.5 ? layer1.weights[i][j] : layer2.weights[i][j];
          neuronWeights.push(weight);
        }
        offspringLayer.weights.push(neuronWeights);
      }

      // Crossover biases
      for (let i = 0; i < layer1.outputSize; i++) {
        const bias = this.random() < 0.5 ? layer1.biases[i] : layer2.biases[i];
        offspringLayer.biases.push(bias);
      }

      offspring.weights.layers.push(offspringLayer);
    }

    return offspring;
  }

  /**
   * Applies mutation to an individual's weights.
   */
  private mutate(individual: Individual): void {
    for (const layer of individual.weights.layers) {
      // Mutate weights
      for (let i = 0; i < layer.weights.length; i++) {
        for (let j = 0; j < layer.weights[i].length; j++) {
          if (this.random() < this.config.mutationRate) {
            // Gaussian mutation
            const mutation =
              (this.random() - 0.5) * 2 * this.config.weightRange * 0.1;
            layer.weights[i][j] += mutation;

            // Clamp to weight range
            const maxWeight = this.config.weightRange;
            layer.weights[i][j] = Math.max(
              -maxWeight,
              Math.min(maxWeight, layer.weights[i][j])
            );
          }
        }
      }

      // Mutate biases
      for (let i = 0; i < layer.biases.length; i++) {
        if (this.random() < this.config.mutationRate) {
          const mutation =
            (this.random() - 0.5) * 2 * this.config.weightRange * 0.1;
          layer.biases[i] += mutation;

          // Clamp to weight range
          const maxWeight = this.config.weightRange;
          layer.biases[i] = Math.max(
            -maxWeight,
            Math.min(maxWeight, layer.biases[i])
          );
        }
      }
    }
  }

  /**
   * Creates a deep copy of an individual.
   */
  private copyIndividual(individual: Individual): Individual {
    return {
      id: individual.id,
      weights: JSON.parse(JSON.stringify(individual.weights)),
      fitness: individual.fitness,
      generation: individual.generation,
    };
  }

  /**
   * Gets the current population.
   */
  public getPopulation(): Individual[] {
    return this.population;
  }

  /**
   * Gets the best individual from the current population.
   */
  public getBestIndividual(): Individual | null {
    if (this.population.length === 0) {
      return null;
    }

    return this.population.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Gets statistics for all generations.
   */
  public getGenerationStats(): GenerationStats[] {
    return this.generationStats;
  }

  /**
   * Calculates and returns stats for the current population without evolving.
   */
  public calculateCurrentGenerationStats(): GenerationStats {
    // Sort population by fitness (descending) for accurate stats
    const sortedPop = [...this.population].sort(
      (a, b) => b.fitness - a.fitness
    );

    const fitnesses = sortedPop.map(ind => ind.fitness);
    const bestFitness = Math.max(...fitnesses);
    const worstFitness = Math.min(...fitnesses);
    const averageFitness =
      fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

    // Calculate diversity as standard deviation of fitness scores
    const variance =
      fitnesses.reduce((acc, fitness) => {
        return acc + Math.pow(fitness - averageFitness, 2);
      }, 0) / fitnesses.length;
    const diversity = Math.sqrt(variance);

    return {
      generation: this.currentGeneration,
      bestFitness,
      averageFitness,
      worstFitness,
      diversity,
    };
  }

  /**
   * Gets the current generation number.
   */
  public getCurrentGeneration(): number {
    return this.currentGeneration;
  }

  /**
   * Updates fitness scores for the entire population.
   */
  public updateFitness(fitnessScores: number[]): void {
    if (fitnessScores.length !== this.population.length) {
      throw new Error(
        `Fitness array length (${fitnessScores.length}) does not match population size (${this.population.length})`
      );
    }

    for (let i = 0; i < this.population.length; i++) {
      this.population[i].fitness = fitnessScores[i];
    }
  }

  /**
   * Checks if the algorithm should continue based on termination criteria.
   */
  public shouldContinue(): boolean {
    return this.currentGeneration < this.config.maxGenerations;
  }
}
