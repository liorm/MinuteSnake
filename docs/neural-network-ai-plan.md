# Neural Network AI Agent Implementation Plan

## Overview
Implement a neural network-based AI agent for MinuteSnake with a training system that uses the existing game backend to optimize agent performance. Each phase will be implemented by a subagent and committed separately.

## Implementation Phases

### Phase 1: Neural Network Agent Foundation
**Subagent Task**: Create core NN infrastructure and NNActor implementation

#### Tasks:
- [x] Create neural network implementation with forward propagation (`src/ml/neural-network.ts`)
- [x] Implement state encoder to convert game state to NN input (`src/ml/state-encoder.ts`)
- [x] Create NNActor class implementing IActor interface (`src/actors/nn-actor.ts`)
- [x] Add weight loading system from JSON files (`src/ml/weight-loader.ts`)
- [x] Create weights directory structure with default weights (`src/weights/`)
- [x] Write comprehensive tests for NN components
- [x] Update actors index to export NNActor

**Status**: ✅ **COMPLETED** - Commits: `7d92c76`, `f38343c`

#### Technical Details:
- **Network Architecture**: Input layer (64 neurons) → Hidden layers (128, 64) → Output (4 directions)
- **State Encoding**: Snake positions, apple location, distances, collision risks
- **Weight Format**: JSON with layers, weights, biases, and metadata
- **Integration**: Implements existing `IActor` interface for seamless integration
- **Testing**: Added NN Players option to welcome screen for easy testing with random weights

### Phase 2: Training System Infrastructure
**Subagent Task**: Build genetic algorithm training system

#### Tasks:
- [ ] Implement genetic algorithm for weight optimization (`src/ml/genetic-algorithm.ts`)
- [ ] Create fitness evaluation system using existing GameLogic (`src/ml/fitness-evaluator.ts`)
- [ ] Add training data collection and storage (`src/ml/data-collector.ts`)
- [ ] Build training orchestrator with configurable parameters (`src/ml/trainer.ts`)
- [ ] Add training progress monitoring and logging
- [ ] Write comprehensive tests for training components

**Commit**: `feat: implement genetic algorithm training system for neural network`

#### Technical Details:
- **Genetic Algorithm**: Population-based evolution with crossover and mutation
- **Fitness Function**: Survival time + score + efficiency - collision penalties
- **Training Process**: Initialize population → Evaluate fitness → Select parents → Breed → Mutate → Repeat
- **Configuration**: Configurable population size, mutation rate, generations

### Phase 3: Integration & CLI Tools
**Subagent Task**: Add training commands and complete integration

#### Tasks:
- [ ] Add training CLI commands to package.json scripts
- [ ] Create training script (`src/scripts/train.ts`)
- [ ] Create evaluation script (`src/scripts/evaluate.ts`)
- [ ] Generate sample trained weights for demonstration
- [ ] Add comprehensive test coverage for training system
- [ ] Update CLAUDE.md with training instructions and architecture details
- [ ] Add performance benchmarking tools

**Commit**: `feat: add training CLI tools and complete NN agent integration`

#### Technical Details:
- **CLI Commands**: `npm run train`, `npm run evaluate`, `npm run benchmark`
- **Training Script**: Configurable training parameters, progress monitoring
- **Evaluation Tools**: Performance comparison between AI types
- **Documentation**: Complete usage instructions and architecture overview

## Architecture Overview

### Neural Network Design
```
Input Layer (64 neurons)
├── Snake head position (normalized x, y)
├── Snake body relative positions (up to 20 segments)
├── Apple position and type
├── Distance to walls (4 directions)
├── Collision risks (8 directions)
├── Snake length and target length
└── Game state features

Hidden Layer 1 (128 neurons, ReLU)
├── Pattern recognition
└── Feature extraction

Hidden Layer 2 (64 neurons, ReLU)
├── Decision processing
└── Strategy formation

Output Layer (4 neurons, Softmax)
├── UP probability
├── DOWN probability
├── LEFT probability
└── RIGHT probability
```

### State Encoding Strategy
```typescript
interface NeuralNetworkInput {
  // Snake state (16 values)
  snakeHeadX: number;           // normalized 0-1
  snakeHeadY: number;           // normalized 0-1
  snakeLength: number;          // normalized 0-1
  snakeTargetLength: number;    // normalized 0-1
  snakeBodyPositions: number[]; // up to 12 relative positions
  
  // Apple state (4 values)
  appleX: number;               // normalized 0-1
  appleY: number;               // normalized 0-1
  appleType: number;            // 0=normal, 1=diet
  appleDistance: number;        // normalized 0-1
  
  // Environment state (32 values)
  wallDistances: number[];      // 4 directions
  collisionRisks: number[];     // 8 directions
  safetyScores: number[];       // 8 directions
  otherSnakeDistances: number[]; // up to 12 values
  
  // Game state (8 values)
  gameSpeed: number;            // normalized 0-1
  gameTime: number;             // normalized 0-1
  score: number;                // normalized 0-1
  reserved: number[];           // 5 reserved for future features
}
```

