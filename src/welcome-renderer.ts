/**
 * Player configuration interface for welcome screen menu
 */
export interface PlayerConfiguration {
  humanPlayers: number;
  aiPlayers: number;
  nnPlayers: number;
}

/**
 * Welcome screen menu items
 */
export enum WelcomeMenuItem {
  HUMAN_PLAYERS = 0,
  AI_PLAYERS = 1,
  NN_PLAYERS = 2,
  START = 3,
}

/**
 * Callback interface for welcome screen completion
 */
export interface WelcomeScreenCallbacks {
  onStartGame: (config: PlayerConfiguration) => void;
}

/**
 * Handles rendering and input for the welcome screen using HTML5 Canvas API.
 * Displays the game title, instructions, and interactive player selection menu
 * with responsive sizing that adapts to different screen dimensions.
 * Manages its own state and input handling.
 */
export class WelcomeRenderer {
  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;
  private _playerConfig: PlayerConfiguration = {
    humanPlayers: 1,
    aiPlayers: 1,
    nnPlayers: 1,
  };
  private _selectedMenuItem: WelcomeMenuItem = WelcomeMenuItem.HUMAN_PLAYERS;

  /**
   * Updates the renderer's understanding of canvas dimensions.
   * Should be called whenever the canvas size changes.
   */
  onCanvasSizeChanged(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
  }

  /**
   * Handles keyboard input for the welcome screen.
   * @param event Keyboard event
   * @param callbacks Callback functions for screen completion
   */
  handleKeyInput(
    event: KeyboardEvent,
    callbacks: WelcomeScreenCallbacks
  ): void {
    const key = event.key.toLowerCase();

    switch (key) {
      case 'arrowup':
        this._selectedMenuItem = Math.max(0, this._selectedMenuItem - 1);
        break;
      case 'arrowdown':
        this._selectedMenuItem = Math.min(
          WelcomeMenuItem.START,
          this._selectedMenuItem + 1
        );
        break;
      case 'arrowleft':
        this._adjustPlayerCount(-1);
        break;
      case 'arrowright':
        this._adjustPlayerCount(1);
        break;
      case 'enter':
        if (this._selectedMenuItem === WelcomeMenuItem.START) {
          this._startGame(callbacks);
        }
        break;
    }
  }

  /**
   * Handles mouse click input for the welcome screen.
   * @param event Mouse event
   * @param callbacks Callback functions for screen completion
   */
  handleClickInput(
    _event: MouseEvent,
    callbacks: WelcomeScreenCallbacks
  ): void {
    // For now, clicking just starts the game if we're on the start option
    if (this._selectedMenuItem === WelcomeMenuItem.START) {
      this._startGame(callbacks);
    }
  }

  private _adjustPlayerCount(delta: number): void {
    if (this._selectedMenuItem === WelcomeMenuItem.HUMAN_PLAYERS) {
      this._playerConfig.humanPlayers = Math.max(
        0,
        Math.min(2, this._playerConfig.humanPlayers + delta)
      );
    } else if (this._selectedMenuItem === WelcomeMenuItem.AI_PLAYERS) {
      this._playerConfig.aiPlayers = Math.max(
        0,
        Math.min(6, this._playerConfig.aiPlayers + delta)
      );
    } else if (this._selectedMenuItem === WelcomeMenuItem.NN_PLAYERS) {
      this._playerConfig.nnPlayers = Math.max(
        0,
        Math.min(4, this._playerConfig.nnPlayers + delta)
      );
    }
  }

  private _startGame(callbacks: WelcomeScreenCallbacks): void {
    // Validate that at least one player is selected
    if (
      this._playerConfig.humanPlayers +
        this._playerConfig.aiPlayers +
        this._playerConfig.nnPlayers ===
      0
    ) {
      return; // Don't start game if no players selected
    }

    callbacks.onStartGame(this._playerConfig);
  }

