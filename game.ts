enum Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT
}

class Vector {
    x: number;
    y: number;

    constructor(v: Vector);
    constructor(x: number, y: number);
    constructor(vx, y?) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            this.x = vx.x;
            this.y = vx.y;
        } else {
            this.x = vx || 0;
            this.y = y || 0;
        }
    }

    equals(v: Vector | null | undefined);
    equals(x: number, y: number);
    equals(vx, y?) {
        if (vx === undefined || vx === null)
            return false;

        // VECTOR SYNTAX
        if (arguments.length === 1) {
            return this.x === vx.x && this.y === vx.y;
        } else {
            return this.x === vx && this.y === y;
        }
    }

    clone() {
        return new Vector(this);
    }

    add(v: Vector);
    add(x: number, y: number);
    add(vx, y?) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            return new Vector(this.x + vx.x, this.y + vx.y);
        } else {
            return new Vector(this.x + vx, this.y + y);
        }
    }

    sub(v: Vector);
    sub(x: number, y: number);
    sub(vx, y?) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            return this.add(-vx.x, -vx.y);
        } else {
            return this.add(-vx, -y);
        }
    }

    mul(scalar: number) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    invert() {
        return this.mul(-1);
    }
}

interface IGameOptions {
    xTiles: number;
    yTiles: number;
    seed: number;
}

interface IGameState {
    speed: number;

    applePos: Vector | null;
    snakeTiles: Vector[];
    snakeLength: number;
    headPosition: Vector;

    dir: Direction;
}

enum EGameInputType {
    DirectionInput = 1,
}

interface IGameInputDirection {
    inputType: EGameInputType.DirectionInput;
    dir: Direction;
}

type GameInput = IGameInputDirection;

class GameState {
    private _prng: seedrandom.prng;
    private _state: IGameState;
    private _pendingDuration: number;

    get state(): IGameState { return this._state; }

    constructor(public options: IGameOptions) {
        this._resetState();
    }

    private _resetState() {
        this._pendingDuration = 0;
        this._prng = (<any>Math).seedrandom(`${this.options.seed}\0`, {global: false});
        this._state = {
            speed: 12,

            applePos: null,
            snakeTiles: [],
            snakeLength: 4,
            headPosition: new Vector(1, 1),
    
            dir: Direction.RIGHT,
        };
    }

    private _actionStep() {
        let direction;
        switch (this._state.dir) {
            case Direction.UP:
                direction = new Vector(0, 1);
                break;
            case Direction.DOWN: 
                direction = new Vector(0, -1);
                break;
            case Direction.LEFT: 
                direction = new Vector(-1, 0);
                break;
            case Direction.RIGHT: 
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
        };
        this._state.applePos = newPos;
    }

    private _actionNewDir(newDir: Direction) {
        if (this._state.dir === newDir) {
            return;
        }

        this._state.dir = newDir;
        this._actionStep();
    }

