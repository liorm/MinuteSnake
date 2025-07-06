# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Core Development Commands
- `npm run build` - Build project for development with sourcemaps
- `npm run build:prod` - Build project for production (minified, no sourcemaps)
- `npm run dev` - Start development build with watch mode
- `npm run serve` - Start local development server with watch mode on port 8080

### Code Quality Commands
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting with Prettier

### Testing Commands
- `npm run test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Neural Network Training Commands
- `npm run train` - Train neural network AI agents using genetic algorithm
- `npm run evaluate` - Evaluate and compare performance of different AI agents
- `npm run benchmark` - Benchmark neural network inference performance

### Git Hooks
- **Pre-commit hook** - Automatically runs before each commit:
  - `npm run lint` - Ensures code follows ESLint rules
  - `npm run format:check` - Verifies code is properly formatted
  - `npm run test` - Runs all tests to ensure no regressions
  - Commit is blocked if any check fails

## Architecture Overview

MinuteSnake is a modern Snake game implementation using TypeScript, Canvas API, and a modular architecture:

### Core Components

1. **GameApp** (`src/app.ts`) - Main entry point that initializes canvas and creates GameEngine
2. **GameEngine** (`src/game-engine.ts`) - Central orchestrator managing game loop, input handling, and state coordination
3. **GameRenderer** (`src/game-renderer.ts`) - Handles all visual rendering on HTML canvas
4. **GameLogic** (`src/backend/game-logic.ts`) - Core game rules, state management, and collision detection
5. **Actor System** (`src/actors/`) - Interface and implementations for game entities:
   - `IActor` interface (`src/actors/actor.ts`) - Base interface for all game actors
   - `HumanActor` (`src/actors/human-actor.ts`) - Human player keyboard input handling
   - `AIActor` (`src/actors/ai-actor.ts`) - AI player decision making and pathfinding
   - `NNActor` (`src/actors/nn-actor.ts`) - Neural network-based AI player with trainable behavior
6. **State Handlers** (`src/backend/state-handlers.ts`) - LiveHandler for active gameplay, PlaybackHandler for replay mode

### Key Design Patterns

- **Actor Pattern**: Human and AI players implement `IActor` interface for consistent input handling
- **State Handler Pattern**: Different game modes (live vs playback) managed through `GameHandlerBase` implementations
- **Separation of Concerns**: GameLogic handles rules, GameRenderer handles visuals, GameEngine coordinates
- **Deterministic Gameplay**: Uses seeded random number generator for reproducible apple placement

### State Management Flow

1. GameEngine runs main loop with `requestAnimationFrame`
2. Actors receive state updates via `onStateUpdate()` and return `GameInput`
3. GameEngine routes inputs to current state handler (LiveHandler/PlaybackHandler)
4. State handlers use GameLogic to update game state
5. GameRenderer draws updated state to canvas

## Game Features

### Apple System
- **Normal Apples** (90% spawn rate) - Increase snake target length by 3 tiles
- **Diet Apples** (10% spawn rate) - Reduce snake target length to 50% of current

### Snake Length System
- Snakes have both current `length` and `targetLength` properties
- Length adjusts gradually (1 tile per step) towards target length
- Diet apples provide strategic shrinking when snake becomes too long

### AI Behavior
- **Traditional AI** (`AIActor`): Uses pathfinding to reach apples while avoiding obstacles
- **Neural Network AI** (`NNActor`): Machine learning-based decision making with trainable behavior
- Smart collision avoidance with walls, other snakes, and their own body
- Configurable safety radius for avoiding other snakes
- Adaptive wall avoidance (ignores wall safety when apple is near walls)

### Multi-Player Support
- Up to 2 human players with different key mappings (Arrow keys, WASD)
- Up to 4 AI players can be added (traditional or neural network)
- Players can be mixed (human + AI + NN simultaneously)

## Neural Network AI System

### Architecture Overview
The neural network AI system provides trainable agents that can learn to play Snake through genetic algorithm optimization.

#### Components
- **NeuralNetwork** (`src/ml/neural-network.ts`) - Feed-forward neural network implementation
- **StateEncoder** (`src/ml/state-encoder.ts`) - Converts game state to neural network input
- **NNActor** (`src/actors/nn-actor.ts`) - Actor implementation using neural network for decisions
- **Trainer** (`src/ml/trainer.ts`) - Main training orchestrator with genetic algorithm
- **FitnessEvaluator** (`src/ml/fitness-evaluator.ts`) - Evaluates agent performance through gameplay
- **WeightLoader** (`src/ml/weight-loader.ts`) - Saves and loads trained neural network weights

#### Network Architecture
- **Input Layer**: 64 neurons (game state encoding)
- **Hidden Layer 1**: 128 neurons (ReLU activation)
- **Hidden Layer 2**: 64 neurons (ReLU activation)
- **Output Layer**: 4 neurons (direction probabilities with softmax)

#### Training Process
1. **Population Initialization**: Create random neural network weights
2. **Fitness Evaluation**: Each agent plays multiple games to assess performance
3. **Selection**: Best performing agents are selected for reproduction
4. **Crossover**: Combine weights from parent agents to create offspring
5. **Mutation**: Apply random changes to weights to maintain diversity
6. **Iteration**: Repeat process for multiple generations

#### Usage Examples
```bash
# Basic training with default settings
npm run train

# Custom training configuration
npm run train --generations 500 --population-size 50 --mutation-rate 0.05

# Evaluate trained agents
npm run evaluate

# Compare neural network vs traditional AI
npm run evaluate --compare-ai

# Benchmark inference performance
npm run benchmark
```

#### Weight Files
Trained neural network weights are stored in `src/weights/` directory:
- `default.json` - Default untrained weights
- `examples/` - Sample trained weights with different skill levels
- Custom trained weights saved automatically during training

## Development Notes

- Build system uses esbuild for fast bundling
- ESLint configured with strict TypeScript rules and explicit function return types
- Tests use Vitest with global test functions
- Game supports human, traditional AI, and neural network AI players simultaneously
- Replay functionality built into core architecture
- Deterministic apple placement using seeded random number generator
- Neural network training uses genetic algorithm with configurable parameters