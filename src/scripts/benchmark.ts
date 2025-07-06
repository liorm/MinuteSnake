#!/usr/bin/env node

/**
 * Benchmark script for neural network performance analysis.
 * Measures inference time, memory usage, and training performance.
 */

import { NeuralNetwork } from '../ml/neural-network';
import { StateEncoder } from '../ml/state-encoder';
import { WeightLoader } from '../ml/weight-loader';
import { GameLogic } from '../backend/game-logic';
import { GameState } from '../game-state';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface BenchmarkResult {
  name: string;
  inferenceTimes: number[];
  averageInferenceTime: number;
  minInferenceTime: number;
  maxInferenceTime: number;
  memoryUsage: number;
  throughput: number; // inferences per second
}

interface CLIArgs {
  weights?: string;
  weightsDir?: string;
  iterations?: number;
  warmup?: number;
  output?: string;
  verbose?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CLIArgs {
  const parsed: CLIArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--weights':
      case '-w':
        parsed.weights = args[++i];
        break;
      case '--weights-dir':
      case '-d':
        parsed.weightsDir = args[++i];
        break;
      case '--iterations':
      case '-i':
        parsed.iterations = parseInt(args[++i], 10);
        break;
      case '--warmup':
        parsed.warmup = parseInt(args[++i], 10);
        break;
      case '--output':
      case '-o':
        parsed.output = args[++i];
        break;
      case '--verbose':
      case '-v':
        parsed.verbose = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return parsed;
}

function printHelp(): void {
  console.log(`
MinuteSnake Neural Network Benchmark Script

Usage: npm run benchmark [options]

Options:
  -w, --weights <file>         Benchmark specific weight file
  -d, --weights-dir <dir>      Benchmark all weight files in directory (default: src/weights)
  -i, --iterations <n>         Number of benchmark iterations (default: 10000)
  --warmup <n>                 Number of warmup iterations (default: 1000)
  -o, --output <file>          Save benchmark results to JSON file
  -v, --verbose                Enable verbose logging
  -h, --help                   Show this help message

Examples:
  npm run benchmark                              # Benchmark all weights in src/weights
  npm run benchmark -w best_final_fitness0.8.json # Benchmark specific weight file
  npm run benchmark -i 50000                    # Run 50,000 iterations
  npm run benchmark -o benchmark-results.json   # Save results to file
  npm run benchmark -v                          # Run with verbose output
`);
}

function validateArgs(args: CLIArgs): void {
  if (
    args.iterations !== undefined &&
    (args.iterations < 100 || args.iterations > 1000000)
  ) {
    throw new Error('Iterations must be between 100 and 1,000,000');
  }

  if (args.warmup !== undefined && (args.warmup < 0 || args.warmup > 10000)) {
    throw new Error('Warmup iterations must be between 0 and 10,000');
  }
}

async function findWeightFiles(directory: string): Promise<string[]> {
  try {
    const files = await readdir(directory);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => join(directory, file));
  } catch (error) {
    throw new Error(
      `Failed to read weights directory: ${(error as Error).message}`
    );
  }
}

function createTestGameState(): GameState {
  const gameLogic = new GameLogic(20, 20, 12345);
  return gameLogic.getState();
}

function measureMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  return 0;
}

async function benchmarkNetwork(
  name: string,
  weights: number[][][],
  iterations: number,
  warmupIterations: number,
  verbose: boolean
): Promise<BenchmarkResult> {
  const network = new NeuralNetwork(weights);
  const encoder = new StateEncoder();
  const testState = createTestGameState();

  if (verbose) {
    console.log(`  Benchmarking ${name}...`);
  }

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    const input = encoder.encode(testState, 0);
    network.forward(input);
  }

  // Measure memory before benchmark
  const memoryBefore = measureMemoryUsage();

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

  // Measure memory after benchmark
  const memoryAfter = measureMemoryUsage();

  // Calculate statistics
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const throughput = iterations / (totalTime / 1000); // inferences per second

  return {
    name,
    inferenceTimes: times,
    averageInferenceTime: averageTime,
    minInferenceTime: minTime,
    maxInferenceTime: maxTime,
    memoryUsage: memoryAfter - memoryBefore,
    throughput,
  };
}

