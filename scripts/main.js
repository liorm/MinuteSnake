define("utils", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Vector {
        constructor(vx, y) {
            // VECTOR SYNTAX
            if (arguments.length === 1) {
                this.x = vx.x;
                this.y = vx.y;
            }
            else {
                this.x = vx || 0;
                this.y = y || 0;
            }
        }
        equals(vx, y) {
            if (vx === undefined || vx === null)
                return false;
            // VECTOR SYNTAX
            if (arguments.length === 1) {
                return this.x === vx.x && this.y === vx.y;
            }
            else {
                return this.x === vx && this.y === y;
            }
        }
        clone() {
            return new Vector(this);
        }
        add(vx, y) {
            // VECTOR SYNTAX
            if (arguments.length === 1) {
                return new Vector(this.x + vx.x, this.y + vx.y);
            }
            else {
                return new Vector(this.x + vx, this.y + y);
            }
        }
        sub(vx, y) {
            // VECTOR SYNTAX
            if (arguments.length === 1) {
                return this.add(-vx.x, -vx.y);
            }
            else {
                return this.add(-vx, -y);
            }
        }
        mul(scalar) {
            return new Vector(this.x * scalar, this.y * scalar);
        }
        invert() {
            return this.mul(-1);
        }
    }
    exports.Vector = Vector;
});
define("game-logic", ["require", "exports", "utils", "seedrandom"], function (require, exports, utils_1, seedrandom) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function assertNever(x) {
        throw new Error("Unexpected object: " + x);
    }
    var EDirection;
    (function (EDirection) {
        EDirection[EDirection["UP"] = 1] = "UP";
        EDirection[EDirection["RIGHT"] = 2] = "RIGHT";
        EDirection[EDirection["LEFT"] = -2] = "LEFT";
        EDirection[EDirection["DOWN"] = -1] = "DOWN";
    })(EDirection = exports.EDirection || (exports.EDirection = {}));
    class GameLogic {
        constructor(_stage) {
            this._stage = _stage;
            this._resetState();
        }
        get options() { return this._stage; }
        get state() { return this._state; }
        get totalDuration() { return this._totalDuration; }
        _resetState() {
            let blocks = [];
            for (let x = 0; x < this._stage.xTiles; ++x) {
                blocks.push(new utils_1.Vector(x, 0), new utils_1.Vector(x, this._stage.yTiles - 1));
            }
            for (let y = 1; y < this._stage.yTiles; ++y) {
                blocks.push(new utils_1.Vector(0, y), new utils_1.Vector(this._stage.xTiles - 1, y));
            }
            blocks = blocks.filter(block => {
                return !this._stage.wallHoles.find(hole => hole.equals(block));
            });
            blocks.push(...this._stage.blocks);
            this._pendingDuration = 0;
            this._totalDuration = 0;
            this._prng = seedrandom(`${this.options.seed}\0`, { global: false });
            this._state = {
                blocks: blocks,
                speed: 12,
                applePos: null,
                snakes: this._stage.snakes.map(snake => {
                    return {
                        position: snake.position,
                        length: 4,
                        tiles: [],
                        dir: snake.direction,
                        pendingDirs: [],
                    };
                }),
                gameOver: false,
            };
        }
        _actionStep() {
            const state = this._state;
            if (state.gameOver)
                return false;
            for (let snake of state.snakes) {
                if (snake.pendingDirs.length > 0) {
                    snake.dir = snake.pendingDirs[0];
                    snake.pendingDirs.splice(0, 1);
                }
                let direction;
                switch (snake.dir) {
                    case EDirection.UP:
                        direction = new utils_1.Vector(0, 1);
                        break;
                    case EDirection.DOWN:
                        direction = new utils_1.Vector(0, -1);
                        break;
                    case EDirection.LEFT:
                        direction = new utils_1.Vector(-1, 0);
                        break;
                    case EDirection.RIGHT:
                        direction = new utils_1.Vector(1, 0);
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
        _actionNewApple() {
            let newPos;
            while (true) {
                newPos = new utils_1.Vector(Math.floor(this._prng() * this.options.xTiles), Math.floor(this._prng() * this.options.yTiles));
                // Check if we hit the blocks?
                if (this._state.blocks.find(v => v.equals(newPos))) {
                    continue;
                }
                // Check if we hit the snake?
                if (this._state.snakes.find(snake => !!snake.tiles.find(v => v.equals(newPos)))) {
                    continue;
                }
                break;
            }
            this._state.applePos = newPos;
        }
        _actionNewDir(snakeIdx, newDir) {
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
        _actionSpeedChange(speedIncrement) {
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
        input(input) {
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
        advanceTime(duration) {
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
    exports.GameLogic = GameLogic;
    class GameRenderer {
        constructor() {
        }
        initRenderer(gameOptions) {
            this._gameOptions = gameOptions;
        }
        onCanvasSizeChanged(w, h) {
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
        _drawTile(ctx, v, tileStyle) {
            ctx.fillStyle = tileStyle;
            ctx.fillRect(this._paddingX + v.x * this._tileWidth, this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight, this._tileWidth, this._tileHeight);
            ctx.strokeStyle = tileStyle;
            ctx.strokeRect(this._paddingX + v.x * this._tileWidth, this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight, this._tileWidth, this._tileHeight);
        }
        render(ctx, gameState, playbackMode) {
            ctx.fillStyle = 'green';
            ctx.fillRect(this._paddingX, this._paddingY, this._tileWidth * this._gameOptions.xTiles, this._tileHeight * this._gameOptions.yTiles);
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
                ctx.font = `Bold ${fontSize}pt Georgia`;
                ctx.fillStyle = 'black';
                ctx.strokeStyle = 'white';
                const measurement = ctx.measureText("Game Over!");
                ctx.fillText("Game Over!", (this._canvasWidth - measurement.width) / 2, (this._canvasHeight - fontSize) / 2);
                ctx.strokeText("Game Over!", (this._canvasWidth - measurement.width) / 2, (this._canvasHeight - fontSize) / 2);
            }
        }
    }
    exports.GameRenderer = GameRenderer;
});
define("game-engine", ["require", "exports", "game-logic", "utils"], function (require, exports, game_logic_1, utils_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class GameHandlerBase {
    }
    class LiveHandler extends GameHandlerBase {
        constructor(_gameStage, savedInputs) {
            super();
            this._gameStage = _gameStage;
            this.savedInputs = savedInputs || [];
            this._gameLogic = new game_logic_1.GameLogic(this._gameStage);
            // FF time.
            if (this.savedInputs.length > 0) {
                for (let i = 0; i < this.savedInputs.length; ++i) {
                    this._gameLogic.advanceTime(this.savedInputs[i].eventTime - this._gameLogic.totalDuration);
                    this._gameLogic.input(this.savedInputs[i].gameInput);
                }
            }
            // Start listen AFTER inputing existing events
            this._gameLogic.onInputCallback = (e) => this._onGameInput(e);
        }
        get gameStage() { return this._gameStage; }
        advanceTime(duration) {
            this._gameLogic.advanceTime(duration);
        }
        get isDone() { return false; }
        get state() {
            return this._gameLogic.state;
        }
        _onGameInput(e) {
            this.savedInputs.push(e);
        }
        performInput(input) {
            this._gameLogic.input(input);
        }
    }
    class PlaybackHandler extends GameHandlerBase {
        constructor(_gameStage, savedInputs) {
            super();
            this._gameStage = _gameStage;
            this.savedInputs = savedInputs;
            this._gameLogic = new game_logic_1.GameLogic(this._gameStage);
            this._inputIndex = 0;
        }
        get gameStage() { return this._gameStage; }
        get isDone() { return this._inputIndex >= this.savedInputs.length; }
        advanceTime(duration) {
            if (this._inputIndex >= this.savedInputs.length) {
                return;
            }
            while (duration > 0) {
                let newPlayedDuration = this._gameLogic.totalDuration + duration;
                // For playback mode, advance until the next input time.
                const nextInput = this.savedInputs[this._inputIndex];
                if (newPlayedDuration >= nextInput.eventTime) {
                    newPlayedDuration = nextInput.eventTime;
                }
                this._gameLogic.advanceTime(newPlayedDuration - this._gameLogic.totalDuration);
                if (this._gameLogic.totalDuration >= nextInput.eventTime) {
                    this._gameLogic.input(nextInput.gameInput);
                    ++this._inputIndex;
                }
                duration = newPlayedDuration - this._gameLogic.totalDuration;
            }
        }
        get state() {
            return this._gameLogic.state;
        }
        performInput(input) {
            // Ignore inputs.
        }
    }
    class GameEngine {
        constructor(wnd, canvas, ctx) {
            this.wnd = wnd;
            this.canvas = canvas;
            this.ctx = ctx;
            this._isPlaybackMode = false;
        }
        start() {
            this._gameRenderer = new game_logic_1.GameRenderer();
            this._restartLiveMode();
            this._initListeners();
            this._updateCanvasDimensions();
            this._timeout();
        }
        _initListeners() {
            this.wnd.on('resize', () => this._updateCanvasDimensions()).on('keydown', (e) => this._onKeyDown(e));
        }
        _onKeyDown(event) {
            if (event.defaultPrevented) {
                return; // Do nothing if the event was already processed
            }
            if (event.key === 'P' || event.key === 'p') {
                if (!this._isPlaybackMode) {
                    this._enterPlaybackMode();
                }
                else {
                    this._resumeLiveMode();
                }
            }
            else if (event.key === 'n' || event.key === 'N') {
                this._restartLiveMode();
            }
            else if (event.key === '+') {
                this._performInput({
                    inputType: 'speed',
                    speedIncrement: 1,
                });
            }
            else if (event.key === '-') {
                this._performInput({
                    inputType: 'speed',
                    speedIncrement: -1,
                });
            }
            else {
                let newDirection;
                let snakeIdx = 1;
                // noinspection FallThroughInSwitchStatementJS
                switch (event.key) {
                    case "S":
                    case "s":
                        snakeIdx = 0;
                    case "ArrowDown":
                        newDirection = game_logic_1.EDirection.DOWN;
                        break;
                    case "W":
                    case "w":
                        snakeIdx = 0;
                    case "ArrowUp":
                        newDirection = game_logic_1.EDirection.UP;
                        break;
                    case "A":
                    case "a":
                        snakeIdx = 0;
                    case "ArrowLeft":
                        newDirection = game_logic_1.EDirection.LEFT;
                        break;
                    case "D":
                    case "d":
                        snakeIdx = 0;
                    case "ArrowRight":
                        newDirection = game_logic_1.EDirection.RIGHT;
                        break;
                    default:
                        return;
                }
                this._performInput({
                    inputType: 'direction',
                    dir: newDirection,
                    snakeIdx: snakeIdx,
                });
            }
            event.preventDefault();
        }
        _updateCanvasDimensions() {
            this.canvas.attr({
                height: this.wnd.height(),
                width: this.wnd.width()
            });
            this._gameRenderer.onCanvasSizeChanged(this.canvas.width(), this.canvas.height());
            this._draw();
        }
        _timeout() {
            this._update();
            this._draw();
            setTimeout(() => this._timeout(), 30);
        }
        _update() {
            this._advanceTimeToNow();
        }
        _performInput(input) {
            this._advanceTimeToNow();
            this._handler.performInput(input);
        }
        _advanceTimeToNow() {
            const now = performance.now();
            const duration = now - this._lastEngineTime;
            this._handler.advanceTime(duration);
            this._lastEngineTime = now;
            if (this._isPlaybackMode && this._handler.isDone) {
                this._resumeLiveMode();
            }
        }
        _restartLiveMode() {
            const x = 60, y = 40;
            const gameStage = {
                xTiles: x,
                yTiles: y,
                seed: new Date().valueOf(),
                wallHoles: [
                    new utils_2.Vector(0, y / 2),
                    new utils_2.Vector(0, y / 2 + 1),
                    new utils_2.Vector(x - 1, y / 2),
                    new utils_2.Vector(x - 1, y / 2 + 1),
                ],
                blocks: [
                    new utils_2.Vector(x / 2, y / 2),
                    new utils_2.Vector(x / 2 - 1, y / 2 - 1),
                    new utils_2.Vector(x / 2, y / 2 - 1),
                    new utils_2.Vector(x / 2 - 1, y / 2),
                ],
                snakes: [{
                        position: new utils_2.Vector(4, 4),
                        direction: game_logic_1.EDirection.RIGHT,
                    }, {
                        position: new utils_2.Vector(x - 4, y - 4),
                        direction: game_logic_1.EDirection.LEFT,
                    }],
            };
            this._isPlaybackMode = false;
            this._handler = new LiveHandler(gameStage);
            this._lastEngineTime = performance.now();
            this._gameRenderer.initRenderer(this._handler.gameStage);
        }
        _resumeLiveMode() {
            this._isPlaybackMode = false;
            this._handler = new LiveHandler(this._handler.gameStage, this._handler.savedInputs);
        }
        _enterPlaybackMode() {
            this._isPlaybackMode = true;
            this._handler = new PlaybackHandler(this._handler.gameStage, this._handler.savedInputs);
            this._lastEngineTime = performance.now();
        }
        _draw() {
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
            this._gameRenderer.render(this.ctx, this._handler.state, this._isPlaybackMode);
        }
    }
    exports.GameEngine = GameEngine;
});
define("app", ["require", "exports", "game-engine", "jquery"], function (require, exports, game_engine_1, $) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Start game engine
    $(() => {
        const canvas = $("#canvas");
        const wnd = $(window);
        let gameEngine;
        function tryCreateGameEngine() {
            if (gameEngine) {
                return;
            }
            const tmpCanvas = canvas.get(0);
            if (tmpCanvas.getContext != null) {
                const ctx = tmpCanvas.getContext('2d');
                gameEngine = new game_engine_1.GameEngine(wnd, canvas, ctx);
                gameEngine.start();
                return;
            }
            // Retry
            setTimeout(tryCreateGameEngine, 100);
        }
        tryCreateGameEngine();
    });
});
requirejs.config({
    appDir: ".",
    baseUrl: "js",
    paths: {
        'jquery': ['//cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min'],
        'seedrandom': ['//cdnjs.cloudflare.com/ajax/libs/seedrandom/2.4.4/seedrandom.min'],
        'lodash': ['//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min']
    }
});
require(['app']);
//# sourceMappingURL=main.js.map