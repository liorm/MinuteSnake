# Neural Network Performance Optimization Guide

## Overview

This guide provides recommendations for optimizing neural network training and inference performance in MinuteSnake. Follow these guidelines to achieve faster training times, better convergence, and efficient gameplay.

## Training Performance Optimization

### 1. Population Size Optimization

**Small Populations (20-50 agents)**
- **Pros**: Faster generations, lower memory usage
- **Cons**: Less genetic diversity, higher chance of local optima
- **Best for**: Quick experiments, initial parameter tuning

**Medium Populations (50-150 agents)**
- **Pros**: Good balance of speed and diversity
- **Cons**: Moderate resource requirements
- **Best for**: Production training, balanced results

**Large Populations (150-500 agents)**
- **Pros**: Maximum diversity, better global optima
- **Cons**: Slower training, high memory usage
- **Best for**: Research, final optimization runs

### 2. Genetic Algorithm Parameters

#### Mutation Rate Optimization
```typescript
// Conservative approach (stable convergence)
mutationRate: 0.05 - 0.08

// Balanced approach (good exploration)
mutationRate: 0.08 - 0.12

// Aggressive approach (maximum exploration)
mutationRate: 0.12 - 0.20
```

#### Crossover Rate Optimization
```typescript
// Conservative (preserve good solutions)
crossoverRate: 0.5 - 0.7

// Balanced (standard genetic mixing)
crossoverRate: 0.7 - 0.8

// Aggressive (maximum recombination)
crossoverRate: 0.8 - 0.9
```

### 3. Fitness Evaluation Optimization

#### Games Per Agent Configuration
```bash
# Fast iteration (less accurate fitness)
--games-per-agent 3

# Balanced approach (good accuracy/speed)
--games-per-agent 5

# High accuracy (slower but more reliable)
--games-per-agent 10
```

#### Game Time Limits
```bash
# Quick evaluation (basic behavior)
--game-time-limit 30

# Standard evaluation (normal gameplay)
--game-time-limit 60

# Extended evaluation (long-term strategies)
--game-time-limit 120
```

### 4. Training Strategies

#### Multi-Stage Training
```bash
# Stage 1: Basic survival training (fast)
npm run train -- --generations 200 --population-size 50 --mutation-rate 0.15 --game-time-limit 30

# Stage 2: Strategy development (balanced)
npm run train -- --generations 500 --population-size 100 --mutation-rate 0.08 --game-time-limit 60

# Stage 3: Fine-tuning (slow but precise)
npm run train -- --generations 300 --population-size 150 --mutation-rate 0.05 --game-time-limit 90
```

#### Curriculum Learning
```bash
# Start with easier conditions
npm run train -- --generations 300 --game-speed 0.5 --apple-spawn-rate 0.8

# Progress to normal conditions
npm run train -- --generations 500 --game-speed 1.0 --apple-spawn-rate 0.6

# End with challenging conditions
npm run train -- --generations 200 --game-speed 1.5 --apple-spawn-rate 0.4
```

## Inference Performance Optimization

### 1. Network Architecture Optimization

#### Standard Architecture (Current)
```typescript
const architecture = [64, 128, 64, 4];
// Parameters: 13,568
// Inference time: ~0.5ms
// Memory usage: ~54KB
```

#### Lightweight Architecture (Faster)
```typescript
const architecture = [64, 96, 32, 4];
// Parameters: 9,408
// Inference time: ~0.3ms
// Memory usage: ~37KB
```

#### Heavy Architecture (More Accurate)
```typescript
const architecture = [64, 256, 128, 4];
// Parameters: 50,176
// Inference time: ~1.2ms
// Memory usage: ~200KB
```

### 2. State Encoding Optimization

#### Reduce Input Features
```typescript
// Current: 64 features
// Optimized: 32 features (remove less important features)
interface OptimizedInput {
  snakeHead: [number, number];           // 2 features
  snakeLength: number;                   // 1 feature
  apple: [number, number, number];       // 3 features (x, y, type)
  wallDistances: [number, number, number, number]; // 4 features
  collisionRisks: [number, number, number, number]; // 4 features
  bodySegments: number[];                // 18 features (reduced from 24)
}
```

#### Quantized Input
```typescript
// Reduce precision for faster computation
function quantizeInput(value: number, levels: number = 8): number {
  return Math.round(value * (levels - 1)) / (levels - 1);
}
```

### 3. Batch Processing (For Training)

#### Parallel Fitness Evaluation
```typescript
// Process multiple agents simultaneously
const batchSize = 10;
const results = await Promise.all(
  agents.slice(0, batchSize).map(agent => evaluateFitness(agent))
);
```

#### Vectorized Operations
```typescript
// Process multiple networks with same input
function batchForward(networks: NeuralNetwork[], input: number[]): number[][] {
  return networks.map(net => net.forward(input));
}
```

## Memory Optimization

### 1. Training Memory Management

#### Batch Processing
```typescript
// Process population in batches to reduce memory usage
const batchSize = 50;
for (let i = 0; i < population.length; i += batchSize) {
  const batch = population.slice(i, i + batchSize);
  await processBatch(batch);
}
```

