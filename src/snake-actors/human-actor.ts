import {EDirection, IGameInputDirection, IGameStage, IGameState, ISnakeActor} from "../interfaces";

export class HumanActor implements ISnakeActor {
    private _stage: IGameStage;

    constructor(private _snakeIdx: number) {
    }

    initialize(stage: IGameStage) {
        this._stage = stage;
    }

    handleKeyboardInput(event: KeyboardEvent): IGameInputDirection | null {
        let newDirection: EDirection;
        let eventSnakeIdx = 1;

        // noinspection FallThroughInSwitchStatementJS
        switch (event.key) {
            case "S":
            case "s":
                eventSnakeIdx = 0;
            case "ArrowDown":
                newDirection = EDirection.DOWN;
                break;
            case "W":
            case "w":
                eventSnakeIdx = 0;
            case "ArrowUp":
                newDirection = EDirection.UP;
                break;
            case "A":
            case "a":
                eventSnakeIdx = 0;
            case "ArrowLeft":
                newDirection = EDirection.LEFT;
                break;
            case "D":
            case "d":
                eventSnakeIdx = 0;
            case "ArrowRight":
                newDirection = EDirection.RIGHT;
                break;
            default:
                return null;
        }

        // Ensure input belongs to this actor.
        if (eventSnakeIdx !== this._snakeIdx) {
            return null;
        }

        return {
            dir: newDirection,
            inputType: "direction",
            snakeIdx: this._snakeIdx
        }
    }

    updateState(state: IGameState) {
        // No-op
        return null;
    }
}