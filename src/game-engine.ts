import * as $ from 'jquery';
import {EDirection, GameInput, GameRenderer, GameState, IGameOptions} from './game-state';

interface IGameInputTime {
    gameInput: GameInput;
    inputTime: number;
}

$(() => {
    const canvas = $("#canvas");
    let ctx: CanvasRenderingContext2D;
    let renderer: GameRenderer;

    let absoluteStartTime: number;
    let playedDuration: number;
    let gameOptions: IGameOptions;
    let gameState: GameState;
    let savedInputs: IGameInputTime[];
    let playbackMode = false;
    let playbackInputIndex = 0;

    function init() {
        gameOptions = {
            xTiles: 100,
            yTiles: 100,
            seed: new Date().valueOf()
        };
        renderer = new GameRenderer(gameOptions);

        restartLiveMode();
        updateCanvasDimensions();
        initEventListeners();
        timeout();
    }

    function initEventListeners() {
        $(window).on('resize', updateCanvasDimensions).on('keydown', onKeyDown);
    }
    function onKeyDown(event) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }

        // Can't process actions while in playback mode.
        if (playbackMode) {
            return;
        }
        
        if (event.key === 'P' || event.key === 'p') {
            enterPlaybackMode();
        } else if ( event.key ==='+' ) {
            recordInput({
                inputType: 'speed',
                speedIncrement: 1,
            });
        } else if ( event.key ==='-' ) {
            recordInput({
                inputType: 'speed',
                speedIncrement: -1,
            });
        } else {
            let newDirection;

            switch (event.key) {
                case "ArrowDown":
                    newDirection = EDirection.DOWN;
                    break;
                case "ArrowUp":
                    newDirection = EDirection.UP;
                    break;
                case "ArrowLeft":
                    newDirection = EDirection.LEFT;
                    break;
                case "ArrowRight":
                    newDirection = EDirection.RIGHT;
                    break;
                default:
                    return;
            }

            recordInput({
                inputType: 'direction',
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

        renderer.onCanvasSizeChanged(canvas.width()!, canvas.height()!);
        draw();
    }
    function timeout() {
        update();
        draw();
        setTimeout(() => timeout(), 30);
    }
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
            }
            ctx = tmpCanvas.getContext('2d')!;
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        renderer.render(ctx, gameState, playbackMode);
    }

    init();
});
