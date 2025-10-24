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

    // Front wheel steering
    this.wheelAngle = 0; // Current steering angle in degrees

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

    // Handle wheel steering (A/D keys)
    let steeringInput = 0;
    if (this.keys.a.isDown) {
      steeringInput = -1; // Turn left
    } else if (this.keys.d.isDown) {
      steeringInput = 1; // Turn right
    }

    // Update wheel angle based on input
    if (steeringInput !== 0) {
      this.wheelAngle += steeringInput * GameConfig.car.wheelTurnSpeed * deltaSeconds;
      this.wheelAngle = Phaser.Math.Clamp(
        this.wheelAngle,
        -GameConfig.car.maxWheelAngle,
        GameConfig.car.maxWheelAngle
      );
    } else {
      // Return wheels to center when no steering input
      if (Math.abs(this.wheelAngle) > 0.1) {
        const returnAmount = GameConfig.car.wheelReturnSpeed * deltaSeconds;
        if (this.wheelAngle > 0) {
          this.wheelAngle = Math.max(0, this.wheelAngle - returnAmount);
        } else {
          this.wheelAngle = Math.min(0, this.wheelAngle + returnAmount);
        }
      } else {
        this.wheelAngle = 0;
      }
    }

    // Handle acceleration (W/S keys)
    const acceleration = GameConfig.car.acceleration;
    if (this.keys.w.isDown) {
      // Apply acceleration in the direction of car body + wheel angle
      const driveAngle = this.body.angle + this.wheelAngle;
      this.scene.physics.velocityFromRotation(
        Phaser.Math.DegToRad(driveAngle),
        acceleration,
        this.body.body.acceleration
      );
    } else if (this.keys.s.isDown) {
      // Reverse: apply in opposite direction with reduced speed
      const driveAngle = this.body.angle + this.wheelAngle;
      this.scene.physics.velocityFromRotation(
        Phaser.Math.DegToRad(driveAngle),
        -acceleration * GameConfig.car.reverseSpeedMultiplier,
        this.body.body.acceleration
      );
    } else {
      this.body.setAcceleration(0, 0);
    }

    // Rotate car body based on velocity and wheel angle (bicycle model)
    const speed = Math.sqrt(
      this.body.body.velocity.x ** 2 + this.body.body.velocity.y ** 2
    );

    if (speed > 10) { // Only rotate when moving
      // Calculate angular velocity based on wheel angle and speed
      // Using simplified bicycle model: angularVelocity ≈ (speed / wheelbase) * sin(wheelAngle)
      const wheelbase = GameConfig.car.width; // Use car width as approximate wheelbase
      const angularVelocity =
        (speed / wheelbase) * Math.sin(Phaser.Math.DegToRad(this.wheelAngle));

      this.body.angle += Phaser.Math.RadToDeg(angularVelocity) * deltaSeconds;
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
