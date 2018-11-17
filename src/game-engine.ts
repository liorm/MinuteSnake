import {
    EDirection,
    GameInput,
    GameRenderer,
    GameLogic,
    IGameOptions, IGameEventInput, IGameState, IGameStage
} from './game-logic';
import {Vector} from "./utils";

abstract class GameHandlerBase {
    abstract get gameStage(): IGameStage;
    abstract get state(): IGameState;
    abstract get savedInputs(): IGameEventInput[];
    abstract get isDone(): boolean;
    abstract advanceTime(duration: number);
    abstract performInput(input: GameInput);
}

class LiveHandler extends GameHandlerBase {
    private _gameLogic: GameLogic;
    savedInputs: IGameEventInput[];

    get gameStage(): IGameStage { return this._gameStage; }

    constructor(
        private _gameStage: IGameStage,
        savedInputs?: IGameEventInput[],
    ) {
        super();

        this.savedInputs = savedInputs || [];
        this._gameLogic = new GameLogic(this._gameStage);

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

    advanceTime(duration: number) {
        this._gameLogic.advanceTime(duration);
    }

    get isDone() { return false; }

    get state(): IGameState {
        return this._gameLogic.state;
    }

    private _onGameInput(e) {
        this.savedInputs.push(e);
    }

    performInput(input: GameInput) {
        this._gameLogic.input(input);
    }
}

class PlaybackHandler extends GameHandlerBase {
    private _gameLogic: GameLogic;
    private _inputIndex: number;

    get gameStage(): IGameStage { return this._gameStage; }

    constructor(
        private _gameStage: IGameStage,
        public savedInputs: IGameEventInput[],
    ) {
        super();

        this._gameLogic = new GameLogic(this._gameStage);
        this._inputIndex = 0;
    }

    get isDone() { return this._inputIndex >= this.savedInputs.length; }

    advanceTime(duration: number) {
        if (this._inputIndex >= this.savedInputs.length) {
            return;
        }

        while (duration > 0)
        {
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

    get state(): IGameState {
        return this._gameLogic.state;
    }

    performInput(input: GameInput) {
        // Ignore inputs.
    }
}

export class GameEngine {
    private _gameRenderer: GameRenderer;
    private _handler: GameHandlerBase;

    private _lastEngineTime: number;
    private _isPlaybackMode = false;

    constructor(
        private wnd: JQuery<Window>,
        private canvas: JQuery<HTMLCanvasElement>,
        private ctx: CanvasRenderingContext2D
    ) {
    }

    start() {
        this._gameRenderer = new GameRenderer();

        this._restartLiveMode();
        this._initListeners();
        this._updateCanvasDimensions();
        this._timeout();
    }

    private _initListeners() {
        this.wnd.on('resize', () => this._updateCanvasDimensions()).on('keydown', (e) => this._onKeyDown(e));
    }

    private _onKeyDown(event) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }

        if (event.key === 'P' || event.key === 'p') {
            if (!this._isPlaybackMode) {
                this._enterPlaybackMode();
            } else {
                this._resumeLiveMode();
            }
        } else if ( event.key ==='n' || event.key === 'N' ) {
            this._restartLiveMode();
        } else if ( event.key ==='+' ) {
            this._performInput({
                inputType: 'speed',
                speedIncrement: 1,
            });
        } else if ( event.key ==='-' ) {
            this._performInput({
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

            this._performInput({
                inputType: 'direction',
                dir: newDirection
            });
        }

        event.preventDefault();
    }

    private _updateCanvasDimensions() {
        this.canvas.attr({
            height: this.wnd.height(),
            width: this.wnd.width()
        });

        this._gameRenderer.onCanvasSizeChanged(this.canvas.width()!, this.canvas.height()!);
        this._draw();
    }

    private _timeout() {
        this._update();
        this._draw();
        setTimeout(() => this._timeout(), 30);
    }

    private _update() {
        this._advanceTimeToNow();
    }

    private _performInput(input: GameInput) {
        this._advanceTimeToNow();
        this._handler.performInput(input);
    }

    private _advanceTimeToNow() {
        const now = performance.now();
        const duration = now - this._lastEngineTime;
        this._handler.advanceTime(duration);
        this._lastEngineTime = now;

        if (this._isPlaybackMode && this._handler.isDone) {
            this._resumeLiveMode();
        }
    }

    private _restartLiveMode() {
        const x = 60, y = 40;
        const gameStage = {
            xTiles: x,
            yTiles: y,
            seed: new Date().valueOf(),
            wallHoles: [
                new Vector(0, y / 2),
                new Vector(0, y / 2 + 1),
                new Vector(x - 1, y / 2),
                new Vector(x - 1, y / 2 + 1),
            ],
            blocks: [
                new Vector(x / 2, y / 2),
                new Vector(x / 2 - 1, y / 2 - 1),
                new Vector(x / 2, y / 2 - 1),
                new Vector(x / 2 - 1, y / 2),
            ]
        };

        this._isPlaybackMode = false;
        this._handler = new LiveHandler(gameStage);
        this._lastEngineTime = performance.now();
        this._gameRenderer.initRenderer(this._handler.gameStage);
    }

    private _resumeLiveMode() {
        this._isPlaybackMode = false;
        this._handler = new LiveHandler(this._handler.gameStage, this._handler.savedInputs);
    }

    private _enterPlaybackMode() {
        this._isPlaybackMode = true;
        this._handler = new PlaybackHandler(this._handler.gameStage, this._handler.savedInputs);
        this._lastEngineTime = performance.now();
    }

    private _draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this._gameRenderer.render(
            this.ctx,
            this._handler.state,
            this._isPlaybackMode
        );
    }
}
