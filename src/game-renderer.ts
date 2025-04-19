import { IGameOptions, IGameState } from './game-logic';
import { Vector } from './utils';

export interface ITileStyle {
  fillStyle: string;
  strokeStyle?: string;
}

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
    if (gameState.applePos) {
      this._drawTile(ctx, gameState.applePos, 'red');
    }

    // Draw snakes
    gameState.snakes.forEach(snake => {
      snake.tiles.forEach(tile => {
        this._drawTile(ctx, tile, '#4040FF');
      });
      this._drawTile(ctx, snake.position, '#0000AF');
    });

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
      const y = (this._canvasHeight - fontSize) / 2;

      ctx.fillStyle = 'black';
      ctx.fillText(text, x, y);
      ctx.strokeStyle = 'white';
      ctx.strokeText(text, x, y);
    }
  }
}
