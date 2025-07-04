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

## Architecture Overview

MinuteSnake is a modern Snake game implementation using TypeScript, Canvas API, and a modular architecture:

### Core Components

1. **GameApp** (`src/app.ts`) - Main entry point that initializes canvas and creates GameEngine
2. **GameEngine** (`src/game-engine.ts`) - Central orchestrator managing game loop, input handling, and state coordination
3. **GameRenderer** (`src/game-renderer.ts`) - Handles all visual rendering on HTML canvas
4. **GameLogic** (`src/backend/game-logic.ts`) - Core game rules, state management, and collision detection
5. **Actor System** (`src/actors.ts`) - Interface and implementations for game entities (HumanActor, AIActor)
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

## Development Notes

- Build system uses esbuild for fast bundling
- ESLint configured with strict TypeScript rules and explicit function return types
- Tests use Vitest with global test functions
- Game supports both human and AI players simultaneously
- Replay functionality built into core architecture