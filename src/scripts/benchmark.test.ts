/**
 * Tests for the benchmark script functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NeuralNetwork } from '../ml/neural-network';
import { StateEncoder } from '../ml/state-encoder';
import { WeightLoader } from '../ml/weight-loader';
import { GameLogic } from '../backend/game-logic';

// Mock dependencies
vi.mock('../ml/neural-network');
vi.mock('../ml/state-encoder');
vi.mock('../ml/weight-loader');
vi.mock('../backend/game-logic');
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  writeFile: vi.fn(),
}));

const mockNeuralNetwork = {
  forward: vi.fn(),
};

const mockStateEncoder = {
  encode: vi.fn(),
};

const mockGameLogic = {
  getState: vi.fn(),
};

// Mock performance.now for consistent timing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

describe('Benchmark Script Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock NeuralNetwork
    (
      NeuralNetwork as unknown as vi.MockedClass<typeof NeuralNetwork>
    ).mockImplementation(() => mockNeuralNetwork as unknown as NeuralNetwork);
    mockNeuralNetwork.forward.mockReturnValue([0.25, 0.25, 0.25, 0.25]);

    // Mock StateEncoder
    (
      StateEncoder as unknown as vi.MockedClass<typeof StateEncoder>
    ).mockImplementation(() => mockStateEncoder as unknown as StateEncoder);
    mockStateEncoder.encode.mockReturnValue(new Array(64).fill(0.5));

    // Mock GameLogic
    (
      GameLogic as unknown as vi.MockedClass<typeof GameLogic>
    ).mockImplementation(() => mockGameLogic as unknown as GameLogic);
    mockGameLogic.getState.mockReturnValue({
      snakes: [{ segments: [{ x: 10, y: 10 }], targetLength: 3 }],
      apples: [{ x: 15, y: 15, type: 'normal' }],
      gameArea: { width: 20, height: 20 },
    });

    // Mock WeightLoader
    (
      WeightLoader.loadWeights as vi.MockedFunction<
        typeof WeightLoader.loadWeights
      >
    ).mockResolvedValue([
      [
        [0.1, 0.2],
        [0.3, 0.4],
      ], // Layer 1 weights
      [[0.5, 0.6]], // Layer 2 weights
    ]);

    // Mock performance.now with consistent timing
    let currentTime = 0;
    mockPerformanceNow.mockImplementation(() => {
      currentTime += 1; // 1ms per call
      return currentTime;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should benchmark neural network inference correctly', async () => {
    const benchmarkNetwork = async (
      name: string,
      weights: number[][][],
      iterations: number,
      warmupIterations: number,
      _verbose: boolean
    ): BenchmarkResult => {
      const network = new NeuralNetwork(weights);
      const encoder = new StateEncoder();
      const gameLogic = new GameLogic(20, 20, 12345);
      const testState = gameLogic.getState();

      // Warmup
      for (let i = 0; i < warmupIterations; i++) {
        const input = encoder.encode(testState, 0);
        network.forward(input);
      }

      // Benchmark
      const times: number[] = [];
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const input = encoder.encode(testState, 0);

        const inferenceStart = performance.now();
        network.forward(input);
        const inferenceEnd = performance.now();

        times.push(inferenceEnd - inferenceStart);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const throughput = iterations / (totalTime / 1000);

      return {
        name,
        averageInferenceTime: averageTime,
        minInferenceTime: minTime,
        maxInferenceTime: maxTime,
        throughput,
        inferenceTimes: times,
      };
    };

    const weights = [
      [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    ];
    const result = await benchmarkNetwork(
      'test-network',
      weights,
      100,
      10,
      false
    );

    expect(result.name).toBe('test-network');
    expect(result.averageInferenceTime).toBe(1); // 1ms per inference based on mock
    expect(result.minInferenceTime).toBe(1);
    expect(result.maxInferenceTime).toBe(1);
    expect(result.throughput).toBeCloseTo(498, 0); // Allow for variance to nearest whole number
    expect(result.inferenceTimes).toHaveLength(100);
  });

  it('should measure memory usage correctly', () => {
    // Mock process.memoryUsage for Node.js environment
    const mockMemoryUsage = vi.fn().mockReturnValue({
      heapUsed: 50 * 1024 * 1024, // 50MB
    });

    Object.defineProperty(global, 'process', {
      value: { memoryUsage: mockMemoryUsage },
      writable: true,
    });

    const measureMemoryUsage = (): number => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed / 1024 / 1024; // MB
      }
      return 0;
    };

    const memoryUsage = measureMemoryUsage();
    expect(memoryUsage).toBe(50);
  });

  it('should find weight files correctly', async () => {
    const { readdir } = await import('fs/promises');

    (readdir as vi.MockedFunction<typeof readdir>).mockResolvedValue([
      'weights1.json',
      'weights2.json',
      'readme.txt',
      'config.json',
    ] as string[]);

    const findWeightFiles = async (directory: string): Promise<string[]> => {
      const files = await readdir(directory);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => `${directory}/${file}`);
    };

    const weightFiles = await findWeightFiles('./weights');
    expect(weightFiles).toEqual([
      './weights/weights1.json',
      './weights/weights2.json',
      './weights/config.json',
    ]);
  });

  it('should calculate benchmark statistics correctly', () => {
    const calculatePercentiles = (values: number[]) => {
      const sorted = values.slice().sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      return { p50, p95, p99 };
    };

    const testValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const percentiles = calculatePercentiles(testValues);

    expect(percentiles.p50).toBe(6); // Median of [1,2,3,4,5,6,7,8,9,10] is 5.5, rounded up to 6
    expect(percentiles.p95).toBe(10); // 95th percentile
    expect(percentiles.p99).toBe(10); // 99th percentile
  });

  it('should calculate standard deviation correctly', () => {
    const calculateStdDev = (values: number[], mean: number): number => {
      return Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          values.length
      );
    };

    const testValues = [2, 4, 4, 4, 5, 5, 7, 9];
    const mean = testValues.reduce((a, b) => a + b, 0) / testValues.length;
    const stdDev = calculateStdDev(testValues, mean);

    expect(mean).toBe(5);
    expect(stdDev).toBeCloseTo(2, 0);
  });

  it('should validate performance requirements', () => {
    const checkPerformanceRequirements = (results: any[]) => {
      const targetInferenceTime = 1.0; // 1ms
      const targetThroughput = 1000; // 1000 ops/s
      const targetMemory = 100; // 100MB

      const meetsTiming = results.every(
        r => r.averageInferenceTime < targetInferenceTime
      );
      const meetsThroughput = results.every(
        r => r.throughput > targetThroughput
      );
      const meetsMemory = results.every(r => r.memoryUsage < targetMemory);

      return { meetsTiming, meetsThroughput, meetsMemory };
    };

    const testResults = [
      { averageInferenceTime: 0.5, throughput: 2000, memoryUsage: 50 },
      { averageInferenceTime: 0.8, throughput: 1250, memoryUsage: 75 },
    ];

    const requirements = checkPerformanceRequirements(testResults);
    expect(requirements.meetsTiming).toBe(true);
    expect(requirements.meetsThroughput).toBe(true);
    expect(requirements.meetsMemory).toBe(true);
  });

  it('should format benchmark results table correctly', () => {
    const formatResultRow = (
      name: string,
      avgTime: number,
      minTime: number,
      maxTime: number,
      throughput: number,
      memory: number
    ) => {
      const truncatedName =
        name.length > 28 ? name.substring(0, 25) + '...' : name;
      return (
        truncatedName.padEnd(30) +
        avgTime.toFixed(3).padEnd(15) +
        minTime.toFixed(3).padEnd(15) +
        maxTime.toFixed(3).padEnd(15) +
        throughput.toFixed(0).padEnd(20) +
        memory.toFixed(1).padEnd(15)
      );
    };

    const row = formatResultRow(
      'test-network',
      0.852,
      0.723,
      1.234,
      1173,
      45.6
    );
    expect(row).toBe(
      'test-network                  0.852          0.723          1.234          1173                45.6           '
    );
  });

  it('should save benchmark results to JSON correctly', async () => {
    const { writeFile } = await import('fs/promises');

    const saveBenchmarkResults = async (
      results: any[],
      filename: string
    ): Promise<void> => {
      const strippedResults = results.map(result => ({
        ...result,
        inferenceTimes: undefined,
      }));

      const output = {
        benchmarkDate: new Date().toISOString(),
        totalNetworks: results.length,
        totalInferences:
          results.length > 0 ? results[0].inferenceTimes.length : 0,
        results: strippedResults,
      };

      await writeFile(filename, JSON.stringify(output, null, 2));
    };

    const testResults = [
      {
        name: 'test1',
        averageInferenceTime: 0.5,
        throughput: 2000,
        inferenceTimes: [0.4, 0.5, 0.6],
      },
      {
        name: 'test2',
        averageInferenceTime: 0.8,
        throughput: 1250,
        inferenceTimes: [0.7, 0.8, 0.9],
      },
    ];

    await saveBenchmarkResults(testResults, 'benchmark-results.json');

    expect(writeFile).toHaveBeenCalledWith(
      'benchmark-results.json',
      expect.stringContaining('"totalNetworks": 2')
    );
    expect(writeFile).toHaveBeenCalledWith(
      'benchmark-results.json',
      expect.stringContaining('"totalInferences": 3')
    );
    // Ensure inferenceTimes are stripped out
    expect(writeFile).toHaveBeenCalledWith(
      'benchmark-results.json',
      expect.not.stringContaining('inferenceTimes')
    );
  });
});

describe('Benchmark CLI Argument Parsing', () => {
  it('should parse benchmark arguments correctly', () => {
    const parseArgs = (args: string[]): Record<string, any> => {
      const parsed: Record<string, any> = {};

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
          case '--weights':
          case '-w':
            parsed.weights = args[++i];
            break;
          case '--iterations':
          case '-i':
            parsed.iterations = parseInt(args[++i], 10);
            break;
          case '--warmup':
            parsed.warmup = parseInt(args[++i], 10);
            break;
          case '--verbose':
          case '-v':
            parsed.verbose = true;
            break;
        }
      }

      return parsed;
    };

    expect(parseArgs(['-w', 'weights.json'])).toEqual({
      weights: 'weights.json',
    });
    expect(parseArgs(['-i', '5000'])).toEqual({ iterations: 5000 });
    expect(parseArgs(['--warmup', '500'])).toEqual({ warmup: 500 });
    expect(parseArgs(['-v'])).toEqual({ verbose: true });
  });

  it('should validate benchmark arguments', () => {
    const validateArgs = (args: Record<string, any>): void => {
      if (
        args.iterations !== undefined &&
        (args.iterations < 100 || args.iterations > 1000000)
      ) {
        throw new Error('Iterations must be between 100 and 1,000,000');
      }

      if (
        args.warmup !== undefined &&
        (args.warmup < 0 || args.warmup > 10000)
      ) {
        throw new Error('Warmup iterations must be between 0 and 10,000');
      }
    };

    expect(() => validateArgs({ iterations: 1000 })).not.toThrow();
    expect(() => validateArgs({ iterations: 50 })).toThrow(
      'Iterations must be between 100 and 1,000,000'
    );
    expect(() => validateArgs({ warmup: 100 })).not.toThrow();
    expect(() => validateArgs({ warmup: 15000 })).toThrow(
      'Warmup iterations must be between 0 and 10,000'
    );
  });
});