function printBenchmarkResults(
  results: BenchmarkResult[],
  verbose: boolean
): void {
  console.log('\n⚡ Benchmark Results:');
  console.log('='.repeat(100));

  // Header
  console.log(
    'Network Name'.padEnd(30) +
      'Avg Time (ms)'.padEnd(15) +
      'Min Time (ms)'.padEnd(15) +
      'Max Time (ms)'.padEnd(15) +
      'Throughput (ops/s)'.padEnd(20) +
      'Memory (MB)'.padEnd(15)
  );
  console.log('-'.repeat(100));

  // Sort by average inference time
  const sortedResults = results.sort(
    (a, b) => a.averageInferenceTime - b.averageInferenceTime
  );

  for (const result of sortedResults) {
    const name =
      result.name.length > 28
        ? result.name.substring(0, 25) + '...'
        : result.name;

    console.log(
      name.padEnd(30) +
        result.averageInferenceTime.toFixed(3).padEnd(15) +
        result.minInferenceTime.toFixed(3).padEnd(15) +
        result.maxInferenceTime.toFixed(3).padEnd(15) +
        result.throughput.toFixed(0).padEnd(20) +
        result.memoryUsage.toFixed(1).padEnd(15)
    );
  }

  if (verbose) {
    console.log('\n📊 Detailed Statistics:');
    console.log('='.repeat(100));

    for (const result of sortedResults) {
      const times = result.inferenceTimes;
      const sorted = times.slice().sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const stdDev = Math.sqrt(
        times.reduce(
          (sum, time) => sum + Math.pow(time - result.averageInferenceTime, 2),
          0
        ) / times.length
      );

      console.log(`\n${result.name}:`);
      console.log(`  Average: ${result.averageInferenceTime.toFixed(3)}ms`);
      console.log(`  Median (P50): ${p50.toFixed(3)}ms`);
      console.log(`  P95: ${p95.toFixed(3)}ms`);
      console.log(`  P99: ${p99.toFixed(3)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(3)}ms`);
      console.log(`  Min: ${result.minInferenceTime.toFixed(3)}ms`);
      console.log(`  Max: ${result.maxInferenceTime.toFixed(3)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(0)} ops/s`);
      console.log(`  Memory Usage: ${result.memoryUsage.toFixed(1)}MB`);
    }
  }

  // Performance summary
  console.log('\n🎯 Performance Summary:');
  console.log('='.repeat(60));

  if (results.length > 0) {
    const avgTimes = results.map(r => r.averageInferenceTime);
    const avgThroughput = results.map(r => r.throughput);
    const avgMemory = results.map(r => r.memoryUsage);

    console.log(
      `Fastest Network: ${results[0].name} (${results[0].averageInferenceTime.toFixed(3)}ms)`
    );
    console.log(
      `Slowest Network: ${results[results.length - 1].name} (${results[results.length - 1].averageInferenceTime.toFixed(3)}ms)`
    );
    console.log(
      `Average Inference Time: ${(avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length).toFixed(3)}ms`
    );
    console.log(
      `Average Throughput: ${(avgThroughput.reduce((a, b) => a + b, 0) / avgThroughput.length).toFixed(0)} ops/s`
    );
    console.log(
      `Average Memory Usage: ${(avgMemory.reduce((a, b) => a + b, 0) / avgMemory.length).toFixed(1)}MB`
    );
  }

  // Performance requirements check
  console.log('\n✅ Performance Requirements:');
  console.log('='.repeat(60));

  const targetInferenceTime = 1.0; // 1ms target
  const targetThroughput = 1000; // 1000 ops/s target
  const targetMemory = 100; // 100MB target

  const meetsTiming = results.every(
    r => r.averageInferenceTime < targetInferenceTime
  );
  const meetsThroughput = results.every(r => r.throughput > targetThroughput);
  const meetsMemory = results.every(r => r.memoryUsage < targetMemory);

  console.log(
    `Inference Time < ${targetInferenceTime}ms: ${meetsTiming ? '✅ PASS' : '❌ FAIL'}`
  );
  console.log(
    `Throughput > ${targetThroughput} ops/s: ${meetsThroughput ? '✅ PASS' : '❌ FAIL'}`
  );
  console.log(
    `Memory Usage < ${targetMemory}MB: ${meetsMemory ? '✅ PASS' : '❌ FAIL'}`
  );

  if (meetsTiming && meetsThroughput && meetsMemory) {
    console.log('\n🎉 All performance requirements met!');
  } else {
    console.log('\n⚠️  Some performance requirements not met');
  }
}

async function saveBenchmarkResults(
  results: BenchmarkResult[],
  filename: string
): Promise<void> {
  const fs = await import('fs/promises');

  // Strip out the raw inference times to reduce file size
  const strippedResults = results.map(result => ({
    ...result,
    inferenceTimes: undefined, // Remove raw times array
  }));

  const output = {
    benchmarkDate: new Date().toISOString(),
    totalNetworks: results.length,
    totalInferences: results.length > 0 ? results[0].inferenceTimes.length : 0,
    results: strippedResults,
  };

  await fs.writeFile(filename, JSON.stringify(output, null, 2));
  console.log(`\n💾 Benchmark results saved to: ${filename}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  try {
    validateArgs(args);

    const iterations = args.iterations || 10000;
    const warmupIterations = args.warmup || 1000;

    console.log('⚡ Benchmark Configuration:');
    console.log(`  Iterations: ${iterations.toLocaleString()}`);
    console.log(`  Warmup Iterations: ${warmupIterations.toLocaleString()}`);
    console.log(`  Verbose Output: ${args.verbose ? 'Yes' : 'No'}`);
    console.log('');

    const results: BenchmarkResult[] = [];

    // Benchmark specific weight file
    if (args.weights) {
      console.log(`📂 Benchmarking weight file: ${args.weights}`);

      const weights = await WeightLoader.loadWeights(args.weights);
      const name =
        args.weights.split('/').pop()?.replace('.json', '') || 'unknown';

      const result = await benchmarkNetwork(
        name,
        weights,
        iterations,
        warmupIterations,
        args.verbose || false
      );
      results.push(result);
    }
    // Benchmark all weight files in directory
    else {
      const weightsDir = args.weightsDir || './src/weights';
      console.log(`📂 Benchmarking all weight files in: ${weightsDir}`);

      const weightFiles = await findWeightFiles(weightsDir);

      if (weightFiles.length === 0) {
        console.log('⚠️  No weight files found in the specified directory');
        return;
      }

      console.log(`Found ${weightFiles.length} weight files`);

      for (const weightFile of weightFiles) {
        const weights = await WeightLoader.loadWeights(weightFile);
        const name =
          weightFile.split('/').pop()?.replace('.json', '') || 'unknown';

        const result = await benchmarkNetwork(
          name,
          weights,
          iterations,
          warmupIterations,
          args.verbose || false
        );
        results.push(result);
      }
    }

    if (results.length === 0) {
      console.log('⚠️  No networks were benchmarked');
      return;
    }

    // Display results
    printBenchmarkResults(results, args.verbose || false);

    // Save results if requested
    if (args.output) {
      await saveBenchmarkResults(results, args.output);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    if (args.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