  /**
   * Renders the welcome screen to the provided canvas context.
   * Displays title, player selection menu, and navigation instructions.
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
    const subtitleFontSize = Math.min(canvasWidth, canvasHeight) / 20;
    const menuFontSize = Math.min(canvasWidth, canvasHeight) / 25;

    // Set text properties
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw title
    ctx.font = `Bold ${titleFontSize}px Arial`;
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('MinuteSnake', canvasWidth / 2, canvasHeight / 6);

    // Draw subtitle
    ctx.font = `${subtitleFontSize}px Arial`;
    ctx.fillStyle = '#95a5a6';
    ctx.fillText(
      'Configure Players',
      canvasWidth / 2,
      canvasHeight / 6 + titleFontSize * 0.8
    );

    // Menu setup
    const menuStartY = canvasHeight * 0.4;
    const menuItemHeight = menuFontSize * 2;
    ctx.font = `${menuFontSize}px Arial`;

    // Menu items
    const menuItems = [
      {
        text: `Human players: ${this._playerConfig.humanPlayers}`,
        menuItem: WelcomeMenuItem.HUMAN_PLAYERS,
      },
      {
        text: `AI players: ${this._playerConfig.aiPlayers}`,
        menuItem: WelcomeMenuItem.AI_PLAYERS,
      },
      {
        text: `NN players: ${this._playerConfig.nnPlayers}`,
        menuItem: WelcomeMenuItem.NN_PLAYERS,
      },
      { text: 'Start', menuItem: WelcomeMenuItem.START },
    ];

    // Draw menu items
    menuItems.forEach((item, index) => {
      const y = menuStartY + index * menuItemHeight;
      const isSelected = this._selectedMenuItem === item.menuItem;

      // Draw selection indicator
      if (isSelected) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(
          canvasWidth / 2 - 200,
          y - menuFontSize * 0.7,
          400,
          menuFontSize * 1.4
        );
      }

      // Draw menu item text
      ctx.fillStyle = isSelected ? '#ffffff' : '#ecf0f1';
      ctx.fillText(item.text, canvasWidth / 2, y);

      // Draw arrows for player count items
      if (
        item.menuItem === WelcomeMenuItem.HUMAN_PLAYERS ||
        item.menuItem === WelcomeMenuItem.AI_PLAYERS ||
        item.menuItem === WelcomeMenuItem.NN_PLAYERS
      ) {
        ctx.fillStyle = isSelected ? '#ffffff' : '#95a5a6';

        // Calculate text width and position arrows outside the text
        const textWidth = ctx.measureText(item.text).width;
        const arrowMargin = menuFontSize * 0.8; // Space between text and arrows
        const leftArrowX = canvasWidth / 2 - textWidth / 2 - arrowMargin;
        const rightArrowX = canvasWidth / 2 + textWidth / 2 + arrowMargin;

        ctx.fillText('◀', leftArrowX, y);
        ctx.fillText('▶', rightArrowX, y);
      }
    });

    // Draw instructions
    const instructionY =
      menuStartY + menuItems.length * menuItemHeight + menuFontSize * 2;
    const instructionFontSize = Math.min(canvasWidth, canvasHeight) / 35;
    ctx.font = `${instructionFontSize}px Arial`;
    ctx.fillStyle = '#bdc3c7';

    const instructions = [
      '↑↓ Navigate menu • ◀▶ Adjust players • ENTER Start game',
      '',
      'NN players: Neural Network AI (experimental)',
      'Game Controls: Arrow keys (Player 1) • WASD (Player 2)',
      'P: Playback • N: New game • ESC: Menu • +/-: Speed',
    ];

    instructions.forEach((instruction, index) => {
      const y = instructionY + index * instructionFontSize * 1.5;
      ctx.fillText(instruction, canvasWidth / 2, y);
    });

    // Draw total players validation
    const totalPlayers =
      this._playerConfig.humanPlayers +
      this._playerConfig.aiPlayers +
      this._playerConfig.nnPlayers;
    if (totalPlayers === 0) {
      ctx.font = `Bold ${menuFontSize * 0.8}px Arial`;
      ctx.fillStyle = '#e74c3c';
      ctx.fillText(
        '⚠ Select at least one player to start',
        canvasWidth / 2,
        instructionY - menuFontSize
      );
    }
  }
}
