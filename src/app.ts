import { GameEngine } from './game-engine';

/**
 * Main application entry point that bootstraps the game.
 * Handles canvas initialization and creates the GameEngine instance
 * when the DOM content is loaded. Serves as the primary coordinator
 * between the browser environment and the game engine.
 *
 * Example: The game starts when `new GameApp()` is called, triggering
 * canvas setup and game engine initialization
 */
class GameApp {
  private gameEngine: GameEngine | null = null;

  constructor() {
    window.addEventListener('DOMContentLoaded', () => this.initialize());
  }

  private initialize(): void {
    const canvas = document.querySelector<HTMLCanvasElement>('#canvas');

    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Could not get 2D context');
      return;
    }

    this.gameEngine = new GameEngine(window, canvas, context);
    this.gameEngine.start();
  }
}

// Initialize the game
new GameApp();
