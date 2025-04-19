import { describe, it, expect } from 'vitest';
import { EDirection, IGameStage, GameLogic } from './game-logic';
import { Vector } from './utils';

describe('GameLogic - Constructor', () => {
  it('should initialize the game state based on the provided IGameStage', () => {
    const stage: IGameStage = {
      xTiles: 10,
      yTiles: 8,
      seed: 12345,
      wallHoles: [],
      blocks: [new Vector(3, 3)],
      snakes: [{ position: new Vector(4, 4), direction: EDirection.RIGHT }],
    };

    const game = new GameLogic(stage);

    expect(game.state.blocks.length).toBeGreaterThan(1);
    expect(game.state.blocks).toContainEqual(new Vector(3, 3));
    expect(game.state.speed).toBe(12);
    expect(game.state.applePos).toBeNull();
    expect(game.state.gameOver).toBe(false);

    expect(game.state.snakes.length).toBe(1);
    expect(game.state.snakes[0].position).toEqual(new Vector(4, 4));
    expect(game.state.snakes[0].dir).toBe(EDirection.RIGHT);
    expect(game.state.snakes[0].length).toBe(4);
    expect(game.state.snakes[0].tiles).toEqual([]);
    expect(game.state.snakes[0].pendingDirs).toEqual([]);
  });

  it('should set up the PRNG with the correct seed', () => {
    const stage: IGameStage = {
      xTiles: 10,
      yTiles: 8,
      seed: 12345,
      wallHoles: [],
      blocks: [],
      snakes: [{ position: new Vector(4, 4), direction: EDirection.RIGHT }],
    };

    const game1 = new GameLogic(stage);
    const game2 = new GameLogic(stage);

    game1.advanceTime(1000);
    game2.advanceTime(1000);

    expect(game1.state.applePos).toEqual(game2.state.applePos);

    game1.state.applePos = null;
    game2.state.applePos = null;
    game1.advanceTime(1000);
    game2.advanceTime(1000);

    expect(game1.state.applePos).toEqual(game2.state.applePos);
  });

  it('should create initial blocks based on xTiles, yTiles, and wallHoles', () => {
    const stage: IGameStage = {
      xTiles: 5,
      yTiles: 4,
      seed: 12345,
      wallHoles: [new Vector(0, 1), new Vector(4, 2)],
      blocks: [new Vector(2, 2)],
      snakes: [{ position: new Vector(2, 1), direction: EDirection.RIGHT }],
    };

    const game = new GameLogic(stage);

    const perimeterBlocks = 2 * (stage.xTiles + stage.yTiles) - 4;
    const expectedBlocks =
      perimeterBlocks - stage.wallHoles.length + stage.blocks.length;

    expect(game.state.blocks.length).toBe(expectedBlocks);

    expect(game.state.blocks.some(b => b.equals(new Vector(0, 1)))).toBeFalsy();
    expect(game.state.blocks.some(b => b.equals(new Vector(4, 2)))).toBeFalsy();

    expect(
      game.state.blocks.some(b => b.equals(new Vector(2, 2)))
    ).toBeTruthy();

    expect(
      game.state.blocks.some(b => b.equals(new Vector(0, 0)))
    ).toBeTruthy();
    expect(
      game.state.blocks.some(b => b.equals(new Vector(4, 0)))
    ).toBeTruthy();
    expect(
      game.state.blocks.some(b => b.equals(new Vector(0, 3)))
    ).toBeTruthy();
    expect(
      game.state.blocks.some(b => b.equals(new Vector(4, 3)))
    ).toBeTruthy();
  });

  it('should initialize snakes with correct positions, lengths, directions, and empty pendingDirs', () => {
    const stage: IGameStage = {
      xTiles: 10,
      yTiles: 8,
      seed: 12345,
      wallHoles: [],
      blocks: [],
      snakes: [
        { position: new Vector(2, 2), direction: EDirection.RIGHT },
        { position: new Vector(7, 5), direction: EDirection.LEFT },
      ],
    };

    const game = new GameLogic(stage);

    expect(game.state.snakes.length).toBe(2);

    expect(game.state.snakes[0].position).toEqual(new Vector(2, 2));
    expect(game.state.snakes[0].dir).toBe(EDirection.RIGHT);
    expect(game.state.snakes[0].length).toBe(4);
    expect(game.state.snakes[0].tiles).toEqual([]);
    expect(game.state.snakes[0].pendingDirs).toEqual([]);

    expect(game.state.snakes[1].position).toEqual(new Vector(7, 5));
    expect(game.state.snakes[1].dir).toBe(EDirection.LEFT);
    expect(game.state.snakes[1].length).toBe(4);
    expect(game.state.snakes[1].tiles).toEqual([]);
    expect(game.state.snakes[1].pendingDirs).toEqual([]);
  });
});
