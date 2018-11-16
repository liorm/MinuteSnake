import {
    EDirection,
    GameInput,
    GameRenderer,
    GameLogic,
    IGameOptions
} from './game-logic';

interface IGameInputTime {
    gameInput: GameInput;
    inputTime: number;
}

export class GameEngine {
    gameOptions: IGameOptions;
    renderer: GameRenderer;

    absoluteStartTime: number;
    playedDuration: number;
    gameState: GameLogic;
    savedInputs: IGameInputTime[];
    playbackMode = false;
    playbackInputIndex = 0;

    constructor(
        private wnd: JQuery<Window>,
        private canvas: JQuery<HTMLCanvasElement>,
        private ctx: CanvasRenderingContext2D
    ) {

    }

    start() {
        this.gameOptions = {
            xTiles: 60,
            yTiles: 60,
            seed: new Date().valueOf()
        };
        this.renderer = new GameRenderer(this.gameOptions);

        this.restartLiveMode();
        this.initEventListeners();
        this.updateCanvasDimensions();
        this.timeout();
    }

    initEventListeners() {
        this.wnd.on('resize', () => this.updateCanvasDimensions()).on('keydown', (e) => this.onKeyDown(e));
    }

    onKeyDown(event) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }

        // Can't process actions while in playback mode.
        if (this.playbackMode) {
            return;
        }

        if (event.key === 'P' || event.key === 'p') {
            this.enterPlaybackMode();
        } else if ( event.key ==='+' ) {
            this.recordInput({
                inputType: 'speed',
                speedIncrement: 1,
            });
        } else if ( event.key ==='-' ) {
            this.recordInput({
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

            this.recordInput({
                inputType: 'direction',
                dir: newDirection
            });
        }

        event.preventDefault();
    }

    updateCanvasDimensions() {
        this.canvas.attr({
            height: this.wnd.height(),
            width: this.wnd.width()
        });

        this.renderer.onCanvasSizeChanged(this.canvas.width()!, this.canvas.height()!);
        this.draw();
    }

    timeout() {
        this.update();
        this.draw();
        setTimeout(() => this.timeout(), 30);
    }

    update() {
        const now = performance.now();
        this.advanceTime(now);
    }

    recordInput(input: GameInput) {
        const now = performance.now();
        this.advanceTime(now);
        this.gameState.input(input);
        this.savedInputs.push({
            gameInput: input,
            inputTime: this.playedDuration
        });
    }

    advanceTime(now) {
        do {
            let newPlayedDuration = (now - this.absoluteStartTime);
            if (newPlayedDuration <= this.playedDuration) {
                return;
            }

            if (this.playbackMode) {
                if (this.playbackInputIndex >= this.savedInputs.length) {
                    this.resumeLiveMode();
                } else {
                    // For playback mode, advance until the next input time.
                    const nextInput = this.savedInputs[this.playbackInputIndex];
                    if (newPlayedDuration >= nextInput.inputTime) {
                        newPlayedDuration = nextInput.inputTime;
                    }
                }
            }

            this.gameState.advanceTime(newPlayedDuration - this.playedDuration);
            this.playedDuration = newPlayedDuration;

            if (this.playbackMode) {
                const nextInput = this.savedInputs[this.playbackInputIndex];
                if (this.playedDuration === nextInput.inputTime) {
                    this.gameState.input(nextInput.gameInput);
                    ++this.playbackInputIndex;
                }
            }
        } while (true);
    }

    restartLiveMode() {
        this.playbackMode = false;
        this.savedInputs = [];
        this.gameState = new GameLogic(this.gameOptions);
        this.absoluteStartTime = performance.now();
        this.playedDuration = 0;
    }

    resumeLiveMode() {
        this.playbackMode = false;
    }

    enterPlaybackMode() {
        this.playbackMode = true;
        this.playbackInputIndex = 0;
        this.gameState = new GameLogic(this.gameOptions);
        this.absoluteStartTime = performance.now();
        this.playedDuration = 0;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.renderer.render(this.ctx, this.gameState, this.playbackMode);
    }
}
