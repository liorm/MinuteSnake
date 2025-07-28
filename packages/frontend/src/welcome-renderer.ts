/**
 * Player configuration interface for welcome screen menu
 */
export interface PlayerConfiguration {
  humanPlayers: number;
  aiPlayers: number;
  isMultiplayer: boolean;
  roomId?: string;
  playerName?: string;
}

/**
 * Welcome screen menu items
 */
export enum WelcomeMenuItem {
  GAME_MODE = 0,
  HUMAN_PLAYERS = 1,
  AI_PLAYERS = 2,
  PLAYER_NAME = 3,
  ROOM_ID = 4,
  START = 5,
}

import { ConnectionState } from './websocket-client';

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
 * Manages its own state and input handling, including multiplayer connection status.
 */
export class WelcomeRenderer {
  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;
  private _playerConfig: PlayerConfiguration = {
    humanPlayers: 1,
    aiPlayers: 2,
    isMultiplayer: false,
    roomId: '',
    playerName: 'Player1',
  };
  private _selectedMenuItem: WelcomeMenuItem = WelcomeMenuItem.GAME_MODE;
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private _inputBuffer: string = '';

  /**
   * Updates the renderer's understanding of canvas dimensions.
   * Should be called whenever the canvas size changes.
   */
  onCanvasSizeChanged(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
  }

  /**
   * Updates the connection state for multiplayer display
   */
  updateConnectionState(state: ConnectionState): void {
    this._connectionState = state;
  }

