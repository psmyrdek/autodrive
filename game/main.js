import {GameConfig} from "./config.js";
import {GameScene} from "./scenes/GameScene.js";

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

const game = new Phaser.Game(config);
