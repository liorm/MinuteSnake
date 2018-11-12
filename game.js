'use strict';

const Direction = Object.freeze({
    UP: Symbol("UP"),
    DOWN: Symbol("DOWN"),
    LEFT: Symbol("LEFT"),
    RIGHT: Symbol("RIGHT"),
});

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
    const TILES_X = 40;
    const TILES_Y = 40;

    const canvas = $("#canvas");
    let ctx;
    let canvasHeight;
    let canvasWidth;
    let paddingX;
    let paddingY;
    let tileWidth;
    let tileHeight;
    let lastUpdateTime = performance.now();

    const gameState = {
        applesPosition: null,
        snakeTiles: [],
        snakeLength: 4,
        headPosition: new Vector(0, 0),

        direction: new Vector(1, 0),
    }

    function init() {
        initGameData();
        updateCanvasDimensions();
        initEventListeners();
        timeout();
    };

    function initGameData() {
        gameState.tiles = new Array(TILES_X);
        for (let x = 0; x < TILES_X; ++x) {
            gameState.tiles[x] = new Array(TILES_Y);
        }
    }

    function initEventListeners() {
        $(window).bind('resize', updateCanvasDimensions).bind('keydown', onKeyDown);
    };

    function onKeyDown(e) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }

        let newDirection;

        switch (event.key) {
            case "ArrowDown":
                newDirection = new Vector(0, -1);
                break;
            case "ArrowUp":
                newDirection = new Vector(0, 1);
                break;
            case "ArrowLeft":
                newDirection = new Vector(-1, 0);
                break;
            case "ArrowRight":
                newDirection = new Vector(1, 0);
                break;
            default:
                return;
        }

        if (!newDirection.equals(gameState.direction)) {
            gameState.direction = newDirection;
            snakeStep();
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
        draw();
        update();
        setTimeout(function () { timeout() }, 30);
    };

    function snakeStep() {
        gameState.headPosition = gameState.headPosition.add(gameState.direction);
        gameState.snakeTiles.push(gameState.headPosition.clone());

        // Eat the apple.
        if (gameState.headPosition.equals(gameState.applesPosition)) {
            gameState.snakeLength += 2;
            gameState.applesPosition = null;
        }
        
        while (gameState.snakeTiles.length > gameState.snakeLength) {
            gameState.snakeTiles.splice(0, 1);
        }
    }

    let moveEllapsed = 0;
    function update() {
        const ellapsed = performance.now() - lastUpdateTime;
        lastUpdateTime += ellapsed;

        moveEllapsed += ellapsed / 100;
        const steps = Math.floor(moveEllapsed);
        moveEllapsed -= steps;

        for (let step = 0; step < steps; ++step) {
            snakeStep();
        }

        if (!gameState.applesPosition) {
            gameState.applesPosition = new Vector(Math.floor(Math.random() * TILES_X), Math.floor(Math.random() * TILES_Y));
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

        if (gameState.applesPosition) {
            drawTile(gameState.applesPosition, 'red');
        }
        gameState.snakeTiles.forEach(tile => {
            drawTile(tile, 'blue');
        });
    }

    init();
});