### Training Configuration
```typescript
interface TrainingConfig {
  populationSize: number;       // Default: 100
  generations: number;          // Default: 1000
  mutationRate: number;         // Default: 0.1
  crossoverRate: number;        // Default: 0.7
  elitismRate: number;          // Default: 0.1
  gameTimeLimit: number;        // Default: 60 seconds
  gamesPerAgent: number;        // Default: 5
  fitnessWeights: {
    survival: number;           // Default: 0.4
    score: number;              // Default: 0.3
    efficiency: number;         // Default: 0.2
    exploration: number;        // Default: 0.1
  };
}
```

### File Structure
```
src/
├── actors/
│   ├── nn-actor.ts          # Neural network actor implementation
│   └── index.ts             # Export new actor
├── ml/                      # New ML directory
│   ├── neural-network.ts    # Core NN implementation
│   ├── state-encoder.ts     # Game state to NN input conversion
│   ├── weight-loader.ts     # Weight file loading
│   ├── trainer.ts           # Main training orchestrator
│   ├── genetic-algorithm.ts # Genetic algorithm implementation
│   ├── fitness-evaluator.ts # Fitness calculation
│   └── data-collector.ts    # Training data collection
├── weights/                 # New weights directory
│   ├── default.json         # Default trained weights
│   └── examples/            # Example weight files
└── scripts/                 # Training scripts
    ├── train.ts             # Training script
    └── evaluate.ts          # Evaluation script
```

### Weight File Format
```json
{
  "version": "1.0",
  "metadata": {
    "architecture": [64, 128, 64, 4],
    "trainedGenerations": 1000,
    "fitnessScore": 0.85,
    "trainingDate": "2024-01-01T00:00:00Z",
    "trainingConfig": {
      "populationSize": 100,
      "mutationRate": 0.1,
      "crossoverRate": 0.7
    }
  },
  "layers": [
    {
      "inputSize": 64,
      "outputSize": 128,
      "weights": [
        [0.1, 0.2, ...],
        [0.3, 0.4, ...],
        ...
      ],
      "biases": [0.1, 0.2, ...]
    },
    {
      "inputSize": 128,
      "outputSize": 64,
      "weights": [...],
      "biases": [...]
    },
    {
      "inputSize": 64,
      "outputSize": 4,
      "weights": [...],
      "biases": [...]
    }
  ]
}
```

## Implementation Strategy

### Subagent Approach
- Each phase will be handled by a separate subagent to maintain focus
- Commits will be made after each phase completion
- Each phase builds upon the previous phase's foundation
- Testing will be comprehensive at each phase
- Documentation will be updated throughout

### Testing Strategy
- **Unit Tests**: All NN components, state encoder, weight loader
- **Integration Tests**: NNActor with game logic, training system
- **Performance Tests**: Benchmarking against existing AI
- **Validation Tests**: Weight loading, network forward propagation
- **Training Tests**: Genetic algorithm, fitness evaluation

### Quality Assurance
- **Code Coverage**: Minimum 80% coverage for all ML components
- **Performance**: NN inference should complete within 1ms
- **Memory**: Training should not exceed 1GB RAM usage
- **Determinism**: Same weights should produce identical outputs
- **Validation**: Trained agents should outperform random play

## Expected Outcomes

### Performance Improvements
- **Better Decision Making**: NN agents can learn complex strategies
- **Adaptive Behavior**: Agents adapt to different game situations
- **Configurable Difficulty**: Different trained models for skill levels
- **Scalability**: Training system can evolve agents over time

### Research Benefits
- **ML Platform**: Foundation for experimenting with different approaches
- **Educational Value**: Demonstrates practical ML implementation
- **Extensibility**: Easy to add new input features or network architectures
- **Community**: Shareable weight files for different play styles

## Success Metrics
- NNActor successfully implements IActor interface
- Training system can evolve agents over 1000+ generations
- Trained agents achieve higher average scores than current AI
- Training documentation is complete and usable
- All tests pass with good coverage
- Performance meets requirements (1ms inference, 1GB training)

## Future Enhancements
- **Deep Q-Learning**: Implement DQN for more sophisticated learning
- **Transfer Learning**: Pre-trained models for different game variations
- **Multi-Agent Training**: Competitive training between multiple agents
- **Real-time Learning**: Agents that learn during gameplay
- **Neural Architecture Search**: Automated network design optimization