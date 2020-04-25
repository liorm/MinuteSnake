import {Vector} from './utils';
import * as seedrandom from 'seedrandom';
import {
    EDirection,
    GameInput,
    IGameEventInput,
    IGameOptions,
    IGameStage,
    IGameState,
    IGameStateSnake
} from "./interfaces";

function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}

class GameStateSnake implements IGameStateSnake {
    public pendingDirs: EDirection[];
    public tiles: Vector[];

    constructor(
        public position: Vector,
        public dir: EDirection,
        public length: number,
    ) {
        this.tiles = [];
        this.pendingDirs = [];
    }
}

class GameState implements IGameState {
    applePos: Vector | null;
    blocks: Vector[];
    gameOver: boolean;
    snakes: GameStateSnake[];
    speed: number;

    constructor(
        blocks: Vector[],
        snakes: GameStateSnake[],
        speed: number
    ) {
        this.blocks = blocks;
        this.snakes = snakes;
        this.speed = speed;
        this.applePos = null;
        this.gameOver = false;
    }
}

export class GameLogic {
    private _prng: seedrandom.prng;
    private _state: GameState;
    private _pendingDuration: number;
    private _totalDuration: number;

    onInputCallback: (event: IGameEventInput) => void;
    onStateChanged: (state: IGameState) => void;

    get options(): IGameOptions { return this._stage; }
    get state(): GameState { return this._state; }
    get totalDuration(): number { return this._totalDuration; }

    constructor(private _stage: IGameStage) {
        this._resetState();
    }

    private _resetState() {
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

        this._pendingDuration = 0;
        this._totalDuration = 0;
        this._prng = seedrandom(`${this.options.seed}\0`, {global: false});
        this._state = new GameState(
            blocks,
            this._stage.snakes.map(
                snake => new GameStateSnake(snake.position, snake.direction, 4)),
            12);
    }

    private _actionStep(): boolean {
        const state = this._state;

        if (state.gameOver)
            return false;

        for (let snake of state.snakes) {
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
                    return assertNever(snake.dir); // error here if there are missing cases
            }

            let newPosition = snake.position.add(direction);

            // Check if we hit the blocks?
            if (state.blocks.find(v => v.equals(newPosition))) {
                state.gameOver = true;
                return false;
            }

            // Check if we hit the snake?
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

            // Eat the apple.
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

    private _actionNewApple() {
        let newPos;
        while (true) {
            newPos = new Vector(Math.floor(this._prng() * this.options.xTiles), Math.floor(this._prng() * this.options.yTiles));

            // Check if we hit the blocks?
            if (this._state.blocks.find(v => v.equals(newPos))) {
                continue;
            }

            // Check if we hit the snake?
            if ( this._state.snakes.find(snake => !!snake.tiles.find(v => v.equals(newPos))) ) {
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

        if (curDir === newDir) {
            return false;
        }

        if (curDir + newDir === 0) {
            return false;
        }

        snakeState.pendingDirs.push(newDir);
        return true;
    }

    private _actionSpeedChange(speedIncrement: number): boolean {
        let newSpeed = this._state.speed += speedIncrement;
        if (newSpeed <= 1) {
            newSpeed = 1;
        }
        if (newSpeed >= 1000) {
            newSpeed = 1000;
        }

        this._state.speed = newSpeed;
        return true;
    }

    input(input: GameInput) {
        let handled = false;
        switch (input.inputType) {
            case 'direction':
                handled = this._actionNewDir(input.snakeIdx, input.dir);
                break;
            case 'speed':
                handled = this._actionSpeedChange(input.speedIncrement);
                break;
            default: 
                return assertNever(input); // error here if there are missing cases
        }

        // Broadcast only handled inputs
        if (this.onInputCallback && handled) {
            this.onInputCallback({
                eventTime: this._totalDuration,
                gameInput: input
            });
        }
    }

    advanceTime(duration: number) {
        this._totalDuration += duration;

        // Advance time.
        this._pendingDuration += duration;

        // Perform pending steps
        const stepSize = (1000 / this._state.speed);
        const totalSteps = Math.floor(this._pendingDuration / stepSize);
        for (let i = 0; i < totalSteps; ++i) {
            this._actionStep();
        }
        this._pendingDuration -= totalSteps * stepSize;
    }
}

export class GameRenderer {
    private _paddingX: number;
    private _paddingY: number;
    private _tileWidth: number;
    private _tileHeight: number;
    private _boardHeight: number;
    private _boardWidth: number;
    private _canvasHeight: number;
    private _canvasWidth: number;
    private _gameOptions: IGameOptions;

    constructor() {
    }

    initRenderer(gameOptions: IGameOptions) {
        this._gameOptions = gameOptions;
    }

    onCanvasSizeChanged(w: number, h: number) {
        const tileLength = Math.min( w/this._gameOptions.xTiles, h/this._gameOptions.yTiles);

        this._tileWidth = tileLength;
        this._tileHeight = tileLength;

        this._boardWidth = this._gameOptions.xTiles * this._tileWidth;
        this._boardHeight = this._gameOptions.yTiles * this._tileHeight;

        this._paddingX = (w - this._boardWidth) / 2;
        this._paddingY = (h - this._boardHeight) / 2;

        this._canvasWidth = w;
        this._canvasHeight = h;
    }

    private _drawTile(ctx, v, tileStyle) {
        ctx.fillStyle = tileStyle;
        ctx.fillRect(
            this._paddingX + v.x * this._tileWidth, this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight,
            this._tileWidth, this._tileHeight);

        ctx.strokeStyle = tileStyle;
        ctx.strokeRect(
            this._paddingX + v.x * this._tileWidth, this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight,
            this._tileWidth, this._tileHeight);
    }

    render(
        ctx: CanvasRenderingContext2D,
        gameLogic: GameLogic,
        playbackMode: boolean
    ) {
        const gameState = gameLogic.state;

        ctx.fillStyle = 'green';
        ctx.fillRect(
            this._paddingX, this._paddingY,
            this._tileWidth * this._gameOptions.xTiles, this._tileHeight * this._gameOptions.yTiles);

        // Draw blocks.
        gameState.blocks.forEach(block => {
            this._drawTile(ctx, block, 'black');
        });

        if (gameState.applePos) {
            this._drawTile(ctx, gameState.applePos, 'red');
        }

        gameState.snakes.forEach(snake => {
            snake.tiles.forEach(tile => {
                this._drawTile(ctx, tile, '#4040FF');
            });
            this._drawTile(ctx, snake.position, '#0000AF');
        });


        if (playbackMode) {
            ctx.beginPath();
            ctx.moveTo(10, 10);
            ctx.lineTo(10, 60);
            ctx.lineTo(60, 35);
            ctx.closePath();
            ctx.fillStyle = '#50FF50';
            ctx.fill();
        }

        if (gameState.gameOver) {
            const fontSize = this._boardHeight / 10;
            ctx.font=`Bold ${fontSize}pt Georgia`;
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'white';
            const measurement = ctx.measureText("Game Over!");
            ctx.fillText("Game Over!",(this._canvasWidth - measurement.width) / 2, (this._canvasHeight - fontSize) / 2);
            ctx.strokeText("Game Over!",(this._canvasWidth - measurement.width) / 2, (this._canvasHeight - fontSize) / 2);
        }
    }
}