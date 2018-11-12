'use strict';

const TILES_X = 40;
const TILES_Y = 40;

const Direction = Object.freeze({
    UP: Symbol("UP"),
    DOWN: Symbol("DOWN"),
    LEFT: Symbol("LEFT"),
    RIGHT: Symbol("RIGHT"),
});

let actionsStartTime;

class ActionBase {
    constructor() {
        this.actionTime = performance.now() - actionsStartTime;
    }

    act(state) {
        // Do nothing in base
    }
}

class ActionInitState extends ActionBase {
    act(state) {
        return {
            applePos: null,
            snakeTiles: [],
            snakeLength: 4,
            headPosition: new Vector(1, 1),
    
            dir: Direction.RIGHT,
        };
    }
}

class ActionNewApple extends ActionBase {
    constructor(position) {
        super();

        this.position = position;
    }

    act(state) {
        return Object.assign({}, state, {
            applePos: this.position,
        });
    }
}

class ActionChangeDirection extends ActionBase {
    constructor(newDir) {
        super();

        this.newDir = newDir;
    }

    act(state) {
        return Object.assign({}, state, {
            dir: this.newDir,
        });
    }
}

class ActionSnakeStep extends ActionBase {
    act(state) {
        const gameState = Object.assign({}, state);

        let direction;
        switch (gameState.dir) {
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

        gameState.headPosition = gameState.headPosition.add(direction);

        if (gameState.headPosition.x <= 0) {
            gameState.headPosition.x = TILES_X - 2;
        }
        if (gameState.headPosition.y <= 0) {
            gameState.headPosition.y = TILES_Y - 2;
        }
        if (gameState.headPosition.x >= TILES_X - 1) {
            gameState.headPosition.x = 1;
        }
        if (gameState.headPosition.y >= TILES_Y - 1) {
            gameState.headPosition.y = 1;
        }

        gameState.snakeTiles.push(gameState.headPosition.clone());

        // Eat the apple.
        if (gameState.headPosition.equals(gameState.applePos)) {
            gameState.snakeLength += 2;
            gameState.applePos = null;
        }
        
        while (gameState.snakeTiles.length > gameState.snakeLength) {
            gameState.snakeTiles.splice(0, 1);
        }

        return gameState;
    }
}

class Vector {
    constructor(vx, y) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            this.x = vx.x;
            this.y = vx.y;
        } else {
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
        } else {
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
        } else {
            return new Vector(this.x + vx, this.y + y);
        }
    }

    sub(vx, y) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            return this.add(-vx.x, -vx.y);
        } else {
            return this.add(-vx, -y);
        }
    }

    mul(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }
}

$(() => {
    const canvas = $("#canvas");
    let ctx;
    let canvasHeight;
    let canvasWidth;
    let paddingX;
    let paddingY;
    let tileWidth;
    let tileHeight;
    let lastUpdateTime;
    let gameState;
    let savedActions = [];
    let playbackMode = false;

    function init() {
        restartLiveMode();
        updateCanvasDimensions();
        initEventListeners();
        timeout();
    };

    function initEventListeners() {
        $(window).bind('resize', updateCanvasDimensions).bind('keydown', onKeyDown);
    };

    function onKeyDown(e) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }
        
        if (event.key === "P") {
            enterPlaybackMode();
        } else {
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

            if (newDirection !== gameState.dir) {
                applyAction(new ActionChangeDirection(newDirection));
                applyAction(new ActionSnakeStep());
            }
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

        tileWidth = canvasWidth / TILES_X;
        tileHeight = canvasHeight / TILES_Y;
        draw();
    };

    function timeout() {
        update();
        draw();
        setTimeout(() => timeout(), 30);
    };

    function update() {
        if (playbackMode) {
            updatePlayback();
        } else {
            updateLive();
        }
    }

    let moveEllapsed = 0;
    function updateLive() {
        const ellapsed = performance.now() - lastUpdateTime;
        lastUpdateTime += ellapsed;

        moveEllapsed += ellapsed / 60;
        const steps = Math.floor(moveEllapsed);
        moveEllapsed -= steps;

        for (let step = 0; step < steps; ++step) {
            applyAction(new ActionSnakeStep());
        }

        if (!gameState.applePos) {
            let newPos;
            while (true) {
                newPos = new Vector(Math.floor(Math.random() * TILES_X), Math.floor(Math.random() * TILES_Y));
                if (newPos.x === 0 || newPos.x >= TILES_X - 1)
                    continue;
                if (newPos.y === 0 || newPos.y >= TILES_Y - 1)
                    continue;

                let collides = false;
                for (let i = 0; i < gameState.snakeTiles.length; ++i) {
                    if (gameState.snakeTiles[i].equals(newPos)) {
                        collides = true;
                        break;
                    }
                }
                if (collides)
                    continue;

                break;
            };

            applyAction(new ActionNewApple(newPos));
        }
    }

    function applyAction(action, dontSave) {
        gameState = action.act(gameState);
        if (!dontSave) {
            if (savedActions.length === 0) {
                actionsStartTime = performance.now();
            }
            savedActions.push(action);
        }
    }

    function restartLiveMode() {
        playbackMode = false;
        lastUpdateTime = performance.now();
        
        savedActions = [];
        actionsStartTime = performance.now();
        applyAction(new ActionInitState());
    }

    function resumeLiveMode() {
        playbackMode = false;
        lastUpdateTime = performance.now();
    }

    let currentAction = 0;
    function enterPlaybackMode() {
        playbackMode = true;
        currentAction = 0;
        actionsStartTime = performance.now();
    }

    function updatePlayback() {
        if (currentAction >= savedActions.length) {
            resumeLiveMode();
            return;
        }

        while (savedActions[currentAction] && performance.now() - actionsStartTime >= savedActions[currentAction].actionTime) {
            applyAction(savedActions[currentAction], true);

            // Move to next action.
            ++currentAction;
        }
    }

    function draw() {
        if (!ctx) {
            var tmpCanvas = canvas.get(0);
            if (tmpCanvas.getContext == null) {
                return;
            };
            ctx = tmpCanvas.getContext('2d');
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
            tileWidth * TILES_X, tileHeight * TILES_Y);
        ctx.fillStyle = 'green';
        ctx.fillRect(
            paddingX + tileWidth, paddingY + tileWidth, 
            tileWidth * (TILES_X - 2), tileHeight * (TILES_Y - 2));

        if (gameState.applePos) {
            drawTile(gameState.applePos, 'red');
        }
        gameState.snakeTiles.forEach(tile => {
            drawTile(tile, 'blue');
        });
    }

    init();
});
