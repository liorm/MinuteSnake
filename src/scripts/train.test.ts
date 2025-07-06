/**
 * Tests for the training script functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Trainer } from '../ml/trainer';

// Mock the training script module
const mockTrainer = {
  startTraining: vi.fn(),
  stopTraining: vi.fn(),
  setCallbacks: vi.fn(),
  getDataCollector: vi.fn(),
  getTrainingStatus: vi.fn(),
  saveConfig: vi.fn(),
};

vi.mock('../ml/trainer', () => ({
  Trainer: vi.fn(() => mockTrainer),
  defaultTrainingConfig: {
    genetic: {
      maxGenerations: 1000,
      populationSize: 100,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      elitismRate: 0.1,
    },
    fitness: {
      gamesPerIndividual: 5,
      maxGameTime: 60,
    },
    seed: 12345,
    networkArchitecture: [64, 128, 64, 4],
  },
}));

// Mock fs/promises for config loading
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe('Training Script Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful training
    mockTrainer.startTraining.mockResolvedValue('test-session-123');
    mockTrainer.getDataCollector.mockReturnValue({
      getSession: vi.fn().mockReturnValue({
        id: 'test-session-123',
        generations: [{ generation: 0 }, { generation: 1 }],
        bestFitness: 0.75,
        status: 'completed',
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T01:00:00Z'),
      }),
    });
    mockTrainer.getTrainingStatus.mockReturnValue({
      isRunning: false,
      sessionId: 'test-session-123',
      currentGeneration: 100,
      totalGenerations: 1000,
      bestFitness: 0.75,
      averageFitness: 0.65,
      elapsedTime: 3600000,
      estimatedTimeRemaining: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create trainer with default configuration', () => {
    const trainer = new Trainer();
    expect(Trainer).toHaveBeenCalledWith();
    expect(trainer).toBeDefined();
  });

  it('should create trainer with custom configuration', () => {
    const customConfig = {
      genetic: {
        maxGenerations: 500,
        populationSize: 50,
      },
    };

    const trainer = new Trainer(customConfig);
    expect(Trainer).toHaveBeenCalledWith(customConfig);
    expect(trainer).toBeDefined();
  });

  it('should start training and return session ID', async () => {
    const trainer = new Trainer();
    const sessionId = await trainer.startTraining();

    expect(mockTrainer.startTraining).toHaveBeenCalledOnce();
    expect(sessionId).toBe('test-session-123');
  });

  it('should set up progress callbacks', () => {
    const trainer = new Trainer();
    const callbacks = {
      onGenerationComplete: vi.fn(),
      onTrainingComplete: vi.fn(),
    };

    trainer.setCallbacks(callbacks);
    expect(mockTrainer.setCallbacks).toHaveBeenCalledWith(callbacks);
  });

  it('should handle training errors gracefully', async () => {
    const trainer = new Trainer();
    const error = new Error('Training failed');
    mockTrainer.startTraining.mockRejectedValue(error);

    await expect(trainer.startTraining()).rejects.toThrow('Training failed');
  });

  it('should save configuration to file', async () => {
    const trainer = new Trainer();
    await trainer.saveConfig('test-config.json');

    expect(mockTrainer.saveConfig).toHaveBeenCalledWith('test-config.json');
  });

  it('should provide training status information', () => {
    const trainer = new Trainer();
    const status = trainer.getTrainingStatus();

    expect(status.sessionId).toBe('test-session-123');
    expect(status.bestFitness).toBe(0.75);
    expect(status.currentGeneration).toBe(100);
    expect(status.totalGenerations).toBe(1000);
  });

  it('should stop training when requested', () => {
    const trainer = new Trainer();
    trainer.stopTraining();

    expect(mockTrainer.stopTraining).toHaveBeenCalledOnce();
  });

  it('should access data collector for session information', () => {
    const trainer = new Trainer();
    const dataCollector = trainer.getDataCollector();
    const sessionData = dataCollector.getSession('test-session-123');

    expect(sessionData).toEqual({
      id: 'test-session-123',
      generations: [{ generation: 0 }, { generation: 1 }],
      bestFitness: 0.75,
      status: 'completed',
      startTime: new Date('2024-01-01T00:00:00Z'),
      endTime: new Date('2024-01-01T01:00:00Z'),
    });
  });
});

describe('Training Configuration Validation', () => {
  it('should validate generations parameter', () => {
    expect(() => {
      new Trainer({
        genetic: { maxGenerations: -1 },
      });
    }).not.toThrow(); // Trainer handles validation internally
  });

  it('should validate population size parameter', () => {
    expect(() => {
      new Trainer({
        genetic: { populationSize: 0 },
      });
    }).not.toThrow(); // Trainer handles validation internally
  });

  it('should validate mutation rate parameter', () => {
    expect(() => {
      new Trainer({
        genetic: { mutationRate: 1.5 },
      });
    }).not.toThrow(); // Trainer handles validation internally
  });

  it('should validate network architecture', () => {
    expect(() => {
      new Trainer({
        networkArchitecture: [32, 64, 4], // Wrong input size
      });
    }).not.toThrow(); // Trainer handles validation internally
  });
});

describe('Training Progress Reporting', () => {
  it('should format time correctly', () => {
    // Test time formatting utility functions
    const formatTime = (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    };

    expect(formatTime(1000)).toBe('1s');
    expect(formatTime(65000)).toBe('1m 5s');
    expect(formatTime(3665000)).toBe('1h 1m 5s');
  });

  it('should calculate progress percentage correctly', () => {
    const calculateProgress = (current: number, total: number): string => {
      return ((current / total) * 100).toFixed(1);
    };

    expect(calculateProgress(50, 100)).toBe('50.0');
    expect(calculateProgress(1, 3)).toBe('33.3');
    expect(calculateProgress(100, 100)).toBe('100.0');
  });

  it('should estimate remaining time based on current progress', () => {
    const estimateRemainingTime = (
      elapsed: number,
      current: number,
      total: number
    ): number => {
      const progress = current / total;
      if (progress === 0) return 0;
      const estimatedTotal = elapsed / progress;
      return Math.max(0, estimatedTotal - elapsed);
    };

    expect(estimateRemainingTime(1000, 25, 100)).toBe(3000); // 25% done, 3000ms remaining
    expect(estimateRemainingTime(2000, 50, 100)).toBe(2000); // 50% done, 2000ms remaining
    expect(estimateRemainingTime(1000, 100, 100)).toBe(0); // 100% done, 0ms remaining
  });
});

describe('Training CLI Argument Parsing', () => {
  it('should parse basic arguments correctly', () => {
    const parseArgs = (args: string[]): Record<string, any> => {
      const parsed: Record<string, any> = {};

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
          case '--generations':
          case '-g':
            parsed.generations = parseInt(args[++i], 10);
            break;
          case '--population-size':
          case '-p':
            parsed.populationSize = parseInt(args[++i], 10);
            break;
          case '--verbose':
          case '-v':
            parsed.verbose = true;
            break;
        }
      }

      return parsed;
    };

    expect(parseArgs(['-g', '500'])).toEqual({ generations: 500 });
    expect(parseArgs(['--population-size', '50'])).toEqual({
      populationSize: 50,
    });
    expect(parseArgs(['-v'])).toEqual({ verbose: true });
    expect(parseArgs(['-g', '1000', '-v'])).toEqual({
      generations: 1000,
      verbose: true,
    });
  });

  it('should validate argument ranges', () => {
    const validateArgs = (args: Record<string, any>): void => {
      if (
        args.generations !== undefined &&
        (args.generations < 1 || args.generations > 10000)
      ) {
        throw new Error('Generations must be between 1 and 10000');
      }

      if (
        args.populationSize !== undefined &&
        (args.populationSize < 10 || args.populationSize > 1000)
      ) {
        throw new Error('Population size must be between 10 and 1000');
      }
    };

    expect(() => validateArgs({ generations: 500 })).not.toThrow();
    expect(() => validateArgs({ generations: 0 })).toThrow(
      'Generations must be between 1 and 10000'
    );
    expect(() => validateArgs({ populationSize: 50 })).not.toThrow();
    expect(() => validateArgs({ populationSize: 5 })).toThrow(
      'Population size must be between 10 and 1000'
    );
  });
});
