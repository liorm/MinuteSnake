import { describe, it, expect, vi } from 'vitest';
import { EDirection, IGameStage, GameLogic } from './game-logic';
import { Vector } from './utils';

describe('GameLogic - Input', () => {
  const _defaultStage: IGameStage = {
    xTiles: 20,
    yTiles: 15,
    seed: 12345,
    wallHoles: [],
    blocks: [],
    snakes: [{ position: new Vector(5, 5), direction: EDirection.RIGHT }],
  };

  describe('Direction Input', () => {
    it('should add a valid direction to pendingDirs for the correct snake', () => {
      const stage: IGameStage = {
        ..._defaultStage,
        snakes: [
          { position: new Vector(5, 5), direction: EDirection.RIGHT },
          { position: new Vector(10, 10), direction: EDirection.LEFT },
        ],
      };

      const game = new GameLogic(stage);
      let inputHandled = false;

      game.onInputCallback = () => {
        inputHandled = true;
      };

      expect(game.state.snakes[0].pendingDirs).toEqual([]);
      expect(game.state.snakes[1].pendingDirs).toEqual([]);

      game.input({
        inputType: 'direction',
        dir: EDirection.UP,
        snakeIdx: 0,
      });

      expect(game.state.snakes[0].pendingDirs).toEqual([EDirection.UP]);
      expect(game.state.snakes[1].pendingDirs).toEqual([]);
      expect(inputHandled).toBe(true);
    });

    it("should not add a direction if it's the same as the current direction", () => {
      const game = new GameLogic(_defaultStage);
      let inputHandled = false;

      game.onInputCallback = () => {
        inputHandled = true;
      };

      expect(game.state.snakes[0].pendingDirs).toEqual([]);

      game.input({
        inputType: 'direction',
        dir: EDirection.RIGHT,
        snakeIdx: 0,
      });

      expect(game.state.snakes[0].pendingDirs).toEqual([]);
      expect(inputHandled).toBe(false);
    });

    it("should not add a direction if it's opposite to the current direction", () => {
      const stage: IGameStage = {
        ..._defaultStage,
        snakes: [
          { position: new Vector(5, 5), direction: EDirection.RIGHT },
          { position: new Vector(10, 10), direction: EDirection.UP },
        ],
      };

      const game = new GameLogic(stage);
      let inputHandled = false;

      game.onInputCallback = () => {
        inputHandled = true;
      };

      expect(game.state.snakes[0].pendingDirs).toEqual([]);
      game.input({
        inputType: 'direction',
        dir: EDirection.LEFT,
        snakeIdx: 0,
      });
      expect(game.state.snakes[0].pendingDirs).toEqual([]);
      expect(inputHandled).toBe(false);

      expect(game.state.snakes[1].pendingDirs).toEqual([]);
      game.input({
        inputType: 'direction',
        dir: EDirection.DOWN,
        snakeIdx: 1,
      });
      expect(game.state.snakes[1].pendingDirs).toEqual([]);
      expect(inputHandled).toBe(false);
    });

    it('should not add more than 2 pending directions', () => {
      const game = new GameLogic(_defaultStage);
      let callbackCount = 0;

      game.onInputCallback = () => {
        callbackCount++;
      };

      expect(game.state.snakes[0].pendingDirs).toEqual([]);

      game.input({
        inputType: 'direction',
        dir: EDirection.UP,
        snakeIdx: 0,
      });

      expect(game.state.snakes[0].pendingDirs).toEqual([EDirection.UP]);
      expect(callbackCount).toBe(1);

      game.input({
        inputType: 'direction',
        dir: EDirection.LEFT,
        snakeIdx: 0,
      });

      expect(game.state.snakes[0].pendingDirs).toEqual([
        EDirection.UP,
        EDirection.LEFT,
      ]);
      expect(callbackCount).toBe(2);

      game.input({
        inputType: 'direction',
        dir: EDirection.DOWN,
        snakeIdx: 0,
      });

      expect(game.state.snakes[0].pendingDirs).toEqual([
        EDirection.UP,
        EDirection.LEFT,
      ]);
      expect(callbackCount).toBe(2);
    });

    it('should call onInputCallback if input is handled and callback is defined', () => {
      const game = new GameLogic(_defaultStage);
      const mockCallback = vi.fn();
      game.onInputCallback = mockCallback;

      const validInput = {
        inputType: 'direction' as const,
        dir: EDirection.UP,
        snakeIdx: 0,
      };
      game.input(validInput);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({
        eventTime: 0,
        gameInput: validInput,
      });

      const invalidInput = {
        inputType: 'direction' as const,
        dir: EDirection.UP,
        snakeIdx: 0,
      };
      game.input(invalidInput);

      expect(mockCallback).toHaveBeenCalledTimes(1);

      game.onInputCallback = undefined;
      const newInput = {
        inputType: 'direction' as const,
        dir: EDirection.LEFT,
        snakeIdx: 0,
      };

      expect(() => game.input(newInput)).not.toThrow();
    });
  });

  describe('Speed Input', () => {
    it('should change the game speed by speedIncrement', () => {
      const game = new GameLogic(_defaultStage);
      let inputHandled = false;

      game.onInputCallback = () => {
        inputHandled = true;
      };

      expect(game.state.speed).toBe(12);

      game.input({
        inputType: 'speed',
        speedIncrement: 5,
      });

      expect(game.state.speed).toBe(17);
      expect(inputHandled).toBe(true);

      inputHandled = false;

      game.input({
        inputType: 'speed',
        speedIncrement: -3,
      });

      expect(game.state.speed).toBe(14);
      expect(inputHandled).toBe(true);
    });

    it('should clamp speed between 1 and 1000', () => {
      const game = new GameLogic(_defaultStage);

      game.input({
        inputType: 'speed',
        speedIncrement: -1000,
      });
      expect(game.state.speed).toBe(1);

      game.input({
        inputType: 'speed',
        speedIncrement: -5,
      });
      expect(game.state.speed).toBe(1);

      game.input({
        inputType: 'speed',
        speedIncrement: 1,
      });
      expect(game.state.speed).toBe(2);

      game.input({
        inputType: 'speed',
        speedIncrement: -1,
      });
      expect(game.state.speed).toBe(1);

      game.input({
        inputType: 'speed',
        speedIncrement: 2000,
      });
      expect(game.state.speed).toBe(1000);

      game.input({
        inputType: 'speed',
        speedIncrement: 500,
      });
      expect(game.state.speed).toBe(1000);

      game.input({
        inputType: 'speed',
        speedIncrement: -1,
      });
      expect(game.state.speed).toBe(999);

      game.input({
        inputType: 'speed',
        speedIncrement: 1,
      });
      expect(game.state.speed).toBe(1000);
    });

    it('should call onInputCallback if input is handled and callback is defined', () => {
      const game = new GameLogic(_defaultStage);
      const mockCallback = vi.fn();
      game.onInputCallback = mockCallback;

      const validInput = {
        inputType: 'speed' as const,
        speedIncrement: 5,
      };
      game.input(validInput);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({
        eventTime: 0,
        gameInput: validInput,
      });

      game.onInputCallback = undefined;
      const newInput = {
        inputType: 'speed' as const,
        speedIncrement: 3,
      };

      expect(() => game.input(newInput)).not.toThrow();
    });
  });
});
