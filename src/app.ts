import {GameEngine} from "./game-engine";
import * as $ from 'jquery';

// Start game engine
$(() => {
    const canvas: JQuery<HTMLCanvasElement> = $("#canvas");
    const wnd = $(window);
    let gameEngine: GameEngine;

    function tryCreateGameEngine() {
        if (gameEngine) {
            return;
        }

        const tmpCanvas = canvas.get(0);
        if (tmpCanvas.getContext != null) {
            const ctx = tmpCanvas.getContext('2d')!;
            gameEngine = new GameEngine(wnd, canvas, ctx);
            gameEngine.start();
            return;
        }

        // Retry
        setTimeout(tryCreateGameEngine, 100);
    }

    tryCreateGameEngine();
});
