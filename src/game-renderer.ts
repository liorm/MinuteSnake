import { IGameOptions, IGameState, AppleType } from './backend/game-logic';
import { Vector } from './backend/utils';

/**
 * Defines the visual style for a game tile, supporting both
 * fill and optional stroke colors for various game elements
 * like snakes, apples, and walls.
 */
export interface ITileStyle {
  fillStyle: string;
  strokeStyle?: string;
}

/**
 * Handles all visual rendering aspects of the game using the HTML5 Canvas API.
 * Manages responsive sizing of the game board, draws all game elements
 * (snakes, apples, walls), and displays UI elements like the game over screen
 * and playback indicator.
 *
 * Example:
 * ```typescript
 * const renderer = new GameRenderer();
 * renderer.initRenderer(gameOptions);
 * renderer.onCanvasSizeChanged(canvas.width, canvas.height);
 * renderer.render(ctx, gameState, false);
 * ```
 */
export class GameRenderer {
  private _paddingX: number = 0;
  private _paddingY: number = 0;
  private _tileWidth: number = 0;
  private _tileHeight: number = 0;
  private _boardHeight: number = 0;
  private _boardWidth: number = 0;
  private _canvasHeight: number = 0;
  private _canvasWidth: number = 0;
  private _gameOptions!: IGameOptions;

  initRenderer(gameOptions: IGameOptions): void {
    this._gameOptions = gameOptions;
  }

  onCanvasSizeChanged(w: number, h: number): void {
    const tileLength = Math.min(
      w / this._gameOptions.xTiles,
      h / this._gameOptions.yTiles
    );

    this._tileWidth = tileLength;
    this._tileHeight = tileLength;
    this._boardWidth = this._gameOptions.xTiles * this._tileWidth;
    this._boardHeight = this._gameOptions.yTiles * this._tileHeight;
    this._paddingX = (w - this._boardWidth) / 2;
    this._paddingY = (h - this._boardHeight) / 2;
    this._canvasWidth = w;
    this._canvasHeight = h;
  }

  private _drawTile(
    ctx: CanvasRenderingContext2D,
    v: Vector,
    style: string | ITileStyle
  ): void {
    const { fillStyle, strokeStyle } =
      typeof style === 'string'
        ? { fillStyle: style, strokeStyle: style }
        : style;

    ctx.fillStyle = fillStyle;
    ctx.fillRect(
      this._paddingX + v.x * this._tileWidth,
      this._paddingY +
        this._boardHeight -
        v.y * this._tileHeight -
        this._tileHeight,
      this._tileWidth,
      this._tileHeight
    );

    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.strokeRect(
        this._paddingX + v.x * this._tileWidth,
        this._paddingY +
          this._boardHeight -
          v.y * this._tileHeight -
          this._tileHeight,
        this._tileWidth,
        this._tileHeight
      );
    }
  }

  private _drawScores(
    ctx: CanvasRenderingContext2D,
    gameState: IGameState
  ): void {
    const fontSize = Math.max(16, this._boardHeight / 20);
    ctx.font = `Bold ${fontSize}px Arial`;

    // Snake colors for score display (matching the snake colors)
    const snakeColors = [
      '#4040FF',
      '#FF4040',
      '#40FF40',
      '#FFFF40',
      '#FF40FF',
      '#40FFFF',
    ];

    // Save current globalAlpha and set semi-transparent
    const originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = 0.4;

    gameState.snakes.forEach((snake, index) => {
      // Use the score property from the snake state
      const score = snake.score;
      const playerName =
        gameState.snakes.length > 1 ? `Player ${index + 1}` : 'Score';
      const scoreText = `${playerName}: ${score}`;

      // Position scores on the right side of the canvas
      const x = this._canvasWidth - 200;
      const y = 30 + index * (fontSize + 10);

      // Draw score text with matching snake color
      ctx.fillStyle = snakeColors[index % snakeColors.length];
      ctx.fillText(scoreText, x, y);

      // Add white outline for better visibility
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeText(scoreText, x, y);
    });

    // Restore original globalAlpha
    ctx.globalAlpha = originalAlpha;
  }

  private _getAppleColor(appleType: AppleType): string {
    switch (appleType) {
      case AppleType.NORMAL:
        return 'red';
      case AppleType.DIET:
        return 'orange';
      default:
        return 'red';
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    gameState: IGameState,
    playbackMode: boolean
  ): void {
    // Draw background
    ctx.fillStyle = 'green';
    ctx.fillRect(
      this._paddingX,
      this._paddingY,
      this._boardWidth,
      this._boardHeight
    );

    // Draw blocks
    gameState.blocks.forEach(block => {
      this._drawTile(ctx, block, 'black');
    });

    // Draw apple
    if (gameState.apple) {
      const appleColor = this._getAppleColor(gameState.apple.type);
      this._drawTile(ctx, gameState.apple.position, appleColor);
    }

    // Draw snakes
    const snakeColors = [
      '#4040FF',
      '#FF4040',
      '#40FF40',
      '#FFFF40',
      '#FF40FF',
      '#40FFFF',
    ];
    const darkenedSnakeColors = snakeColors.map(color => {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max((num >> 16) - 40, 0);
      const g = Math.max(((num >> 8) & 0x00ff) - 40, 0);
      const b = Math.max((num & 0x0000ff) - 40, 0);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    });

    gameState.snakes.forEach((snake, index) => {
      const bodyColor = snakeColors[index % snakeColors.length];
      const headColor = darkenedSnakeColors[index % darkenedSnakeColors.length];
      snake.tiles.forEach(tile => {
        this._drawTile(ctx, tile, bodyColor);
      });
      this._drawTile(ctx, snake.position, headColor);
    });

    // Draw scores
    this._drawScores(ctx, gameState);

    // Draw playback indicator
    if (playbackMode) {
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(10, 60);
      ctx.lineTo(60, 35);
      ctx.closePath();
      ctx.fillStyle = '#50FF50';
      ctx.fill();
    }

    // Draw game over
    if (gameState.gameOver) {
      const fontSize = this._boardHeight / 10;
      ctx.font = `Bold ${fontSize}px Georgia`;
      const text = 'Game Over!';
      const measurement = ctx.measureText(text);
      const x = (this._canvasWidth - measurement.width) / 2;
      const y = this._canvasHeight / 2 + fontSize / 4;

      ctx.fillStyle = 'black';
      ctx.fillText(text, x, y);
      ctx.strokeStyle = 'white';
      ctx.strokeText(text, x, y);
    }
  }
}
