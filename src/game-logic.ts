import { Vector } from './utils';
import * as seedrandom from 'seedrandom';

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
}

export interface IGameState {
    blocks: Vector[];

    speed: number;

    applePos: Vector | null;
    snakeTiles: Vector[];
    snakeLength: number;
    headPosition: Vector;

    dir: EDirection;
}

export interface IGameInputDirection {
    inputType: 'direction';
    dir: EDirection;
}

export interface IGameInputSpeed {
    inputType: 'speed';
    speedIncrement: number;
}

export type GameInput = IGameInputDirection | IGameInputSpeed;

export class GameLogic {
    private _prng: seedrandom.prng;
    private _state: IGameState;
    private _pendingDuration: number;
    private _totalDuration: number;
    onInputCallback: (event: IGameEventInput) => void;

    get options(): IGameOptions { return this._stage; }
    get state(): IGameState { return this._state; }
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
        this._state = {
            blocks: blocks,

            speed: 12,

            applePos: null,
            snakeTiles: [],
            snakeLength: 4,
            headPosition: new Vector(1, 1),
    
            dir: EDirection.RIGHT,
        };
    }

    private _actionStep(): boolean {
        let direction;
        switch (this._state.dir) {
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
        }
    
        let newPosition = this._state.headPosition.add(direction);

        // Check if we hit the blocks?
        if (this._state.blocks.find(v => v.equals(newPosition))) {
            // TODO: Implement death logic.
            return false;
        }

        // Check if we hit the snake?
        if (this._state.snakeTiles.find(v => v.equals(newPosition))) {
            // TODO: Implement death logic.
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

        this._state.headPosition = newPosition;
        this._state.snakeTiles.push(newPosition);
    
        // Eat the apple.
        if (this._state.headPosition.equals(this._state.applePos)) {
            this._state.applePos = null;
            this._state.snakeLength += 2;
        }
        
        while (this._state.snakeTiles.length > this._state.snakeLength) {
            this._state.snakeTiles.splice(0, 1);
        }

        if (!this._state.applePos) {
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
            if (this._state.snakeTiles.find(v => v.equals(newPos))) {
                continue;
            }

            break;
        }
        this._state.applePos = newPos;
    }

    private _actionNewDir(newDir: EDirection): boolean {
        if (this._state.dir === newDir) {
            return false;
        }

        if (this._state.dir + newDir === 0) {
            return false;
        }

        const oldDir = this._state.dir;
        this._state.dir = newDir;

        // Check if new direction is valid.
        if (!this._actionStep()) {
            this._state.dir = oldDir;
            return false
        }

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
                handled = this._actionNewDir(input.dir);
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
        gameState: IGameState,
        playbackMode: boolean
    ) {
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
        gameState.snakeTiles.forEach(tile => {
            this._drawTile(ctx, tile, '#4040FF');
        });

        this._drawTile(ctx, gameState.headPosition, '#0000AF');

        if (playbackMode) {
            ctx.beginPath();
            ctx.moveTo(10, 10);
            ctx.lineTo(10, 60);
            ctx.lineTo(60, 35);
            ctx.closePath();
            ctx.fillStyle = '#50FF50';
            ctx.fill();
        }
    }
}