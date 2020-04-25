import {Vector} from "./utils";

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

export interface IGameInputDirection {
    inputType: 'direction';
    dir: EDirection;
    snakeIdx: number;
}

export interface IGameInputSpeed {
    inputType: 'speed';
    speedIncrement: number;
}

export type GameInput = IGameInputDirection | IGameInputSpeed;


export interface IGameOptions {
    xTiles: number;
    yTiles: number;
    seed: number;
}

export interface IGameStage extends IGameOptions {
    wallHoles: Vector[];
    blocks: Vector[];

    /// Starting positions for the snake.
    snakes: {
        position: Vector,
        direction: EDirection
    }[];
}

export interface IGameStateSnake {
    position: Vector;
    length: number;
    tiles: Vector[];
}

export interface IGameState {
    blocks: Vector[];

    applePos: Vector | null;
    snakes: IGameStateSnake[];

    gameOver: boolean;
}


/**
 * Represents an actor
 */
export interface ISnakeActor {
    /**
     * Init the actor with a new stage.
     * @param stage
     */
    initialize(stage: IGameStage);

    /**
     * After a step is performed, inform the actor of the new game state.
     * @param state
     */
    updateState(state: IGameState): IGameInputDirection | null;

    /**
     * Handle keyboard inputs.
     * @param event
     */
    handleKeyboardInput(event: KeyboardEvent): IGameInputDirection | null;
}

