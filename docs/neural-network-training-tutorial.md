# Neural Network Training Tutorial

## Quick Start

### Basic Training
```bash
# Train a neural network with default settings
npm run train

# Train with custom parameters
npm run train -- --generations 500 --population-size 50 --mutation-rate 0.05
```

### Evaluating Results
```bash
# Evaluate trained agents
npm run evaluate

# Compare neural network vs traditional AI
npm run evaluate -- --compare-ai

# Benchmark performance
npm run benchmark
```

## Understanding the Training Process

### How Neural Network Training Works

The MinuteSnake neural network AI uses a **genetic algorithm** to evolve snake-playing behavior:

1. **Population**: Start with 100 random neural networks
2. **Evaluation**: Each network plays 5 games to measure fitness
3. **Selection**: Best performers are chosen as parents
4. **Reproduction**: Create offspring through crossover and mutation
5. **Repeat**: Continue for many generations until performance converges

### Training Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `population-size` | 100 | Number of neural networks in each generation |
| `generations` | 1000 | Number of training iterations |
| `mutation-rate` | 0.1 | Probability of weight changes (0.0-1.0) |
| `crossover-rate` | 0.7 | Probability of parent mixing (0.0-1.0) |
| `elitism-rate` | 0.1 | Fraction of best agents preserved (0.0-1.0) |

## Step-by-Step Training Guide

### Step 1: Initial Training
```bash
# Start with a short training run to test the system
npm run train -- --generations 50 --population-size 20
```

**Expected Output:**
```
🧠 Neural Network Training Started
📊 Configuration: 20 agents, 50 generations
🎯 Target: Evolve snake-playing behavior

Generation 1/50: Best Fitness = 0.23 (avg: 0.15)
Generation 10/50: Best Fitness = 0.45 (avg: 0.32)
Generation 25/50: Best Fitness = 0.67 (avg: 0.51)
Generation 50/50: Best Fitness = 0.78 (avg: 0.64)

✅ Training Complete! Best weights saved to: src/weights/training_2024-01-01_12-00-00.json
```

### Step 2: Evaluate Progress
```bash
npm run evaluate -- --weights src/weights/training_2024-01-01_12-00-00.json
```

**Expected Output:**
```
🎮 Evaluating Neural Network Performance

Testing trained agent (50 games)...
📊 Results:
  - Average Score: 156 points
  - Average Survival: 42.3 seconds
  - Success Rate: 72% (games with score > 100)
  - Best Game: 324 points in 78 seconds

🤖 Comparison with Traditional AI:
  - NN Agent: 156 avg score vs AI Agent: 134 avg score
  - NN Agent: 42.3s survival vs AI Agent: 38.7s survival
  - Neural Network performs 16% better overall
```

### Step 3: Extended Training
```bash
# Run full training with optimal parameters
npm run train -- --generations 1000 --population-size 100 --mutation-rate 0.08
```

### Step 4: Test Your Agent
After training, test your agent in the game:

1. Run `npm run serve`
2. Open browser to http://localhost:8080
3. Select "2-4 NN Players" from the welcome screen
4. Choose your trained weight file
5. Watch your AI play!

## Best Practices

### Training Configuration

**For Quick Experiments:**
```bash
npm run train -- --generations 100 --population-size 50 --mutation-rate 0.12
```
- Fast iteration for testing ideas
- Higher mutation rate for more exploration
- Good for initial experiments

**For High-Quality Results:**
```bash
npm run train -- --generations 2000 --population-size 150 --mutation-rate 0.06
```
- Longer training for better convergence
- Lower mutation rate for fine-tuning
- Use for production-quality agents

**For Research/Experimentation:**
```bash
npm run train -- --generations 500 --population-size 200 --mutation-rate 0.15 --crossover-rate 0.8
```
- Larger population for diversity
- Higher rates for more genetic mixing
- Good for exploring new strategies

### Monitoring Training Progress

#### Fitness Score Interpretation
- **0.0-0.3**: Random/poor performance
- **0.3-0.6**: Basic snake behavior (avoiding walls)
- **0.6-0.8**: Good performance (eating apples, some strategy)
- **0.8-0.9**: Excellent performance (advanced strategies)
- **0.9-1.0**: Near-perfect play (very rare)

#### Convergence Indicators
- **Slow improvement**: Fitness increases by <0.05 per 50 generations
- **Plateau**: Best fitness unchanged for 200+ generations
- **Premature convergence**: All agents perform similarly too early

### Training Troubleshooting

#### Problem: Training Gets Stuck
```bash
# Solution: Increase mutation rate and population diversity
npm run train -- --mutation-rate 0.15 --population-size 120
```

#### Problem: Agents Don't Learn Basic Behavior
```bash
# Solution: Start with longer games and simpler fitness
npm run train -- --game-time-limit 120 --fitness-focus survival
```

#### Problem: Training Takes Too Long
```bash
# Solution: Reduce population size and generations
npm run train -- --generations 500 --population-size 75
```

### Weight File Management

#### Naming Convention
- `default.json` - Default starting weights
- `training_YYYY-MM-DD_HH-MM-SS.json` - Timestamped training results
- `experiment_description.json` - Named experiments
- `generation_X.json` - Checkpoint weights

#### Organizing Weights
```
src/weights/
├── default.json                    # Default weights
├── experiments/                    # Research experiments
│   ├── high_mutation_0.2.json      # High mutation experiment
│   └── large_population_500.json   # Large population experiment
├── production/                     # Best performing weights
│   ├── expert_level.json           # Expert gameplay
│   └── balanced_play.json          # Balanced strategy
└── archives/                       # Historical training runs
    ├── 2024-01-01/                 # Training session backups
    └── 2024-01-02/
```

