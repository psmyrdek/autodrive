import Phaser from "phaser";
import {CarPhysics} from "./CarPhysics";

type KeyMap = {
  W?: Phaser.Input.Keyboard.Key;
  A?: Phaser.Input.Keyboard.Key;
  S?: Phaser.Input.Keyboard.Key;
  D?: Phaser.Input.Keyboard.Key;
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
  }

  handleInput(carPhysics: CarPhysics, deltaSeconds: number) {
    const speed = carPhysics.getSpeed();

    // W - Accelerate forward
    if (this.keys.W?.isDown) {
      carPhysics.accelerate(deltaSeconds);
    }

    // S - Reverse / Brake
    if (this.keys.S?.isDown) {
      if (speed > 10) {
        // Brake if moving forward
        carPhysics.brake();
      } else {
        // Reverse if slow/stopped
        carPhysics.reverse(deltaSeconds);
      }
    }

    // A - Turn left (only when moving)
    if (this.keys.A?.isDown && speed > 20) {
      carPhysics.turnLeft(deltaSeconds);
    }

    // D - Turn right (only when moving)
    if (this.keys.D?.isDown && speed > 20) {
      carPhysics.turnRight(deltaSeconds);
    }
  }

  isKeyDown(key: "W" | "A" | "S" | "D"): boolean {
    return this.keys[key]?.isDown ?? false;
  }

  hasAnyInput(): boolean {
    return (
      this.keys.W?.isDown ||
      this.keys.A?.isDown ||
      this.keys.S?.isDown ||
      this.keys.D?.isDown ||
      false
    );
  }
}