    input(input: GameInput) {
        switch (input.inputType) {
            case EGameInputType.DirectionInput:
            this._actionNewDir(input.dir);
            break;
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


interface IGameInputTime {
    gameInput: GameInput;
    inputTime: number;
}

$(() => {
    const canvas = $("#canvas");
    let ctx: CanvasRenderingContext2D;
    let canvasHeight;
    let canvasWidth;
    let paddingX;
    let paddingY;
    let tileWidth;
    let tileHeight;

    let absoluteStartTime: number;
    let playedDuration: number;
    let gameOptions: IGameOptions;
    let gameState: GameState;
    let savedInputs: IGameInputTime[];
    let playbackMode = false;
    let playbackInputIndex = 0;



    function init() {
        gameOptions = {
            xTiles: 40,
            yTiles: 40,
            seed: new Date().valueOf()
        };

        restartLiveMode();
        updateCanvasDimensions();
        initEventListeners();
        timeout();
    };

    function initEventListeners() {
        $(window).bind('resize', updateCanvasDimensions).bind('keydown', onKeyDown);
    };

    function onKeyDown(event) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }
        
        if (event.key === 'P' || event.key === 'p') {
            enterPlaybackMode();
        } else if (!playbackMode) {
            let newDirection;

            switch (event.key) {
                case "ArrowDown":
                    newDirection = Direction.DOWN;
                    break;
                case "ArrowUp":
                    newDirection = Direction.UP;
                    break;
                case "ArrowLeft":
                    newDirection = Direction.LEFT;
                    break;
                case "ArrowRight":
                    newDirection = Direction.RIGHT;
                    break;
                default:
                    return;
            }

            recordInput({
                inputType: EGameInputType.DirectionInput,
                dir: newDirection
            });
        }

        event.preventDefault();
    }

    function updateCanvasDimensions() {
        canvas.attr({
            height: $(window).height(),
            width: $(window).width()
        });

        paddingX = 0;
        paddingY = 0;
        canvasWidth = canvas.width();
        canvasHeight = canvas.height();

        if (canvasWidth > canvasHeight) {
            paddingX = (canvasWidth - canvasHeight) / 2;
            canvasWidth = canvasHeight;
        } else {
            paddingY = (canvasHeight - canvasWidth) / 2;
            canvasHeight = canvasWidth;
        }

        tileWidth = canvasWidth / gameState.options.xTiles;
        tileHeight = canvasHeight / gameState.options.yTiles;
        draw();
    };

    function timeout() {
        update();
        draw();
        setTimeout(() => timeout(), 30);
    };

    function update() {
        const now = performance.now();
        advanceTime(now);
    }

    function recordInput(input: GameInput) {
        const now = performance.now();
        advanceTime(now);
        gameState.input(input);
        savedInputs.push({
            gameInput: input,
            inputTime: playedDuration
        });
    }

    function advanceTime(now) {
        do {
            let newPlayedDuration = (now - absoluteStartTime);
            if (newPlayedDuration <= playedDuration) {
                return;
            }

            if (playbackMode) {
                if (playbackInputIndex >= savedInputs.length) {
                    resumeLiveMode();
                } else {
                    // For playback mode, advance until the next input time.
                    const nextInput = savedInputs[playbackInputIndex];
                    if (newPlayedDuration >= nextInput.inputTime) {
                        newPlayedDuration = nextInput.inputTime;
                    }
                }
            }

            gameState.advanceTime(newPlayedDuration - playedDuration);
            playedDuration = newPlayedDuration;

            if (playbackMode) {
                const nextInput = savedInputs[playbackInputIndex];
                if (playedDuration === nextInput.inputTime) {
                    gameState.input(nextInput.gameInput);
                    ++playbackInputIndex;
                }
            }
        } while (true);
    }

    function restartLiveMode() {
        playbackMode = false;
        savedInputs = [];
        gameState = new GameState(gameOptions);
        absoluteStartTime = performance.now();
        playedDuration = 0;
    }

    function resumeLiveMode() {
        playbackMode = false;
    }

    function enterPlaybackMode() {
        playbackMode = true;
        playbackInputIndex = 0;
        gameState = new GameState(gameOptions);
        absoluteStartTime = performance.now();
        playedDuration = 0;
    }

    function draw() {
        if (!ctx) {
            const tmpCanvas = canvas.get(0) as HTMLCanvasElement;
            if (tmpCanvas.getContext == null) {
                return;
            };
            ctx = tmpCanvas.getContext('2d')!;
        }

        function drawTile(v, tileStyle) {
            ctx.fillStyle = tileStyle;
            ctx.fillRect(
                paddingX + v.x * tileWidth, paddingY + canvasHeight - v.y * tileHeight - tileHeight,
                tileWidth, tileHeight);

            ctx.strokeStyle = tileStyle;
            ctx.strokeRect(
                paddingX + v.x * tileWidth, paddingY + canvasHeight - v.y * tileHeight - tileHeight,
                tileWidth, tileHeight);
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw border
        ctx.fillStyle = playbackMode ? 'purple' : 'black';
        ctx.fillRect(
            paddingX, paddingY, 
            tileWidth * gameState.options.xTiles, tileHeight * gameState.options.yTiles);
        ctx.fillStyle = 'green';
        ctx.fillRect(
            paddingX + tileWidth, paddingY + tileWidth, 
            tileWidth * (gameState.options.xTiles - 2), tileHeight * (gameState.options.yTiles - 2));

        if (gameState.state.applePos) {
            drawTile(gameState.state.applePos, 'red');
        }
        gameState.state.snakeTiles.forEach(tile => {
            drawTile(tile, 'blue');
        });
    }

    init();
});
