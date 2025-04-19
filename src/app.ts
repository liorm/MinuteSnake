import { GameEngine } from './game-engine.js';
import { HumanActor } from './actors.js';

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
    
    // Create two human actors with their key mappings
    const player1 = new HumanActor(0, {
      up: 'w',
      down: 's',
      left: 'a',
      right: 'd'
    });

    const player2 = new HumanActor(1, {
      up: 'arrowup',
      down: 'arrowdown',
      left: 'arrowleft',
      right: 'arrowright'
    });

    // Add actors to the game engine
    this.gameEngine.addActor(player1);
    this.gameEngine.addActor(player2);

    this.gameEngine.start();
  }
}

// Initialize the game
new GameApp();
