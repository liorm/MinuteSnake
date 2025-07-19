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

- AI snakes use pathfinding to reach apples while avoiding obstacles
- Smart collision avoidance with walls, other snakes, and their own body
- Configurable safety radius for avoiding other snakes
- Adaptive wall avoidance (ignores wall safety when apple is near walls)

### Multi-Player Support

- Up to 2 human players with different key mappings (Arrow keys, WASD)
- Up to 4 AI players can be added
- Players can be mixed (human + AI simultaneously)

## Development Notes

- Build system uses esbuild for fast bundling
- ESLint configured with strict TypeScript rules and explicit function return types
- Tests use Vitest with global test functions
- Game supports both human and AI players simultaneously
- Replay functionality built into core architecture
- Deterministic apple placement using seeded random number generator

## Task Management Notes

- Use @.claude/TM.md to understand how to use task management for development
