import { Vector } from './utils.js';
import seedrandom from 'seedrandom';

function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}

export interface IGameEventInput {
    eventTime: number;
    gameInput: GameInput;
}

export enum EDirection {
    UP = 1,
    RIGHT = 2,
    LEFT = -2,
    DOWN = -1,
}

export interface IGameOptions {
    xTiles: number;
    yTiles: number;
    seed: number;
}

export interface IGameStage extends IGameOptions {
    wallHoles: Vector[];
    blocks: Vector[];

    /// Starting positions for the snake.
    snakes: {
        position: Vector,
        direction: EDirection
    }[];
}

export interface IGameStateSnake {
    position: Vector;
    length: number;
    tiles: Vector[];
    dir: EDirection;
    pendingDirs: EDirection[];
}

export interface IGameState {
    blocks: Vector[];
    speed: number;
    applePos: Vector | null;
    snakes: IGameStateSnake[];
    gameOver: boolean;
}

export interface IGameInputDirection {
    inputType: 'direction';
    dir: EDirection;
    snakeIdx: number;
}

export interface IGameInputSpeed {
    inputType: 'speed';
    speedIncrement: number;
}

export type GameInput = IGameInputDirection | IGameInputSpeed;

export class GameLogic {
    private _prng: () => number;
    private _state: IGameState;
    private _pendingDuration: number = 0;
    private _totalDuration: number = 0;
    onInputCallback: ((event: IGameEventInput) => void) | undefined;

    get options(): IGameOptions { return this._stage; }
    get state(): IGameState { return this._state; }
    get totalDuration(): number { return this._totalDuration; }

    constructor(private _stage: IGameStage) {
        this._prng = seedrandom(`${_stage.seed}\0`);
        this._state = this._createInitialState();
    }

    private _createInitialState(): IGameState {
        let blocks: Vector[] = [];
        for (let x = 0; x < this._stage.xTiles; ++x) {
            blocks.push(
                new Vector(x, 0),
                new Vector(x, this._stage.yTiles - 1)
            );
        }
        for (let y = 1; y < this._stage.yTiles; ++y) {
            blocks.push(
                new Vector(0, y),
                new Vector(this._stage.xTiles - 1, y)
            );
        }
        blocks = blocks.filter(block => {
            return !this._stage.wallHoles.find(hole => hole.equals(block));
        });
        blocks.push(...this._stage.blocks);

        return {
            blocks,
            speed: 12,
            applePos: null,
            snakes: this._stage.snakes.map(snake => ({
                position: snake.position,
                length: 4,
                tiles: [],
                dir: snake.direction,
                pendingDirs: [],
            })),
            gameOver: false,
        };
    }

    private _resetState(): void {
        this._pendingDuration = 0;
        this._totalDuration = 0;
        this._prng = seedrandom(`${this.options.seed}\0`);
        this._state = this._createInitialState();
    }

    private _actionStep(): boolean {
        const state = this._state;

        if (state.gameOver) {
            return false;
        }

        for (const snake of state.snakes) {
            if (snake.pendingDirs.length > 0) {
                snake.dir = snake.pendingDirs[0];
                snake.pendingDirs.splice(0, 1);
            }

            let direction: Vector;
            switch (snake.dir) {
                case EDirection.UP:
                    direction = new Vector(0, 1);
                    break;
                case EDirection.DOWN:
                    direction = new Vector(0, -1);
                    break;
                case EDirection.LEFT:
                    direction = new Vector(-1, 0);
                    break;
                case EDirection.RIGHT:
                    direction = new Vector(1, 0);
                    break;
                default:
                    return assertNever(snake.dir);
            }

            let newPosition = snake.position.add(direction);

            if (state.blocks.find(v => v.equals(newPosition))) {
                state.gameOver = true;
                return false;
            }

            if (snake.tiles.find(v => v.equals(newPosition))) {
                state.gameOver = true;
                return false;
            }

            if (newPosition.x < 0) {
                newPosition.x = this.options.xTiles - 1;
            }
            if (newPosition.y < 0) {
                newPosition.y = this.options.yTiles - 1;
            }
            if (newPosition.x > this.options.xTiles - 1) {
                newPosition.x = 0;
            }
            if (newPosition.y > this.options.yTiles - 1) {
                newPosition.y = 0;
            }

            snake.position = newPosition;
            snake.tiles.push(newPosition);

            if (snake.position.equals(state.applePos)) {
                state.applePos = null;
                snake.length += 2;
            }

            while (snake.tiles.length > snake.length) {
                snake.tiles.splice(0, 1);
            }
        }

        if (!state.applePos) {
            this._actionNewApple();
        }

        return true;
    }

