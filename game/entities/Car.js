import {GameConfig} from "../config.js";

export class Car {
  constructor(scene, x, y, angle = 0) {
    this.scene = scene;

    // Create car sprite as a graphics object
    this.graphics = scene.add.graphics();
    this.drawCar();

    // Create physics body
    this.body = scene.physics.add.sprite(x, y, null);
    this.body.setDisplaySize(GameConfig.car.width, GameConfig.car.height);
    this.body.setSize(GameConfig.car.width, GameConfig.car.height);
    this.body.setAngle(angle);
    this.body.setDrag(GameConfig.car.drag);
    this.body.setMaxVelocity(GameConfig.car.maxSpeed);

    // Input keys
    this.keys = {
      w: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  drawCar() {
    const width = GameConfig.car.width;
    const height = GameConfig.car.height;

    // Clear previous graphics
    this.graphics.clear();

    // Draw black rectangle with white outline
    this.graphics.fillStyle(0x000000, 1);
    this.graphics.lineStyle(2, 0xffffff, 1);
    this.graphics.fillRect(-width / 2, -height / 2, width, height);
    this.graphics.strokeRect(-width / 2, -height / 2, width, height);

    // Draw blue border at the front (positive x, right edge)
    this.graphics.lineStyle(3, 0x0000ff, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(width / 2, -height / 2);
    this.graphics.lineTo(width / 2, height / 2);
    this.graphics.strokePath();

    // Draw red border at the back (negative x, left edge)
    this.graphics.lineStyle(3, 0xff0000, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-width / 2, -height / 2);
    this.graphics.lineTo(-width / 2, height / 2);
    this.graphics.strokePath();
  }

  update(delta) {
    const deltaSeconds = delta / 1000;

    // Handle rotation
    if (this.keys.a.isDown) {
      this.body.angle -= GameConfig.car.rotationSpeed * deltaSeconds;
    }
    if (this.keys.d.isDown) {
      this.body.angle += GameConfig.car.rotationSpeed * deltaSeconds;
    }

    // Handle acceleration
    const acceleration = GameConfig.car.acceleration;
    if (this.keys.w.isDown) {
      this.scene.physics.velocityFromRotation(
        Phaser.Math.DegToRad(this.body.angle),
        acceleration,
        this.body.body.acceleration
      );
    } else if (this.keys.s.isDown) {
      this.scene.physics.velocityFromRotation(
        Phaser.Math.DegToRad(this.body.angle),
        -acceleration * GameConfig.car.reverseSpeedMultiplier,
        this.body.body.acceleration
      );
    } else {
      this.body.setAcceleration(0, 0);
    }

    // Update graphics position and rotation to match physics body
    this.graphics.x = this.body.x;
    this.graphics.y = this.body.y;
    this.graphics.rotation = Phaser.Math.DegToRad(this.body.angle);
  }

  getCorners() {
    // Calculate the 4 corner positions of the car in world coordinates
    const width = GameConfig.car.width;
    const height = GameConfig.car.height;
    const angle = Phaser.Math.DegToRad(this.body.angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Local corner positions (relative to car center, front facing +X)
    const localCorners = [
      {x: halfWidth, y: halfHeight}, // Front-right
      {x: halfWidth, y: -halfHeight}, // Front-left
      {x: -halfWidth, y: -halfHeight}, // Back-left
      {x: -halfWidth, y: halfHeight}, // Back-right
    ];

    // Transform to world coordinates
    return localCorners.map((corner, index) => {
      const rotatedX = corner.x * cos - corner.y * sin;
      const rotatedY = corner.x * sin + corner.y * cos;

      return {
        index: index,
        x: this.body.x + rotatedX,
        y: this.body.y + rotatedY,
      };
    });
  }

  getPosition() {
    return {x: this.body.x, y: this.body.y};
  }

  getAngle() {
    return this.body.angle;
  }

  getPhysicsBody() {
    return this.body;
  }
}
