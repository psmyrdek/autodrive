import Phaser from "phaser";

export interface CarBody {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  width: number;
  height: number;
}

export class CarPhysics {
  // Realistic car physics with grip-based handling
  private readonly ACCELERATION = 100; // Forward acceleration force - more gradual
  private readonly MAX_SPEED = 250; // Moderate top speed for better control
  private readonly FORWARD_FRICTION = 0.996; // Rolling resistance when coasting - car maintains momentum
  private readonly LATERAL_GRIP = 0.85; // Tire grip - reduces sideways sliding (lower = more grip)
  private readonly TURN_SPEED = 4.0; // Base turning rate (reduced at high speeds)
  private readonly REVERSE_SPEED = 120; // Reverse acceleration (proportional to forward)
  private readonly BRAKE_FORCE = 0.99; // Gradual braking - requires holding to slow down

  public carBody: CarBody = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    width: 40,
    height: 20,
  };

  private container: Phaser.GameObjects.Container | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createCar(startX: number, startY: number): Phaser.GameObjects.Container {
    this.graphics = this.scene.add.graphics();
    this.container = this.scene.add.container(0, 0);
    this.container.add(this.graphics);

    this.resetPosition(startX, startY);
    this.drawCar();

    return this.container;
  }

  resetPosition(x: number, y: number) {
    this.carBody.x = x;
    this.carBody.y = y;
    this.carBody.velocityX = 0;
    this.carBody.velocityY = 0;
    this.carBody.rotation = 0;

    if (this.container) {
      this.container.setPosition(this.carBody.x, this.carBody.y);
      this.container.setRotation(this.carBody.rotation);
    }
  }

  private drawCar() {
    if (!this.graphics) return;

    this.graphics.clear();

    const hw = this.carBody.width / 2;
    const hh = this.carBody.height / 2;

    // Main car body (gray fill)
    this.graphics.fillStyle(0x808080, 1);
    this.graphics.fillRect(-hw, -hh, this.carBody.width, this.carBody.height);

    // Blue border at front (right side when rotation = 0)
    this.graphics.lineStyle(3, 0x0000ff, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(hw, -hh);
    this.graphics.lineTo(hw, hh);
    this.graphics.strokePath();

    // Red border at back (left side when rotation = 0)
    this.graphics.lineStyle(3, 0xff0000, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-hw, -hh);
    this.graphics.lineTo(-hw, hh);
    this.graphics.strokePath();

    // Black border on top and bottom
    this.graphics.lineStyle(2, 0x000000, 1);
    this.graphics.strokeRect(-hw, -hh, this.carBody.width, this.carBody.height);
  }

  accelerate(deltaSeconds: number) {
    const accel = this.ACCELERATION * deltaSeconds;
    this.carBody.velocityX += Math.cos(this.carBody.rotation) * accel;
    this.carBody.velocityY += Math.sin(this.carBody.rotation) * accel;
  }

  reverse(deltaSeconds: number) {
    const accel = this.REVERSE_SPEED * deltaSeconds;
    this.carBody.velocityX -= Math.cos(this.carBody.rotation) * accel;
    this.carBody.velocityY -= Math.sin(this.carBody.rotation) * accel;
  }

  brake() {
    this.carBody.velocityX *= this.BRAKE_FORCE;
    this.carBody.velocityY *= this.BRAKE_FORCE;
  }

  turnLeft(deltaSeconds: number) {
    const speed = this.getSpeed();
    // Turn rate decreases with speed - can't turn sharply at high speeds
    const speedFactor = Math.max(0.3, 1.0 - (speed / this.MAX_SPEED) * 0.7);
    const turnAmount = this.TURN_SPEED * deltaSeconds * speedFactor;
    this.carBody.rotation -= turnAmount;
  }

  turnRight(deltaSeconds: number) {
    const speed = this.getSpeed();
    // Turn rate decreases with speed - can't turn sharply at high speeds
    const speedFactor = Math.max(0.3, 1.0 - (speed / this.MAX_SPEED) * 0.7);
    const turnAmount = this.TURN_SPEED * deltaSeconds * speedFactor;
    this.carBody.rotation += turnAmount;
  }

  applyPhysics(deltaSeconds: number) {
    // This is the key to realistic car physics: lateral grip
    // We decompose velocity into forward (along car direction) and lateral (perpendicular) components

    // Get car's forward direction vector
    const forwardX = Math.cos(this.carBody.rotation);
    const forwardY = Math.sin(this.carBody.rotation);

    // Get car's lateral (sideways) direction vector
    const lateralX = -forwardY; // Perpendicular to forward
    const lateralY = forwardX;

    // Decompose current velocity into forward and lateral components
    // Using dot product to project velocity onto each axis
    const forwardVelocity =
      this.carBody.velocityX * forwardX + this.carBody.velocityY * forwardY;
    const lateralVelocity =
      this.carBody.velocityX * lateralX + this.carBody.velocityY * lateralY;

    // Apply tire grip - strongly reduce lateral (sideways) velocity
    // This is what makes the car stick to the road and follow where it's pointed
    const newLateralVelocity = lateralVelocity * this.LATERAL_GRIP;

    // Apply rolling resistance to forward velocity
    const newForwardVelocity = forwardVelocity * this.FORWARD_FRICTION;

    // Reconstruct velocity vector from forward and lateral components
    this.carBody.velocityX =
      newForwardVelocity * forwardX + newLateralVelocity * lateralX;
    this.carBody.velocityY =
      newForwardVelocity * forwardY + newLateralVelocity * lateralY;

    // Clamp to max speed
    const speed = this.getSpeed();
    if (speed > this.MAX_SPEED) {
      const ratio = this.MAX_SPEED / speed;
      this.carBody.velocityX *= ratio;
      this.carBody.velocityY *= ratio;
    }

    // Update position based on velocity
    this.carBody.x += this.carBody.velocityX * deltaSeconds;
    this.carBody.y += this.carBody.velocityY * deltaSeconds;
  }

  updatePosition() {
    if (!this.container) return;

    this.container.setPosition(this.carBody.x, this.carBody.y);
    this.container.setRotation(this.carBody.rotation);
  }

  stop() {
    this.carBody.velocityX = 0;
    this.carBody.velocityY = 0;
  }

  getSpeed(): number {
    return Math.sqrt(this.carBody.velocityX ** 2 + this.carBody.velocityY ** 2);
  }

  isCreated(): boolean {
    return this.container !== null;
  }
}
