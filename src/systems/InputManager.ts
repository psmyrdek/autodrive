import Phaser from "phaser";
import {CarPhysics} from "./CarPhysics";

type KeyMap = {
  W?: Phaser.Input.Keyboard.Key;
  A?: Phaser.Input.Keyboard.Key;
  S?: Phaser.Input.Keyboard.Key;
  D?: Phaser.Input.Keyboard.Key;
  UP?: Phaser.Input.Keyboard.Key;
  LEFT?: Phaser.Input.Keyboard.Key;
  DOWN?: Phaser.Input.Keyboard.Key;
  RIGHT?: Phaser.Input.Keyboard.Key;
};

export class InputManager {
  private keys: KeyMap = {};
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupInput();
  }

  private setupInput() {
    if (!this.scene.input.keyboard) return;

    // WASD keys
    this.keys.W = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.W
    );
    this.keys.A = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.A
    );
    this.keys.S = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.S
    );
    this.keys.D = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.D
    );

    // Arrow keys (alternative input)
    this.keys.UP = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.UP
    );
    this.keys.LEFT = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.LEFT
    );
    this.keys.DOWN = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.DOWN
    );
    this.keys.RIGHT = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.RIGHT
    );
  }

  handleInput(carPhysics: CarPhysics, deltaSeconds: number) {
    const speed = carPhysics.getSpeed();

    // W or UP - Accelerate forward
    if (this.keys.W?.isDown || this.keys.UP?.isDown) {
      carPhysics.accelerate(deltaSeconds);
    }

    // S or DOWN - Reverse / Brake
    if (this.keys.S?.isDown || this.keys.DOWN?.isDown) {
      if (speed > 10) {
        // Brake if moving forward
        carPhysics.brake();
      } else {
        // Reverse if slow/stopped
        carPhysics.reverse(deltaSeconds);
      }
    }

    // A or LEFT - Turn left (only when moving)
    if ((this.keys.A?.isDown || this.keys.LEFT?.isDown) && speed > 20) {
      carPhysics.turnLeft(deltaSeconds);
    }

    // D or RIGHT - Turn right (only when moving)
    if ((this.keys.D?.isDown || this.keys.RIGHT?.isDown) && speed > 20) {
      carPhysics.turnRight(deltaSeconds);
    }
  }

  isKeyDown(key: "W" | "A" | "S" | "D"): boolean {
    // Check both WASD and arrow key equivalents
    switch (key) {
      case "W":
        return this.keys.W?.isDown || this.keys.UP?.isDown || false;
      case "A":
        return this.keys.A?.isDown || this.keys.LEFT?.isDown || false;
      case "S":
        return this.keys.S?.isDown || this.keys.DOWN?.isDown || false;
      case "D":
        return this.keys.D?.isDown || this.keys.RIGHT?.isDown || false;
      default:
        return false;
    }
  }

  hasAnyInput(): boolean {
    return (
      this.keys.W?.isDown ||
      this.keys.A?.isDown ||
      this.keys.S?.isDown ||
      this.keys.D?.isDown ||
      this.keys.UP?.isDown ||
      this.keys.LEFT?.isDown ||
      this.keys.DOWN?.isDown ||
      this.keys.RIGHT?.isDown ||
      false
    );
  }
}
