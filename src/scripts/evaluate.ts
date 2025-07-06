#!/usr/bin/env node

/**
 * Evaluation script for neural network Snake AI agents.
 * Provides performance comparison between different AI types and weight files.
 */

import { FitnessEvaluator, FitnessConfig, defaultFitnessConfig } from '../ml/fitness-evaluator';
import { NNActor } from '../actors/nn-actor';
import { AIActor } from '../actors/ai-actor';
import { WeightLoader } from '../ml/weight-loader';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface EvaluationResult {
  agentName: string;
  agentType: 'AI' | 'NN';
  weightFile?: string;
  averageFitness: number;
  averageScore: number;
  averageSurvivalTime: number;
  gamesCompleted: number;
  gamesFailed: number;
  winRate: number;
  fitnessStdDev: number;
  scoreStdDev: number;
  survivalTimeStdDev: number;
}

interface CLIArgs {
  weights?: string;
  weightsDir?: string;
  games?: number;
  gameTime?: number;
  compareAI?: boolean;
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
      case '--games':
      case '-g':
        parsed.games = parseInt(args[++i], 10);
        break;
      case '--game-time':
      case '-t':
        parsed.gameTime = parseInt(args[++i], 10);
        break;
      case '--compare-ai':
      case '-c':
        parsed.compareAI = true;
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
MinuteSnake Neural Network Evaluation Script

Usage: npm run evaluate [options]

Options:
  -w, --weights <file>         Evaluate specific weight file
  -d, --weights-dir <dir>      Evaluate all weight files in directory (default: src/weights)
  -g, --games <n>              Number of games per agent (default: 10)
  -t, --game-time <n>          Maximum game time in seconds (default: 60)
  -c, --compare-ai             Include traditional AI for comparison
  -o, --output <file>          Save results to JSON file
  -v, --verbose                Enable verbose logging
  -h, --help                   Show this help message

Examples:
  npm run evaluate                              # Evaluate all weights in src/weights
  npm run evaluate -w best_final_fitness0.8.json # Evaluate specific weight file
  npm run evaluate -d ./my-weights -g 20        # Evaluate custom weights with 20 games
  npm run evaluate -c                           # Compare NN agents with traditional AI
  npm run evaluate -o results.json              # Save results to JSON file
  npm run evaluate -v                           # Run with verbose output
`);
}

function validateArgs(args: CLIArgs): void {
  if (args.games !== undefined && (args.games < 1 || args.games > 100)) {
    throw new Error('Games must be between 1 and 100');
  }
  
  if (args.gameTime !== undefined && (args.gameTime < 10 || args.gameTime > 600)) {
    throw new Error('Game time must be between 10 and 600 seconds');
  }
}

async function findWeightFiles(directory: string): Promise<string[]> {
  try {
    const files = await readdir(directory);
    const weightFiles: string[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fullPath = join(directory, file);
        const stats = await stat(fullPath);
        if (stats.isFile()) {
          weightFiles.push(fullPath);
        }
      }
    }
    
    return weightFiles;
  } catch (error) {
    throw new Error(`Failed to read weights directory: ${(error as Error).message}`);
  }
}

async function evaluateAgent(
  agentName: string,
  createAgent: () => Promise<NNActor | AIActor>,
  config: FitnessConfig,
  verbose: boolean
): Promise<EvaluationResult> {
  const fitnessEvaluator = new FitnessEvaluator(config);
  const agent = await createAgent();
  
  if (verbose) {
    console.log(`  Evaluating ${agentName}...`);
  }
  
  // Create a mock individual for evaluation
  const mockIndividual = {
    id: 'evaluation',
    weights: agent instanceof NNActor ? agent.getWeights() : [],
    fitness: 0,
    generation: 0,
    age: 0,
  };
  
  // Evaluate the agent
  const result = await fitnessEvaluator.evaluateIndividual(mockIndividual, agent);
  
  // Extract detailed metrics
  const scores = result.gameResults.map(r => r.score);
  const survivalTimes = result.gameResults.map(r => r.survivalTime);
  const fitnesses = result.gameResults.map(r => r.fitness);
  
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const avgSurvivalTime = survivalTimes.reduce((a, b) => a + b, 0) / survivalTimes.length;
  const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
  
  // Calculate standard deviations
  const scoreStdDev = Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length);
  const survivalTimeStdDev = Math.sqrt(survivalTimes.reduce((sum, time) => sum + Math.pow(time - avgSurvivalTime, 2), 0) / survivalTimes.length);
  const fitnessStdDev = Math.sqrt(fitnesses.reduce((sum, fitness) => sum + Math.pow(fitness - avgFitness, 2), 0) / fitnesses.length);
  
  // Calculate success metrics
  const gamesCompleted = result.gameResults.filter(r => r.reason === 'time_limit').length;
  const gamesFailed = result.gameResults.length - gamesCompleted;
  const winRate = gamesCompleted / result.gameResults.length;
  
  return {
    agentName,
    agentType: agent instanceof NNActor ? 'NN' : 'AI',
    weightFile: agent instanceof NNActor ? agentName : undefined,
    averageFitness: avgFitness,
    averageScore: avgScore,
    averageSurvivalTime: avgSurvivalTime,
    gamesCompleted,
    gamesFailed,
    winRate,
    fitnessStdDev,
    scoreStdDev,
    survivalTimeStdDev,
  };
}

function calculateStatistics(values: number[]): { mean: number; stdDev: number; min: number; max: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return { mean, stdDev, min, max };
}

function printResults(results: EvaluationResult[], verbose: boolean): void {
  console.log('\n📊 Evaluation Results:');
  console.log('=' .repeat(120));
  
  // Header
  console.log('Agent Name'.padEnd(30) + 
             'Type'.padEnd(6) + 
             'Avg Fitness'.padEnd(12) + 
             'Avg Score'.padEnd(12) + 
             'Avg Survival'.padEnd(12) + 
             'Win Rate'.padEnd(10) + 
             'Games'.padEnd(8) + 
             'Failed'.padEnd(8));
  console.log('-'.repeat(120));
  
  // Sort by average fitness (descending)
  const sortedResults = results.sort((a, b) => b.averageFitness - a.averageFitness);
  
  for (const result of sortedResults) {
    const agentName = result.agentName.length > 28 ? result.agentName.substring(0, 25) + '...' : result.agentName;
    
    console.log(
      agentName.padEnd(30) +
      result.agentType.padEnd(6) +
      result.averageFitness.toFixed(4).padEnd(12) +
      result.averageScore.toFixed(1).padEnd(12) +
      result.averageSurvivalTime.toFixed(1).padEnd(12) +
      (result.winRate * 100).toFixed(1).padEnd(9) + '%' +
      result.gamesCompleted.toString().padEnd(8) +
      result.gamesFailed.toString().padEnd(8)
    );
  }
  
  if (verbose) {
    console.log('\n📈 Detailed Statistics:');
    console.log('=' .repeat(120));
    
    for (const result of sortedResults) {
      console.log(`\n${result.agentName} (${result.agentType}):`);
      console.log(`  Fitness: ${result.averageFitness.toFixed(4)} ± ${result.fitnessStdDev.toFixed(4)}`);
      console.log(`  Score: ${result.averageScore.toFixed(1)} ± ${result.scoreStdDev.toFixed(1)}`);
      console.log(`  Survival Time: ${result.averageSurvivalTime.toFixed(1)}s ± ${result.survivalTimeStdDev.toFixed(1)}s`);
      console.log(`  Success Rate: ${(result.winRate * 100).toFixed(1)}%`);
      if (result.weightFile) {
        console.log(`  Weight File: ${result.weightFile}`);
      }
    }
  }
  
  // Summary statistics
  console.log('\n🎯 Summary Statistics:');
  console.log('=' .repeat(60));
  
  const nnResults = results.filter(r => r.agentType === 'NN');
  const aiResults = results.filter(r => r.agentType === 'AI');
  
  if (nnResults.length > 0) {
    const nnFitnesses = nnResults.map(r => r.averageFitness);
    const nnStats = calculateStatistics(nnFitnesses);
    
    console.log(`Neural Network Agents (${nnResults.length}):`);
    console.log(`  Best Fitness: ${nnStats.max.toFixed(4)}`);
    console.log(`  Average Fitness: ${nnStats.mean.toFixed(4)} ± ${nnStats.stdDev.toFixed(4)}`);
    console.log(`  Worst Fitness: ${nnStats.min.toFixed(4)}`);
  }
  
  if (aiResults.length > 0) {
    const aiFitnesses = aiResults.map(r => r.averageFitness);
    const aiStats = calculateStatistics(aiFitnesses);
    
    console.log(`Traditional AI Agents (${aiResults.length}):`);
    console.log(`  Fitness: ${aiStats.mean.toFixed(4)} ± ${aiStats.stdDev.toFixed(4)}`);
  }
  
  if (nnResults.length > 0 && aiResults.length > 0) {
    const bestNN = Math.max(...nnResults.map(r => r.averageFitness));
    const avgAI = aiResults.map(r => r.averageFitness)[0]; // Assuming one AI result
    const improvement = ((bestNN - avgAI) / avgAI * 100);
    
    console.log(`\nBest NN vs AI Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
  }
}