    private _actionNewApple(): void {
        let newPos: Vector;
        while (true) {
            newPos = new Vector(
                Math.floor(this._prng() * this.options.xTiles),
                Math.floor(this._prng() * this.options.yTiles)
            );

            if (this._state.blocks.find(v => v.equals(newPos))) {
                continue;
            }

            if (this._state.snakes.find(snake => !!snake.tiles.find(v => v.equals(newPos)))) {
                continue;
            }

            break;
        }
        this._state.applePos = newPos;
    }

    private _actionNewDir(snakeIdx: number, newDir: EDirection): boolean {
        const snakeState = this._state.snakes[snakeIdx];
        if (snakeState.pendingDirs.length >= 2) {
            return false;
        }

        let curDir = snakeState.dir;
        if (snakeState.pendingDirs.length > 0) {
            curDir = snakeState.pendingDirs[snakeState.pendingDirs.length - 1];
        }

        if (curDir === newDir || curDir + newDir === 0) {
            return false;
        }

        snakeState.pendingDirs.push(newDir);
        return true;
    }

    private _actionSpeedChange(speedIncrement: number): boolean {
        let newSpeed = this._state.speed + speedIncrement;
        newSpeed = Math.max(1, Math.min(1000, newSpeed));
        this._state.speed = newSpeed;
        return true;
    }

    input(input: GameInput): void {
        let handled = false;
        switch (input.inputType) {
            case 'direction':
                handled = this._actionNewDir(input.snakeIdx, input.dir);
                break;
            case 'speed':
                handled = this._actionSpeedChange(input.speedIncrement);
                break;
            default:
                assertNever(input);
        }

        if (this.onInputCallback && handled) {
            this.onInputCallback({
                eventTime: this._totalDuration,
                gameInput: input
            });
        }
    }

    advanceTime(duration: number): void {
        this._totalDuration += duration;
        this._pendingDuration += duration;

        const stepSize = (1000 / this._state.speed);
        const totalSteps = Math.floor(this._pendingDuration / stepSize);
        for (let i = 0; i < totalSteps; ++i) {
            this._actionStep();
        }
        this._pendingDuration -= totalSteps * stepSize;
    }
}

interface ITileStyle {
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
        const tileLength = Math.min(w / this._gameOptions.xTiles, h / this._gameOptions.yTiles);

        this._tileWidth = tileLength;
        this._tileHeight = tileLength;
        this._boardWidth = this._gameOptions.xTiles * this._tileWidth;
        this._boardHeight = this._gameOptions.yTiles * this._tileHeight;
        this._paddingX = (w - this._boardWidth) / 2;
        this._paddingY = (h - this._boardHeight) / 2;
        this._canvasWidth = w;
        this._canvasHeight = h;
    }

    private _drawTile(ctx: CanvasRenderingContext2D, v: Vector, style: string | ITileStyle): void {
        const { fillStyle, strokeStyle } = typeof style === 'string' 
            ? { fillStyle: style, strokeStyle: style }
            : style;

        ctx.fillStyle = fillStyle;
        ctx.fillRect(
            this._paddingX + v.x * this._tileWidth,
            this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight,
            this._tileWidth,
            this._tileHeight
        );

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.strokeRect(
                this._paddingX + v.x * this._tileWidth,
                this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight,
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
            const text = "Game Over!";
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