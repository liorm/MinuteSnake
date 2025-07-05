/**
 * Tests for the genetic algorithm implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeneticAlgorithm, defaultGeneticConfig } from './genetic-algorithm';

describe('GeneticAlgorithm', () => {
  let ga: GeneticAlgorithm;
  const layerSizes = [4, 8, 4, 2];
  const testConfig = {
    ...defaultGeneticConfig,
    populationSize: 10,
    maxGenerations: 5,
  };

  beforeEach(() => {
    ga = new GeneticAlgorithm(layerSizes, testConfig, 12345);
  });

  describe('constructor', () => {
    it('should create genetic algorithm with valid config', () => {
      expect(ga).toBeDefined();
      expect(ga.getCurrentGeneration()).toBe(0);
      expect(ga.getPopulation()).toHaveLength(0);
    });

    it('should throw error for invalid population size', () => {
      expect(() => {
        new GeneticAlgorithm(layerSizes, { ...testConfig, populationSize: 2 });
      }).toThrow('Population size must be at least 4');
    });

    it('should throw error for invalid mutation rate', () => {
      expect(() => {
        new GeneticAlgorithm(layerSizes, { ...testConfig, mutationRate: 1.5 });
      }).toThrow('Mutation rate must be between 0 and 1');
    });

    it('should throw error for invalid layer sizes', () => {
      expect(() => {
        new GeneticAlgorithm([4], testConfig);
      }).toThrow('Neural network must have at least 2 layers');
    });
  });

  describe('initializePopulation', () => {
    it('should create population of correct size', () => {
      const population = ga.initializePopulation();
      expect(population).toHaveLength(testConfig.populationSize);
    });

    it('should create individuals with correct structure', () => {
      const population = ga.initializePopulation();
      const individual = population[0];

      expect(individual.id).toMatch(/^gen0_ind\d+$/);
      expect(individual.generation).toBe(0);
      expect(individual.fitness).toBe(0);
      expect(individual.weights.layers).toHaveLength(3); // 4 layers = 3 weight matrices
    });

    it('should create individuals with correct weight dimensions', () => {
      const population = ga.initializePopulation();
      const individual = population[0];

      // Check first layer: 4 inputs -> 8 outputs
      const layer1 = individual.weights.layers[0];
      expect(layer1.inputSize).toBe(4);
      expect(layer1.outputSize).toBe(8);
      expect(layer1.weights).toHaveLength(8);
      expect(layer1.weights[0]).toHaveLength(4);
      expect(layer1.biases).toHaveLength(8);

      // Check last layer: 4 inputs -> 2 outputs
      const lastLayer = individual.weights.layers[2];
      expect(lastLayer.inputSize).toBe(4);
      expect(lastLayer.outputSize).toBe(2);
      expect(lastLayer.weights).toHaveLength(2);
      expect(lastLayer.weights[0]).toHaveLength(4);
      expect(lastLayer.biases).toHaveLength(2);
    });

    it('should create different individuals with same seed', () => {
      const population = ga.initializePopulation();
      const individual1 = population[0];
      const individual2 = population[1];

      // Should be different individuals
      expect(individual1.id).not.toBe(individual2.id);

      // Weights should be different (very unlikely to be identical)
      const weights1 = individual1.weights.layers[0].weights[0][0];
      const weights2 = individual2.weights.layers[0].weights[0][0];
      expect(weights1).not.toBe(weights2);
    });
  });

  describe('evolveGeneration', () => {
    it('should throw error if population not initialized', () => {
      expect(() => {
        ga.evolveGeneration();
      }).toThrow('Population must be initialized before evolution');
    });

    it('should evolve population and increment generation', () => {
      ga.initializePopulation();

      // Set some fitness values
      ga.updateFitness([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05]);

      const newPopulation = ga.evolveGeneration();

      expect(newPopulation).toHaveLength(testConfig.populationSize);
      expect(ga.getCurrentGeneration()).toBe(1);
    });

    it('should maintain population size after evolution', () => {
      ga.initializePopulation();
      ga.updateFitness([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05]);

      for (let i = 0; i < 3; i++) {
        const population = ga.evolveGeneration();
        expect(population).toHaveLength(testConfig.populationSize);
      }
    });

    it('should preserve elite individuals', () => {
      const population = ga.initializePopulation();
      const _originalBest = population[0];

      // Make first individual the best
      const fitnesses = Array(testConfig.populationSize).fill(0.1);
      fitnesses[0] = 0.9;
      ga.updateFitness(fitnesses);

      const newPopulation = ga.evolveGeneration();

      // Elite should be preserved (at least one individual with same fitness)
      const preservedElite = newPopulation.find(ind => ind.fitness === 0.9);
      expect(preservedElite).toBeDefined();
    });
  });

  describe('updateFitness', () => {
    it('should update fitness for all individuals', () => {
      const population = ga.initializePopulation();
      const fitnesses = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];

      ga.updateFitness(fitnesses);

      population.forEach((individual, index) => {
        expect(individual.fitness).toBe(fitnesses[index]);
      });
    });

    it('should throw error for mismatched array length', () => {
      ga.initializePopulation();

      expect(() => {
        ga.updateFitness([0.9, 0.8, 0.7]); // Too few values
      }).toThrow(
        'Fitness array length (3) does not match population size (10)'
      );
    });
  });

  describe('getBestIndividual', () => {
    it('should return null for empty population', () => {
      const best = ga.getBestIndividual();
      expect(best).toBeNull();
    });

    it('should return individual with highest fitness', () => {
      ga.initializePopulation();
      ga.updateFitness([0.5, 0.9, 0.3, 0.7, 0.1, 0.8, 0.2, 0.6, 0.4, 0.05]);

      const best = ga.getBestIndividual();
      expect(best).toBeDefined();
      expect(best!.fitness).toBe(0.9);
    });
  });

  describe('getGenerationStats', () => {
    it('should return empty array for no generations', () => {
      const stats = ga.getGenerationStats();
      expect(stats).toHaveLength(0);
    });

    it('should calculate correct statistics after evolution', () => {
      ga.initializePopulation();
      ga.updateFitness([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05]);

      ga.evolveGeneration();

      const stats = ga.getGenerationStats();
      expect(stats).toHaveLength(1);

      const genStats = stats[0];
      expect(genStats.generation).toBe(0);
      expect(genStats.bestFitness).toBe(0.9);
      expect(genStats.worstFitness).toBe(0.05);
      expect(genStats.averageFitness).toBeCloseTo(0.455, 2); // After evolution, the average changes due to new population
    });
  });

  describe('shouldContinue', () => {
    it('should return true when under max generations', () => {
      ga.initializePopulation();
      expect(ga.shouldContinue()).toBe(true);
    });

    it('should return false when max generations reached', () => {
      ga.initializePopulation();

      // Evolve to max generations
      for (let i = 0; i < testConfig.maxGenerations; i++) {
        ga.updateFitness(Array(testConfig.populationSize).fill(0.5));
        ga.evolveGeneration();
      }

      expect(ga.shouldContinue()).toBe(false);
    });
  });

  describe('crossover and mutation', () => {
    it('should produce offspring with valid network structure', () => {
      ga.initializePopulation();
      ga.updateFitness([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05]);

      const newPopulation = ga.evolveGeneration();

      // Check that all offspring have valid structure
      newPopulation.forEach(individual => {
        expect(individual.weights.layers).toHaveLength(3);
        individual.weights.layers.forEach((layer, layerIdx) => {
          expect(layer.inputSize).toBe(layerSizes[layerIdx]);
          expect(layer.outputSize).toBe(layerSizes[layerIdx + 1]);
          expect(layer.weights).toHaveLength(layer.outputSize);
          expect(layer.biases).toHaveLength(layer.outputSize);

          layer.weights.forEach(neuronWeights => {
            expect(neuronWeights).toHaveLength(layer.inputSize);
          });
        });
      });
    });

    it('should respect weight range constraints', () => {
      const config = { ...testConfig, weightRange: 1.0 };
      const constrainedGA = new GeneticAlgorithm(layerSizes, config, 12345);

      constrainedGA.initializePopulation();
      constrainedGA.updateFitness(Array(config.populationSize).fill(0.5));

      // Evolve several generations with high mutation rate
      const highMutationConfig = { ...config, mutationRate: 1.0 };
      const mutationGA = new GeneticAlgorithm(
        layerSizes,
        highMutationConfig,
        12345
      );
      mutationGA.initializePopulation();
      mutationGA.updateFitness(Array(config.populationSize).fill(0.5));

      const population = mutationGA.evolveGeneration();

      // Check that weights stay within bounds
      population.forEach(individual => {
        individual.weights.layers.forEach(layer => {
          layer.weights.forEach(neuronWeights => {
            neuronWeights.forEach(weight => {
              expect(weight).toBeGreaterThanOrEqual(-config.weightRange);
              expect(weight).toBeLessThanOrEqual(config.weightRange);
            });
          });

          layer.biases.forEach(bias => {
            expect(bias).toBeGreaterThanOrEqual(-config.weightRange);
            expect(bias).toBeLessThanOrEqual(config.weightRange);
          });
        });
      });
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical results with same seed', () => {
      const ga1 = new GeneticAlgorithm(layerSizes, testConfig, 42);
      const ga2 = new GeneticAlgorithm(layerSizes, testConfig, 42);

      const pop1 = ga1.initializePopulation();
      const pop2 = ga2.initializePopulation();

      // Should generate identical initial populations
      for (let i = 0; i < pop1.length; i++) {
        const ind1 = pop1[i];
        const ind2 = pop2[i];

        for (
          let layerIdx = 0;
          layerIdx < ind1.weights.layers.length;
          layerIdx++
        ) {
          const layer1 = ind1.weights.layers[layerIdx];
          const layer2 = ind2.weights.layers[layerIdx];

          for (
            let neuronIdx = 0;
            neuronIdx < layer1.weights.length;
            neuronIdx++
          ) {
            for (
              let weightIdx = 0;
              weightIdx < layer1.weights[neuronIdx].length;
              weightIdx++
            ) {
              expect(layer1.weights[neuronIdx][weightIdx]).toBe(
                layer2.weights[neuronIdx][weightIdx]
              );
            }
          }

          for (let biasIdx = 0; biasIdx < layer1.biases.length; biasIdx++) {
            expect(layer1.biases[biasIdx]).toBe(layer2.biases[biasIdx]);
          }
        }
      }
    });

    it('should produce different results with different seeds', () => {
      const ga1 = new GeneticAlgorithm(layerSizes, testConfig, 42);
      const ga2 = new GeneticAlgorithm(layerSizes, testConfig, 99);

      const pop1 = ga1.initializePopulation();
      const pop2 = ga2.initializePopulation();

      // Should generate different initial populations
      let foundDifference = false;
      for (let i = 0; i < pop1.length && !foundDifference; i++) {
        const layer1 = pop1[i].weights.layers[0];
        const layer2 = pop2[i].weights.layers[0];

        if (layer1.weights[0][0] !== layer2.weights[0][0]) {
          foundDifference = true;
        }
      }

      expect(foundDifference).toBe(true);
    });
  });
});