## Advanced Training Techniques

### Multi-Stage Training
```bash
# Stage 1: Basic survival (high mutation)
npm run train -- --generations 300 --mutation-rate 0.2 --fitness-focus survival

# Stage 2: Score optimization (medium mutation)
npm run train -- --generations 500 --mutation-rate 0.1 --fitness-focus score --resume-from stage1.json

# Stage 3: Fine-tuning (low mutation)
npm run train -- --generations 200 --mutation-rate 0.05 --fitness-focus efficiency --resume-from stage2.json
```

### Comparative Training
```bash
# Train multiple agents with different parameters
npm run train -- --generations 1000 --mutation-rate 0.05 --output-name conservative.json
npm run train -- --generations 1000 --mutation-rate 0.15 --output-name aggressive.json

# Compare results
npm run evaluate -- --compare conservative.json aggressive.json
```

### Performance Optimization

#### Training Speed Tips
1. **Use smaller populations for initial experiments**
2. **Reduce games-per-agent for faster iteration**
3. **Use shorter game time limits during early training**
4. **Enable parallel evaluation when available**

#### Memory Management
- Training uses ~500MB RAM for default settings
- Larger populations increase memory usage linearly
- Save weights frequently to avoid losing progress

## Understanding Training Results

### Reading Training Logs
```
Generation 245/1000: Best Fitness = 0.742 (avg: 0.634) [↑0.018]
  Best Agent: Score=187, Survival=45.2s, Games=5/5
  Population: Min=0.234, Max=0.742, StdDev=0.156
  Genetics: Mutations=1247, Crossovers=67, Elites=10
```

**Key Metrics:**
- **Best Fitness**: Highest performing agent this generation
- **Average Fitness**: Population mean (measures overall improvement)
- **↑0.018**: Improvement from previous generation
- **StdDev**: Population diversity (higher = more exploration)

### Weight File Analysis
```bash
# Analyze weight statistics
npm run evaluate -- --analyze-weights src/weights/my_agent.json
```

**Output:**
```
📊 Weight Analysis: my_agent.json

Network Architecture: [64, 128, 64, 4]
Total Parameters: 13,568
Training Generations: 1000
Final Fitness Score: 0.847

Layer Statistics:
  Input → Hidden1: 8,192 weights, range [-2.34, 2.67]
  Hidden1 → Hidden2: 8,192 weights, range [-1.89, 2.11]
  Hidden2 → Output: 256 weights, range [-1.45, 1.78]

Performance Metrics:
  Average Score: 203 points
  Average Survival: 51.2 seconds
  Consistency: 0.78 (lower variance = more consistent)
```

## Common Training Scenarios

### Scenario 1: Training a Beginner-Friendly Agent
```bash
npm run train -- --generations 800 --population-size 80 --mutation-rate 0.09 --fitness-focus survival
```
**Goal**: Create an agent that plays safely and survives long
**Expected Result**: Agents that avoid walls and other snakes effectively

### Scenario 2: Training an Aggressive Score-Focused Agent
```bash
npm run train -- --generations 1200 --population-size 120 --mutation-rate 0.07 --fitness-focus score
```
**Goal**: Create an agent that maximizes score quickly
**Expected Result**: Agents that take calculated risks for higher scores

### Scenario 3: Training a Balanced Agent
```bash
npm run train -- --generations 1000 --population-size 100 --mutation-rate 0.08 --fitness-focus balanced
```
**Goal**: Create an agent with balanced survival and scoring
**Expected Result**: Agents that play strategically with good overall performance

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "Training stuck at low fitness"
**Symptoms**: Fitness stays below 0.4 for 200+ generations
**Solutions**:
- Increase mutation rate: `--mutation-rate 0.2`
- Increase population size: `--population-size 150`
- Check fitness function weighting
- Verify state encoder is providing useful information

#### Issue: "Agents perform well in training but poorly in game"
**Symptoms**: High fitness scores but poor actual gameplay
**Solutions**:
- Increase games-per-agent: `--games-per-agent 10`
- Add more diverse training scenarios
- Verify fitness function matches actual game objectives

#### Issue: "Training is too slow"
**Symptoms**: Training takes hours for small generation counts
**Solutions**:
- Reduce population size: `--population-size 50`
- Reduce games-per-agent: `--games-per-agent 3`
- Shorter game time limits: `--game-time-limit 30`
- Use faster hardware or parallel processing

#### Issue: "Agents all perform similarly"
**Symptoms**: Low standard deviation, similar fitness scores
**Solutions**:
- Increase mutation rate: `--mutation-rate 0.15`
- Reduce elitism rate: `--elitism-rate 0.05`
- Restart with fresh random population

### Getting Help

1. **Check the logs**: Training output contains diagnostic information
2. **Run evaluation**: Use `npm run evaluate` to get detailed performance metrics
3. **Benchmark**: Use `npm run benchmark` to verify system performance
4. **Experiment**: Try different parameter combinations
5. **Community**: Share weight files and results with other developers

## Next Steps

After completing this tutorial, you should be able to:
- ✅ Train neural network agents from scratch
- ✅ Evaluate and compare agent performance
- ✅ Adjust training parameters for different objectives
- ✅ Manage and organize weight files
- ✅ Troubleshoot common training issues

### Advanced Topics to Explore
- **Multi-agent competitive training**
- **Transfer learning between different game variations**
- **Custom fitness functions for specific behaviors**
- **Real-time learning during gameplay**
- **Neural architecture search and optimization**

Happy training! 🧠🐍