#### Garbage Collection
```typescript
// Explicit cleanup after each generation
function cleanupGeneration(): void {
  // Clear temporary fitness scores
  fitnessScores.length = 0;
  
  // Clear game state caches
  gameStateCache.clear();
  
  // Force garbage collection (Node.js)
  if (global.gc) {
    global.gc();
  }
}
```

### 2. Network Storage Optimization

#### Compressed Weight Format
```typescript
// Use Float32Array instead of regular arrays
interface CompressedLayer {
  weights: Float32Array;
  biases: Float32Array;
  inputSize: number;
  outputSize: number;
}
```

#### Weight Quantization
```typescript
// Reduce weight precision for smaller files
function quantizeWeights(weights: number[], bits: number = 8): number[] {
  const scale = (1 << bits) - 1;
  return weights.map(w => Math.round(w * scale) / scale);
}
```

## System Performance Optimization

### 1. Hardware Utilization

#### Multi-Core Processing
```bash
# Enable parallel processing (if available)
export UV_THREADPOOL_SIZE=8
npm run train -- --parallel-workers 4
```

#### Memory Allocation
```bash
# Increase Node.js memory limit for large populations
export NODE_OPTIONS="--max-old-space-size=4096"
npm run train -- --population-size 500
```

### 2. Monitoring and Profiling

#### Performance Metrics
```typescript
interface PerformanceMetrics {
  generationTime: number;        // Time per generation
  fitnessEvalTime: number;       // Time per fitness evaluation
  networkInferenceTime: number;  // Time per network forward pass
  memoryUsage: number;           // Peak memory usage
  convergenceRate: number;       // Fitness improvement rate
}
```

#### Profiling Tools
```bash
# Profile training performance
npm run train -- --profile --generations 10

# Benchmark inference speed
npm run benchmark -- --iterations 1000

# Memory profiling
npm run train -- --memory-profile --generations 50
```

## Configuration Recommendations

### 1. Development Environment
```bash
# Fast iteration for development
npm run train -- \
  --generations 50 \
  --population-size 30 \
  --mutation-rate 0.12 \
  --games-per-agent 3 \
  --game-time-limit 30
```

### 2. Production Training
```bash
# Balanced training for production use
npm run train -- \
  --generations 800 \
  --population-size 100 \
  --mutation-rate 0.08 \
  --games-per-agent 5 \
  --game-time-limit 60
```

### 3. Research/Experimentation
```bash
# Maximum quality for research
npm run train -- \
  --generations 2000 \
  --population-size 200 \
  --mutation-rate 0.06 \
  --games-per-agent 10 \
  --game-time-limit 90
```

## Benchmarking and Validation

### 1. Performance Benchmarks
```bash
# Measure training performance
npm run benchmark -- --type training --generations 100

# Measure inference performance
npm run benchmark -- --type inference --iterations 10000

# Measure memory usage
npm run benchmark -- --type memory --population-size 500
```

### 2. Quality Metrics
```typescript
interface QualityMetrics {
  convergenceSpeed: number;      // Generations to reach target fitness
  finalPerformance: number;      // Best fitness achieved
  stability: number;             // Fitness variance across runs
  gameplayQuality: number;       // Human evaluation score
}
```

## Troubleshooting Performance Issues

### 1. Slow Training
**Symptoms**: Training takes hours for few generations
**Solutions**:
- Reduce population size
- Decrease games per agent
- Shorter game time limits
- Use multi-core processing

### 2. Poor Convergence
**Symptoms**: Fitness plateaus quickly
**Solutions**:
- Increase mutation rate
- Larger population size
- Different initialization strategy
- Adjust fitness function

### 3. Memory Issues
**Symptoms**: Out of memory errors
**Solutions**:
- Batch processing
- Reduce population size
- Use compressed weight format
- Increase system memory

### 4. Unstable Training
**Symptoms**: Fitness fluctuates wildly
**Solutions**:
- Increase games per agent
- Reduce mutation rate
- Add elitism
- Longer game time limits

## Best Practices Summary

### ✅ Do
- Start with small populations for initial experiments
- Use progressive training (start easy, increase difficulty)
- Monitor convergence regularly
- Save checkpoints frequently
- Profile performance bottlenecks
- Use appropriate hardware resources

### ❌ Don't
- Use enormous populations unless necessary
- Train for too many generations without monitoring
- Ignore memory usage warnings
- Use very high mutation rates initially
- Skip validation testing
- Forget to save successful configurations

## Performance Monitoring Commands

```bash
# Monitor training progress
npm run train -- --verbose --progress-interval 10

# Performance profiling
npm run train -- --profile --output-stats training-stats.json

# Memory usage tracking
npm run train -- --memory-monitor --log-interval 100

# Benchmarking comparison
npm run benchmark -- --compare-configs config1.json config2.json
```

This optimization guide should help you achieve optimal performance for your neural network training and inference needs. Remember to measure and validate improvements to ensure they provide real benefits for your specific use case.