async function saveResults(results: EvaluationResult[], filename: string): Promise<void> {
  const fs = await import('fs/promises');
  
  const output = {
    evaluationDate: new Date().toISOString(),
    totalAgents: results.length,
    results: results.sort((a, b) => b.averageFitness - a.averageFitness),
  };
  
  await fs.writeFile(filename, JSON.stringify(output, null, 2));
  console.log(`\n💾 Results saved to: ${filename}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    printHelp();
    return;
  }
  
  try {
    validateArgs(args);
    
    const config: FitnessConfig = {
      ...defaultFitnessConfig,
      gamesPerIndividual: args.games || 10,
      maxGameTime: args.gameTime || 60,
      gameStage: FitnessEvaluator.createDefaultGameStage(),
    };
    
    console.log('🔍 Evaluation Configuration:');
    console.log(`  Games per Agent: ${config.gamesPerIndividual}`);
    console.log(`  Max Game Time: ${config.maxGameTime}s`);
    console.log(`  Compare with AI: ${args.compareAI ? 'Yes' : 'No'}`);
    console.log('');
    
    const results: EvaluationResult[] = [];
    
    // Evaluate specific weight file
    if (args.weights) {
      console.log(`📂 Evaluating weight file: ${args.weights}`);
      
      const agentName = args.weights.split('/').pop()?.replace('.json', '') || 'unknown';
      const createAgent = async () => {
        const weights = await WeightLoader.loadWeights(args.weights!);
        return new NNActor(weights);
      };
      
      const result = await evaluateAgent(agentName, createAgent, config, args.verbose || false);
      results.push(result);
    }
    // Evaluate all weight files in directory
    else {
      const weightsDir = args.weightsDir || './src/weights';
      console.log(`📂 Evaluating all weight files in: ${weightsDir}`);
      
      const weightFiles = await findWeightFiles(weightsDir);
      
      if (weightFiles.length === 0) {
        console.log('⚠️  No weight files found in the specified directory');
      } else {
        console.log(`Found ${weightFiles.length} weight files`);
        
        for (const weightFile of weightFiles) {
          const agentName = weightFile.split('/').pop()?.replace('.json', '') || 'unknown';
          const createAgent = async () => {
            const weights = await WeightLoader.loadWeights(weightFile);
            return new NNActor(weights);
          };
          
          const result = await evaluateAgent(agentName, createAgent, config, args.verbose || false);
          results.push(result);
        }
      }
    }
    
    // Include traditional AI for comparison
    if (args.compareAI) {
      console.log('🤖 Including traditional AI for comparison...');
      
      const createAIAgent = async () => new AIActor();
      const aiResult = await evaluateAgent('Traditional AI', createAIAgent, config, args.verbose || false);
      results.push(aiResult);
    }
    
    if (results.length === 0) {
      console.log('⚠️  No agents were evaluated');
      return;
    }
    
    // Display results
    printResults(results, args.verbose || false);
    
    // Save results if requested
    if (args.output) {
      await saveResults(results, args.output);
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
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}