  /**
   * Handles keyboard input for the welcome screen.
   * @param event Keyboard event
   * @param callbacks Callback functions for screen completion
   */
  handleKeyInput(event: KeyboardEvent, callbacks: WelcomeScreenCallbacks): void {
    const key = event.key.toLowerCase();

    // Handle text input for player name and room ID
    if (
      this._selectedMenuItem === WelcomeMenuItem.PLAYER_NAME ||
      this._selectedMenuItem === WelcomeMenuItem.ROOM_ID
    ) {
      if (key === 'backspace') {
        this._inputBuffer = this._inputBuffer.slice(0, -1);
        this._updateFromInputBuffer();
        return;
      } else if (key === 'enter') {
        this._updateFromInputBuffer();
        this._selectedMenuItem = Math.min(WelcomeMenuItem.START, this._selectedMenuItem + 1);
        return;
      } else if (key.length === 1 && this._isValidInputChar(key)) {
        this._inputBuffer += key;
        this._updateFromInputBuffer();
        return;
      }
    }

    switch (key) {
      case 'arrowup':
        this._selectedMenuItem = Math.max(0, this._selectedMenuItem - 1);
        this._initializeInputBuffer();
        break;
      case 'arrowdown':
        this._selectedMenuItem = Math.min(WelcomeMenuItem.START, this._selectedMenuItem + 1);
        this._initializeInputBuffer();
        break;
      case 'arrowleft':
        this._adjustValue(-1);
        break;
      case 'arrowright':
        this._adjustValue(1);
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
  handleClickInput(_event: MouseEvent, callbacks: WelcomeScreenCallbacks): void {
    // For now, clicking just starts the game if we're on the start option
    if (this._selectedMenuItem === WelcomeMenuItem.START) {
      this._startGame(callbacks);
    }
  }

  private _adjustValue(delta: number): void {
    switch (this._selectedMenuItem) {
      case WelcomeMenuItem.GAME_MODE:
        this._playerConfig.isMultiplayer = !this._playerConfig.isMultiplayer;
        break;
      case WelcomeMenuItem.HUMAN_PLAYERS:
        this._playerConfig.humanPlayers = Math.max(
          0,
          Math.min(
            this._playerConfig.isMultiplayer ? 1 : 2,
            this._playerConfig.humanPlayers + delta
          )
        );
        break;
      case WelcomeMenuItem.AI_PLAYERS:
        this._playerConfig.aiPlayers = Math.max(
          0,
          Math.min(6, this._playerConfig.aiPlayers + delta)
        );
        break;
    }
  }

  private _isValidInputChar(char: string): boolean {
    return /[a-zA-Z0-9-_]/.test(char);
  }

  private _initializeInputBuffer(): void {
    switch (this._selectedMenuItem) {
      case WelcomeMenuItem.PLAYER_NAME:
        this._inputBuffer = this._playerConfig.playerName || '';
        break;
      case WelcomeMenuItem.ROOM_ID:
        this._inputBuffer = this._playerConfig.roomId || '';
        break;
    }
  }

  private _updateFromInputBuffer(): void {
    switch (this._selectedMenuItem) {
      case WelcomeMenuItem.PLAYER_NAME:
        this._playerConfig.playerName = this._inputBuffer;
        break;
      case WelcomeMenuItem.ROOM_ID:
        this._playerConfig.roomId = this._inputBuffer;
        break;
    }
  }

  private _startGame(callbacks: WelcomeScreenCallbacks): void {
    // Validate that at least one player is selected
    if (this._playerConfig.humanPlayers + this._playerConfig.aiPlayers === 0) {
      return; // Don't start game if no players selected
    }

    // Validate multiplayer configuration
    if (this._playerConfig.isMultiplayer) {
      if (!this._playerConfig.playerName || this._playerConfig.playerName.trim() === '') {
        return; // Don't start if no player name in multiplayer
      }
      if (!this._playerConfig.roomId || this._playerConfig.roomId.trim() === '') {
        return; // Don't start if no room ID in multiplayer
      }
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
    ctx.fillText('Configure Players', canvasWidth / 2, canvasHeight / 6 + titleFontSize * 0.8);

    // Menu setup
    const menuStartY = canvasHeight * 0.4;
    const menuItemHeight = menuFontSize * 2;
    ctx.font = `${menuFontSize}px Arial`;

    // Build menu items based on game mode
    const menuItems = [];

    // Game mode selection
    menuItems.push({
      text: `Game mode: ${this._playerConfig.isMultiplayer ? 'Multiplayer' : 'Single-player'}`,
      menuItem: WelcomeMenuItem.GAME_MODE,
      hasArrows: true,
    });

    // Player configuration
    menuItems.push({
      text: `Human players: ${this._playerConfig.humanPlayers}`,
      menuItem: WelcomeMenuItem.HUMAN_PLAYERS,
      hasArrows: true,
    });

    menuItems.push({
      text: `AI players: ${this._playerConfig.aiPlayers}`,
      menuItem: WelcomeMenuItem.AI_PLAYERS,
      hasArrows: true,
    });

    // Multiplayer-specific options
    if (this._playerConfig.isMultiplayer) {
      const playerNameText =
        this._selectedMenuItem === WelcomeMenuItem.PLAYER_NAME
          ? `Player name: ${this._inputBuffer}_`
          : `Player name: ${this._playerConfig.playerName || '(enter name)'}`;

      menuItems.push({
        text: playerNameText,
        menuItem: WelcomeMenuItem.PLAYER_NAME,
        hasArrows: false,
      });

      const roomIdText =
        this._selectedMenuItem === WelcomeMenuItem.ROOM_ID
          ? `Room ID: ${this._inputBuffer}_`
          : `Room ID: ${this._playerConfig.roomId || '(enter room)'}`;

      menuItems.push({
        text: roomIdText,
        menuItem: WelcomeMenuItem.ROOM_ID,
        hasArrows: false,
      });
    }

    // Start button
    menuItems.push({
      text: 'Start',
      menuItem: WelcomeMenuItem.START,
      hasArrows: false,
    });

    // Draw menu items
    menuItems.forEach((item, index) => {
      const y = menuStartY + index * menuItemHeight;
      const isSelected = this._selectedMenuItem === item.menuItem;

      // Draw selection indicator
      if (isSelected) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(canvasWidth / 2 - 250, y - menuFontSize * 0.7, 500, menuFontSize * 1.4);
      }

      // Draw menu item text
      ctx.fillStyle = isSelected ? '#ffffff' : '#ecf0f1';
      ctx.fillText(item.text, canvasWidth / 2, y);

      // Draw arrows for adjustable items
      if (item.hasArrows) {
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

    // Draw connection status for multiplayer
    if (this._playerConfig.isMultiplayer) {
      const statusY = menuStartY + menuItems.length * menuItemHeight + menuFontSize;
      ctx.font = `${menuFontSize * 0.8}px Arial`;

      let statusText = '';
      let statusColor = '';

      switch (this._connectionState) {
        case ConnectionState.DISCONNECTED:
          statusText = '○ Disconnected';
          statusColor = '#95a5a6';
          break;
        case ConnectionState.CONNECTING:
          statusText = '◐ Connecting...';
          statusColor = '#f39c12';
          break;
        case ConnectionState.CONNECTED:
          statusText = '● Connected';
          statusColor = '#27ae60';
          break;
        case ConnectionState.RECONNECTING:
          statusText = '◑ Reconnecting...';
          statusColor = '#e67e22';
          break;
        case ConnectionState.ERROR:
          statusText = '✗ Connection Error';
          statusColor = '#e74c3c';
          break;
      }

      ctx.fillStyle = statusColor;
      ctx.fillText(`Connection: ${statusText}`, canvasWidth / 2, statusY);
    }

    // Draw instructions
    const connectionOffset = this._playerConfig.isMultiplayer ? menuFontSize * 1.5 : 0;
    const instructionY =
      menuStartY + menuItems.length * menuItemHeight + menuFontSize * 2 + connectionOffset;
    const instructionFontSize = Math.min(canvasWidth, canvasHeight) / 40;
    ctx.font = `${instructionFontSize}px Arial`;
    ctx.fillStyle = '#bdc3c7';

    const instructions = [
      '↑↓ Navigate • ◀▶ Adjust • ENTER Confirm/Start • Type for text fields',
      '',
      'Game Controls: Arrow keys (Player 1) • WASD (Player 2)',
      'P: Playback • N: New game • ESC: Menu • +/-: Speed',
    ];

    instructions.forEach((instruction, index) => {
      const y = instructionY + index * instructionFontSize * 1.5;
      ctx.fillText(instruction, canvasWidth / 2, y);
    });

    // Draw validation messages
    const totalPlayers = this._playerConfig.humanPlayers + this._playerConfig.aiPlayers;
    let validationMessage = '';

    if (totalPlayers === 0) {
      validationMessage = '⚠ Select at least one player to start';
    } else if (this._playerConfig.isMultiplayer) {
      if (!this._playerConfig.playerName || this._playerConfig.playerName.trim() === '') {
        validationMessage = '⚠ Enter player name for multiplayer';
      } else if (!this._playerConfig.roomId || this._playerConfig.roomId.trim() === '') {
        validationMessage = '⚠ Enter room ID for multiplayer';
      }
    }

    if (validationMessage) {
      ctx.font = `Bold ${menuFontSize * 0.8}px Arial`;
      ctx.fillStyle = '#e74c3c';
      ctx.fillText(validationMessage, canvasWidth / 2, instructionY - menuFontSize);
    }
  }
}
