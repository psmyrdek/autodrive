import {GameConfig} from "./config.js";
import {GameScene} from "./scenes/GameScene.js";
import {TrackManager} from "./utils/TrackManager.js";

const config = {
  type: Phaser.AUTO,
  width: GameConfig.width,
  height: GameConfig.height,
  parent: "game-container",
  backgroundColor: GameConfig.backgroundColor,
  physics: {
    default: "arcade",
    arcade: {
      gravity: {y: 0},
      debug: false,
    },
  },
  scene: [GameScene],
};

let game = new Phaser.Game(config);
const trackManager = new TrackManager();

// Initialize track picker UI
trackManager.initializeUI().then(() => {
  // Start game with initial track
  game.scene.start("GameScene", {trackPath: trackManager.getCurrentTrackPath()});
});

// Handle track changes - restart the game
trackManager.onTrackChange((selectedTrack) => {
  // Destroy the current game
  game.destroy(true);

  // Create a new game instance
  game = new Phaser.Game(config);

  // Start with the new track
  game.scene.start("GameScene", {trackPath: selectedTrack.path});
});
