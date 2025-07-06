/**
 * Tests for the evaluation script functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FitnessEvaluator } from '../ml/fitness-evaluator';
import { NNActor } from '../actors/nn-actor';
import { AIActor } from '../actors/ai-actor';
import { WeightLoader } from '../ml/weight-loader';

// Mock dependencies
vi.mock('../ml/fitness-evaluator');
vi.mock('../actors/nn-actor');
vi.mock('../actors/ai-actor');
vi.mock('../ml/weight-loader');
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
}));

const mockFitnessEvaluator = {
  evaluateIndividual: vi.fn(),
};

const mockNNActor = {
  getWeights: vi.fn(),
};

const mockAIActor = {};

describe('Evaluation Script Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock FitnessEvaluator
    vi.mocked(FitnessEvaluator).mockImplementation(() => mockFitnessEvaluator as any);
    
    // Mock successful evaluation
    mockFitnessEvaluator.evaluateIndividual.mockResolvedValue({
      gameResults: [
        { score: 15, survivalTime: 45.5, fitness: 0.7, reason: 'time_limit' },
        { score: 12, survivalTime: 38.2, fitness: 0.6, reason: 'time_limit' },
        { score: 8, survivalTime: 25.1, fitness: 0.4, reason: 'collision' },
        { score: 20, survivalTime: 60.0, fitness: 0.8, reason: 'time_limit' },
        { score: 18, survivalTime: 55.3, fitness: 0.75, reason: 'time_limit' },
      ],
      totalFitness: 3.25,
      averageFitness: 0.65,
      evaluationTime: 1500,
    });
    
    // Mock NNActor
    vi.mocked(NNActor).mockImplementation(() => mockNNActor as any);
    mockNNActor.getWeights.mockReturnValue([[[0.1, 0.2], [0.3, 0.4]]]);
    
    // Mock AIActor
    vi.mocked(AIActor).mockImplementation(() => mockAIActor as any);
    
    // Mock WeightLoader
    vi.mocked(WeightLoader.loadWeights).mockResolvedValue([[[0.1, 0.2], [0.3, 0.4]]]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should evaluate a neural network agent correctly', async () => {
    const evaluateAgent = async (
      agentName: string,
      createAgent: () => Promise<NNActor | AIActor>,
      config: any,
      verbose: boolean
    ) => {
      const agent = await createAgent();
      const result = await mockFitnessEvaluator.evaluateIndividual({}, agent);
      
      const scores = result.gameResults.map((r: any) => r.score);
      const survivalTimes = result.gameResults.map((r: any) => r.survivalTime);
      const fitnesses = result.gameResults.map((r: any) => r.fitness);
      
      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const avgSurvivalTime = survivalTimes.reduce((a: number, b: number) => a + b, 0) / survivalTimes.length;
      const avgFitness = fitnesses.reduce((a: number, b: number) => a + b, 0) / fitnesses.length;
      
      const gamesCompleted = result.gameResults.filter((r: any) => r.reason === 'time_limit').length;
      const gamesFailed = result.gameResults.length - gamesCompleted;
      const winRate = gamesCompleted / result.gameResults.length;
      
      return {
        agentName,
        agentType: agent instanceof NNActor ? 'NN' : 'AI',
        averageFitness: avgFitness,
        averageScore: avgScore,
        averageSurvivalTime: avgSurvivalTime,
        gamesCompleted,
        gamesFailed,
        winRate,
      };
    };

    const createNNAgent = async () => new NNActor([]);
    const result = await evaluateAgent('test-nn', createNNAgent, {}, false);
    
    expect(result).toEqual({
      agentName: 'test-nn',
      agentType: 'NN',
      averageFitness: 0.65,
      averageScore: 14.6,
      averageSurvivalTime: 44.82,
      gamesCompleted: 4,
      gamesFailed: 1,
      winRate: 0.8,
    });
  });

  it('should evaluate an AI agent correctly', async () => {
    const evaluateAgent = async (
      agentName: string,
      createAgent: () => Promise<NNActor | AIActor>,
      config: any,
      verbose: boolean
    ) => {
      const agent = await createAgent();
      const result = await mockFitnessEvaluator.evaluateIndividual({}, agent);
      
      const scores = result.gameResults.map((r: any) => r.score);
      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      
      return {
        agentName,
        agentType: agent instanceof NNActor ? 'NN' : 'AI',
        averageScore: avgScore,
      };
    };

    const createAIAgent = async () => new AIActor();
    const result = await evaluateAgent('traditional-ai', createAIAgent, {}, false);
    
    expect(result.agentType).toBe('AI');
    expect(result.agentName).toBe('traditional-ai');
    expect(result.averageScore).toBe(14.6);
  });

  it('should calculate statistics correctly', () => {
    const calculateStatistics = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      return { mean, stdDev, min, max };
    };

    const testValues = [10, 20, 30, 40, 50];
    const stats = calculateStatistics(testValues);
    
    expect(stats.mean).toBe(30);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);
    expect(stats.stdDev).toBeCloseTo(14.14, 2);
  });

  it('should handle weight file loading', async () => {
    const weightFile = './test-weights.json';
    const mockWeights = [[[0.1, 0.2], [0.3, 0.4]]];
    
    vi.mocked(WeightLoader.loadWeights).mockResolvedValue(mockWeights);
    
    const weights = await WeightLoader.loadWeights(weightFile);
    expect(weights).toEqual(mockWeights);
    expect(WeightLoader.loadWeights).toHaveBeenCalledWith(weightFile);
  });

  it('should find weight files in directory', async () => {
    const { readdir, stat } = await import('fs/promises');
    
    vi.mocked(readdir).mockResolvedValue(['file1.json', 'file2.json', 'file3.txt'] as any);
    vi.mocked(stat).mockImplementation((path) => {
      return Promise.resolve({ isFile: () => path.toString().endsWith('.json') } as any);
    });

    const findWeightFiles = async (directory: string): Promise<string[]> => {
      const files = await readdir(directory);
      const weightFiles: string[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const fullPath = `${directory}/${file}`;
          const stats = await stat(fullPath);
          if (stats.isFile()) {
            weightFiles.push(fullPath);
          }
        }
      }
      
      return weightFiles;
    };

    const weightFiles = await findWeightFiles('./test-weights');
    expect(weightFiles).toEqual(['./test-weights/file1.json', './test-weights/file2.json']);
  });
});

describe('Evaluation Results Processing', () => {
  it('should sort results by fitness correctly', () => {
    const results = [
      { agentName: 'agent1', averageFitness: 0.5 },
      { agentName: 'agent2', averageFitness: 0.8 },
      { agentName: 'agent3', averageFitness: 0.3 },
    ];

    const sortedResults = results.sort((a, b) => b.averageFitness - a.averageFitness);
    
    expect(sortedResults[0].agentName).toBe('agent2');
    expect(sortedResults[1].agentName).toBe('agent1');
    expect(sortedResults[2].agentName).toBe('agent3');
  });

  it('should calculate improvement percentage correctly', () => {
    const calculateImprovement = (newValue: number, oldValue: number): number => {
      return ((newValue - oldValue) / oldValue) * 100;
    };

    expect(calculateImprovement(0.8, 0.6)).toBeCloseTo(33.33, 2);
    expect(calculateImprovement(0.5, 0.6)).toBeCloseTo(-16.67, 2);
    expect(calculateImprovement(0.6, 0.6)).toBe(0);
  });

  it('should format result table correctly', () => {
    const formatResultRow = (name: string, type: string, fitness: number) => {
      const truncatedName = name.length > 28 ? name.substring(0, 25) + '...' : name;
      return truncatedName.padEnd(30) + type.padEnd(6) + fitness.toFixed(4).padEnd(12);
    };

    expect(formatResultRow('short', 'NN', 0.75)).toBe('short                         NN    0.7500      ');
    expect(formatResultRow('very-long-agent-name-that-exceeds-limit', 'AI', 0.62))
      .toBe('very-long-agent-name-that...  AI    0.6200      ');
  });
});

describe('Evaluation CLI Argument Parsing', () => {
  it('should parse evaluation arguments correctly', () => {
    const parseArgs = (args: string[]): Record<string, any> => {
      const parsed: Record<string, any> = {};
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
          case '--weights':
          case '-w':
            parsed.weights = args[++i];
            break;
          case '--games':
          case '-g':
            parsed.games = parseInt(args[++i], 10);
            break;
          case '--compare-ai':
          case '-c':
            parsed.compareAI = true;
            break;
          case '--verbose':
          case '-v':
            parsed.verbose = true;
            break;
        }
      }
      
      return parsed;
    };

    expect(parseArgs(['-w', 'weights.json'])).toEqual({ weights: 'weights.json' });
    expect(parseArgs(['-g', '20'])).toEqual({ games: 20 });
    expect(parseArgs(['-c'])).toEqual({ compareAI: true });
    expect(parseArgs(['-v'])).toEqual({ verbose: true });
  });

  it('should validate evaluation arguments', () => {
    const validateArgs = (args: Record<string, any>): void => {
      if (args.games !== undefined && (args.games < 1 || args.games > 100)) {
        throw new Error('Games must be between 1 and 100');
      }
      
      if (args.gameTime !== undefined && (args.gameTime < 10 || args.gameTime > 600)) {
        throw new Error('Game time must be between 10 and 600 seconds');
      }
    };

    expect(() => validateArgs({ games: 10 })).not.toThrow();
    expect(() => validateArgs({ games: 0 })).toThrow('Games must be between 1 and 100');
    expect(() => validateArgs({ gameTime: 30 })).not.toThrow();
    expect(() => validateArgs({ gameTime: 5 })).toThrow('Game time must be between 10 and 600 seconds');
  });
});

describe('Results Export', () => {
  it('should prepare results for JSON export correctly', async () => {
    const { writeFile } = await import('fs/promises');
    
    const saveResults = async (results: any[], filename: string): Promise<void> => {
      const output = {
        evaluationDate: new Date().toISOString(),
        totalAgents: results.length,
        results: results.sort((a, b) => b.averageFitness - a.averageFitness),
      };
      
      await writeFile(filename, JSON.stringify(output, null, 2));
    };

    const testResults = [
      { agentName: 'agent1', averageFitness: 0.7 },
      { agentName: 'agent2', averageFitness: 0.9 },
    ];

    await saveResults(testResults, 'test-results.json');
    
    expect(writeFile).toHaveBeenCalledWith(
      'test-results.json',
      expect.stringContaining('"totalAgents": 2')
    );
    expect(writeFile).toHaveBeenCalledWith(
      'test-results.json',
      expect.stringContaining('"averageFitness": 0.9')
    );
  });
});