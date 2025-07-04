/**
 * Handles rendering of the welcome screen using HTML5 Canvas API.
 * Displays the game title, instructions, and start button with responsive
 * sizing that adapts to different screen dimensions.
 */
export class WelcomeRenderer {
  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;

  /**
   * Updates the renderer's understanding of canvas dimensions.
   * Should be called whenever the canvas size changes.
   */
  onCanvasSizeChanged(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
  }

  /**
   * Renders the welcome screen to the provided canvas context.
   * Displays title, instructions, and interactive elements.
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Use canvas dimensions if our stored dimensions are zero
    const canvasWidth = this._canvasWidth || ctx.canvas.width;
    const canvasHeight = this._canvasHeight || ctx.canvas.height;

    // Draw background
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate responsive font sizes
    const titleFontSize = Math.min(canvasWidth, canvasHeight) / 10;
    const instructionFontSize = Math.min(canvasWidth, canvasHeight) / 20;
    const buttonFontSize = Math.min(canvasWidth, canvasHeight) / 25;

    // Draw title
    ctx.font = `Bold ${titleFontSize}px Arial`;
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = 'MinuteSnake';
    ctx.fillText(title, canvasWidth / 2, canvasHeight / 4);

    // Draw subtitle
    ctx.font = `${instructionFontSize}px Arial`;
    ctx.fillStyle = '#95a5a6';
    ctx.fillText(
      'A modern Snake game',
      canvasWidth / 2,
      canvasHeight / 4 + titleFontSize
    );

    // Draw instructions
    const instructions = [
      'Press ENTER or CLICK to start game',
      '',
      'Controls:',
      '• Arrow keys to move',
      '• P to playback game',
      '• N to start new game',
      '• +/- to change speed',
      '• ESC to return to menu',
    ];

    ctx.font = `${buttonFontSize}px Arial`;
    ctx.fillStyle = '#bdc3c7';

    const startY = canvasHeight / 2;
    const lineHeight = buttonFontSize * 1.5;

    instructions.forEach((instruction, index) => {
      const y = startY + index * lineHeight;
      if (index === 0) {
        // Highlight the start instruction
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(instruction, canvasWidth / 2, y);
        ctx.fillStyle = '#bdc3c7';
      } else {
        ctx.fillText(instruction, canvasWidth / 2, y);
      }
    });

    // Draw animated start prompt
    const time = Date.now();
    const alpha = (Math.sin(time * 0.005) + 1) / 2; // Oscillate between 0 and 1
    ctx.globalAlpha = alpha * 0.7 + 0.3; // Range from 0.3 to 1.0

    ctx.font = `Bold ${buttonFontSize}px Arial`;
    ctx.fillStyle = '#2ecc71';
    ctx.fillText(
      '▶ Press ENTER or CLICK to Play',
      canvasWidth / 2,
      canvasHeight * 0.85
    );

    ctx.globalAlpha = 1.0; // Reset alpha
  }
}
