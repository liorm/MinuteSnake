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

export interface IGameState {
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
    private _onInputCallback: (event: IGameEventInput) => void;

    get state(): IGameState { return this._state; }
    get totalDuration(): number { return this._totalDuration; }

    get onInputCallback(): (event: IGameEventInput) => void {
        return this._onInputCallback;
    }
    set onInputCallback(value: (event: IGameEventInput) => void) {
        this._onInputCallback = value;
    }

    constructor(public options: IGameOptions) {
        this._resetState();
    }

    private _resetState() {
        this._pendingDuration = 0;
        this._totalDuration = 0;
        this._prng = seedrandom(`${this.options.seed}\0`, {global: false});
        this._state = {
            speed: 12,

            applePos: null,
            snakeTiles: [],
            snakeLength: 4,
            headPosition: new Vector(1, 1),
    
            dir: EDirection.RIGHT,
        };
    }

    private _actionStep() {
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
    
        this._state.headPosition = this._state.headPosition.add(direction);
    
        if (this._state.headPosition.x <= 0) {
            this._state.headPosition.x = this.options.xTiles - 2;
        }
        if (this._state.headPosition.y <= 0) {
            this._state.headPosition.y = this.options.yTiles - 2;
        }
        if (this._state.headPosition.x >= this.options.xTiles - 1) {
            this._state.headPosition.x = 1;
        }
        if (this._state.headPosition.y >= this.options.yTiles - 1) {
            this._state.headPosition.y = 1;
        }
    
        this._state.snakeTiles.push(this._state.headPosition.clone());
    
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
    }

    private _actionNewApple() {
        let newPos;
        while (true) {
            newPos = new Vector(Math.floor(this._prng() * this.options.xTiles), Math.floor(this._prng() * this.options.yTiles));
            if (newPos.x === 0 || newPos.x >= this.options.xTiles - 1)
                continue;
            if (newPos.y === 0 || newPos.y >= this.options.yTiles - 1)
                continue;

            let collides = false;
            for (let i = 0; i < this._state.snakeTiles.length; ++i) {
                if (this._state.snakeTiles[i].equals(newPos)) {
                    collides = true;
                    break;
                }
            }
            if (collides)
                continue;

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

        this._state.dir = newDir;
        this._actionStep();
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
        if (this._onInputCallback && handled) {
            this._onInputCallback({
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
    private _canvasHeight: number;
    private _canvasWidth: number;

    constructor() {
    }

    onCanvasSizeChanged(w: number, h: number) {
        this._paddingX = 0;
        this._paddingY = 0;
        this._canvasWidth = w;
        this._canvasHeight = h;

        if (this._canvasWidth > this._canvasHeight) {
            this._paddingX = (this._canvasWidth - this._canvasHeight) / 2;
            // noinspection JSSuspiciousNameCombination
            this._canvasWidth = this._canvasHeight;
        } else {
            this._paddingY = (this._canvasHeight - this._canvasWidth) / 2;
            // noinspection JSSuspiciousNameCombination
            this._canvasHeight = this._canvasWidth;
        }
    }

    private _drawTile(ctx, v, tileStyle) {
        ctx.fillStyle = tileStyle;
        ctx.fillRect(
            this._paddingX + v.x * this._tileWidth, this._paddingY + this._canvasHeight - v.y * this._tileHeight - this._tileHeight,
            this._tileWidth, this._tileHeight);

        ctx.strokeStyle = tileStyle;
        ctx.strokeRect(
            this._paddingX + v.x * this._tileWidth, this._paddingY + this._canvasHeight - v.y * this._tileHeight - this._tileHeight,
            this._tileWidth, this._tileHeight);
    }

    render(
        ctx: CanvasRenderingContext2D,
        options: IGameOptions,
        gameState: IGameState,
        playbackMode: boolean
    ) {
        this._tileWidth = this._canvasWidth / options.xTiles;
        this._tileHeight = this._canvasHeight / options.yTiles;

        // Draw border
        ctx.fillStyle = playbackMode ? 'purple' : 'black';
        ctx.fillRect(
            this._paddingX, this._paddingY,
            this._tileWidth * options.xTiles, this._tileHeight * options.yTiles);
        ctx.fillStyle = 'green';
        ctx.fillRect(
            this._paddingX + this._tileWidth, this._paddingY + this._tileWidth,
            this._tileWidth * (options.xTiles - 2), this._tileHeight * (options.yTiles - 2));

        if (gameState.applePos) {
            this._drawTile(ctx, gameState.applePos, 'red');
        }
        gameState.snakeTiles.forEach(tile => {
            this._drawTile(ctx, tile, 'blue');
        });
    }
}