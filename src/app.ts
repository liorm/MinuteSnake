import { GameEngine } from './game-engine.js';

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
