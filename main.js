import { GameController } from './src/core/GameController.js';

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const gameController = new GameController();
  gameController.initialize();
}); 