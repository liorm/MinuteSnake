#!/usr/bin/env node

/**
 * Training script for neural network Snake AI agents.
 * Provides command-line interface for training and managing training sessions.
 */

import { Trainer, TrainingConfig, defaultTrainingConfig } from '../ml/trainer';

interface CLIArgs {
  generations?: number;
  populationSize?: number;
  mutationRate?: number;
  crossoverRate?: number;
  elitismRate?: number;
  gamesPerAgent?: number;
  maxGameTime?: number;
  seed?: number;
  sessionName?: string;
  config?: string;
  saveConfig?: string;
  verbose?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CLIArgs {
  const parsed: CLIArgs = {};

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
      case '--mutation-rate':
      case '-m':
        parsed.mutationRate = parseFloat(args[++i]);
        break;
      case '--crossover-rate':
      case '-c':
        parsed.crossoverRate = parseFloat(args[++i]);
        break;
      case '--elitism-rate':
      case '-e':
        parsed.elitismRate = parseFloat(args[++i]);
        break;
      case '--games-per-agent':
        parsed.gamesPerAgent = parseInt(args[++i], 10);
        break;
      case '--max-game-time':
        parsed.maxGameTime = parseInt(args[++i], 10);
        break;
      case '--seed':
      case '-s':
        parsed.seed = parseInt(args[++i], 10);
        break;
      case '--session-name':
      case '-n':
        parsed.sessionName = args[++i];
        break;
      case '--config':
        parsed.config = args[++i];
        break;
      case '--save-config':
        parsed.saveConfig = args[++i];
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
MinuteSnake Neural Network Training Script

Usage: npm run train [options]

Options:
  -g, --generations <n>        Number of generations to train (default: 1000)
  -p, --population-size <n>    Size of the population (default: 100)
  -m, --mutation-rate <f>      Mutation rate (0.0-1.0, default: 0.1)
  -c, --crossover-rate <f>     Crossover rate (0.0-1.0, default: 0.7)
  -e, --elitism-rate <f>       Elitism rate (0.0-1.0, default: 0.1)
  --games-per-agent <n>        Games per agent for fitness evaluation (default: 5)
  --max-game-time <n>          Maximum game time in seconds (default: 60)
  -s, --seed <n>               Random seed for reproducible training (default: 12345)
  -n, --session-name <name>    Name for the training session
  --config <file>              Load configuration from JSON file
  --save-config <file>         Save current configuration to JSON file
  -v, --verbose                Enable verbose logging
  -h, --help                   Show this help message

Examples:
  npm run train                          # Train with default settings
  npm run train -g 500 -p 50            # Train 500 generations with 50 population
  npm run train --config my-config.json # Train with custom configuration
  npm run train --save-config config.json # Save current config to file
  npm run train -v                      # Train with verbose output
`);
}

function validateArgs(args: CLIArgs): void {
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

  if (
    args.mutationRate !== undefined &&
    (args.mutationRate < 0 || args.mutationRate > 1)
  ) {
    throw new Error('Mutation rate must be between 0.0 and 1.0');
  }

  if (
    args.crossoverRate !== undefined &&
    (args.crossoverRate < 0 || args.crossoverRate > 1)
  ) {
    throw new Error('Crossover rate must be between 0.0 and 1.0');
  }

  if (
    args.elitismRate !== undefined &&
    (args.elitismRate < 0 || args.elitismRate > 1)
  ) {
    throw new Error('Elitism rate must be between 0.0 and 1.0');
  }

  if (
    args.gamesPerAgent !== undefined &&
    (args.gamesPerAgent < 1 || args.gamesPerAgent > 50)
  ) {
    throw new Error('Games per agent must be between 1 and 50');
  }

  if (
    args.maxGameTime !== undefined &&
    (args.maxGameTime < 10 || args.maxGameTime > 600)
  ) {
    throw new Error('Max game time must be between 10 and 600 seconds');
  }
}

function createTrainingConfig(args: CLIArgs): TrainingConfig {
  const config: TrainingConfig = {
    ...defaultTrainingConfig,
    sessionName: args.sessionName,
  };

  // Override genetic algorithm settings
  if (args.generations !== undefined) {
    config.genetic.maxGenerations = args.generations;
  }
  if (args.populationSize !== undefined) {
    config.genetic.populationSize = args.populationSize;
  }
  if (args.mutationRate !== undefined) {
    config.genetic.mutationRate = args.mutationRate;
  }
  if (args.crossoverRate !== undefined) {
    config.genetic.crossoverRate = args.crossoverRate;
  }
  if (args.elitismRate !== undefined) {
    config.genetic.elitismRate = args.elitismRate;
  }

  // Override fitness evaluation settings
  if (args.gamesPerAgent !== undefined) {
    config.fitness.gamesPerIndividual = args.gamesPerAgent;
  }
  if (args.maxGameTime !== undefined) {
    config.fitness.maxGameTime = args.maxGameTime;
  }

  // Override seed
  if (args.seed !== undefined) {
    config.seed = args.seed;
  }

  return config;
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function setupProgressReporting(trainer: Trainer, verbose: boolean): void {
  let lastLogTime = Date.now();
  const logInterval = verbose ? 1000 : 10000; // 1s for verbose, 10s for normal

  trainer.setCallbacks({
    onGenerationStart: generation => {
      if (verbose) {
        console.log(`Starting generation ${generation}...`);
      }
    },

    onGenerationComplete: (generation, bestFitness, avgFitness) => {
      const now = Date.now();
      if (now - lastLogTime >= logInterval) {
        const status = trainer.getTrainingStatus();
        const progress = (
          ((generation + 1) / status.totalGenerations) *
          100
        ).toFixed(1);
        const elapsed = formatTime(status.elapsedTime);
        const remaining = formatTime(status.estimatedTimeRemaining);

        console.log(
          `[${progress}%] Gen ${generation + 1}/${status.totalGenerations} | Best: ${bestFitness.toFixed(4)} | Avg: ${avgFitness.toFixed(4)} | Elapsed: ${elapsed} | ETA: ${remaining}`
        );
        lastLogTime = now;
      }
    },

    onCheckpoint: (generation, individual) => {
      console.log(
        `📁 Checkpoint saved at generation ${generation} (fitness: ${individual.fitness.toFixed(4)})`
      );
    },

    onTrainingComplete: (sessionId, bestIndividual) => {
      console.log(`🎉 Training completed! Session: ${sessionId}`);
      console.log(
        `🏆 Best fitness achieved: ${bestIndividual.fitness.toFixed(4)}`
      );
      console.log(`💾 Best weights saved to src/weights/`);
    },

    onTrainingError: error => {
      console.error(`❌ Training failed: ${error.message}`);
      if (verbose) {
        console.error(error.stack);
      }
    },
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  try {
    validateArgs(args);

    let config: TrainingConfig;

    // Load configuration from file if specified
    if (args.config) {
      console.log(`Loading configuration from: ${args.config}`);
      config = await Trainer.loadConfig(args.config);

      // Override with command line arguments
      if (args.generations !== undefined)
        config.genetic.maxGenerations = args.generations;
      if (args.populationSize !== undefined)
        config.genetic.populationSize = args.populationSize;
      if (args.mutationRate !== undefined)
        config.genetic.mutationRate = args.mutationRate;
      if (args.crossoverRate !== undefined)
        config.genetic.crossoverRate = args.crossoverRate;
      if (args.elitismRate !== undefined)
        config.genetic.elitismRate = args.elitismRate;
      if (args.gamesPerAgent !== undefined)
        config.fitness.gamesPerIndividual = args.gamesPerAgent;
      if (args.maxGameTime !== undefined)
        config.fitness.maxGameTime = args.maxGameTime;
      if (args.seed !== undefined) config.seed = args.seed;
      if (args.sessionName !== undefined) config.sessionName = args.sessionName;
    } else {
      config = createTrainingConfig(args);
    }

    // Save configuration if requested
    if (args.saveConfig) {
      console.log(`Saving configuration to: ${args.saveConfig}`);
      const tempTrainer = new Trainer(config);
      await tempTrainer.saveConfig(args.saveConfig);
      console.log('Configuration saved successfully!');
      return;
    }

    // Display training configuration
    console.log('🔬 Training Configuration:');
    console.log(`  Generations: ${config.genetic.maxGenerations}`);
    console.log(`  Population Size: ${config.genetic.populationSize}`);
    console.log(`  Mutation Rate: ${config.genetic.mutationRate}`);
    console.log(`  Crossover Rate: ${config.genetic.crossoverRate}`);
    console.log(`  Elitism Rate: ${config.genetic.elitismRate}`);
    console.log(`  Games per Agent: ${config.fitness.gamesPerIndividual}`);
    console.log(`  Max Game Time: ${config.fitness.maxGameTime}s`);
    console.log(`  Random Seed: ${config.seed}`);
    console.log(`  Session Name: ${config.sessionName || 'auto-generated'}`);
    console.log(
      `  Network Architecture: [${config.networkArchitecture.join(', ')}]`
    );
    console.log('');

    // Create trainer
    const trainer = new Trainer(config);
    setupProgressReporting(trainer, args.verbose || false);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received interrupt signal, stopping training...');
      trainer.stopTraining();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received terminate signal, stopping training...');
      trainer.stopTraining();
    });

    // Start training
    console.log('🚀 Starting training...');
    console.log('Press Ctrl+C to stop training gracefully');
    console.log('');

    const sessionId = await trainer.startTraining();

    // Display final results
    const dataCollector = trainer.getDataCollector();
    const sessionData = dataCollector.getSession(sessionId);

    if (sessionData) {
      console.log('\n📊 Training Summary:');
      console.log(`  Session ID: ${sessionId}`);
      console.log(`  Total Generations: ${sessionData.generations.length}`);
      const totalTime = sessionData.endTime
        ? sessionData.endTime.getTime() - sessionData.startTime.getTime()
        : 0;
      console.log(`  Training Time: ${formatTime(totalTime)}`);
      console.log(
        `  Final Best Fitness: ${sessionData.bestFitness.toFixed(4)}`
      );
      console.log(`  Status: ${sessionData.status}`);

      // Show weights file location
      const weightsDir = './src/weights';
      console.log(`\n💾 Trained weights saved to: ${weightsDir}/`);
      console.log('   Use these weights with NNActor in your games!');
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
