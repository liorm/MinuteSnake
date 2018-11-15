import { Vector } from './utils';
import * as seedrandom from 'seedrandom';

function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
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

export class GameState {
    private _prng: seedrandom.prng;
    private _state: IGameState;
    private _pendingDuration: number;

    get state(): IGameState { return this._state; }

    constructor(public options: IGameOptions) {
        this._resetState();
    }

    private _resetState() {
        this._pendingDuration = 0;
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

    private _actionNewDir(newDir: EDirection) {
        if (this._state.dir === newDir) {
            return;
        }

        if (this._state.dir + newDir === 0) {
            return;
        }

        this._state.dir = newDir;
        this._actionStep();
    }

    private _actionSpeedChange(speedIncrement: number) {
        let newSpeed = this._state.speed += speedIncrement;
        if (newSpeed <= 1) {
            newSpeed = 1;
        }
        if (newSpeed >= 1000) {
            newSpeed = 1000;
        }

        this._state.speed = newSpeed;
    }

    input(input: GameInput) {
        switch (input.inputType) {
            case 'direction':
                this._actionNewDir(input.dir);
                break;
            case 'speed':
                this._actionSpeedChange(input.speedIncrement);
                break;
            default: 
                return assertNever(input); // error here if there are missing cases
        }
    }

    advanceTime(duration: number) {
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

    constructor(private _options: IGameOptions) {

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

        this._tileWidth = this._canvasWidth / this._options.xTiles;
        this._tileHeight = this._canvasHeight / this._options.yTiles;
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
        gameState: GameState,
        playbackMode: boolean
    ) {
        // Draw border
        ctx.fillStyle = playbackMode ? 'purple' : 'black';
        ctx.fillRect(
            this._paddingX, this._paddingY,
            this._tileWidth * gameState.options.xTiles, this._tileHeight * gameState.options.yTiles);
        ctx.fillStyle = 'green';
        ctx.fillRect(
            this._paddingX + this._tileWidth, this._paddingY + this._tileWidth,
            this._tileWidth * (gameState.options.xTiles - 2), this._tileHeight * (gameState.options.yTiles - 2));

        if (gameState.state.applePos) {
            this._drawTile(ctx, gameState.state.applePos, 'red');
        }
        gameState.state.snakeTiles.forEach(tile => {
            this._drawTile(ctx, tile, 'blue');
        });
    }
}