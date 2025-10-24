import Phaser from 'phaser';
import type { Track } from '../types/track';

export default class GameScene extends Phaser.Scene {
  private track: Track | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;

  // Car properties
  private car: Phaser.GameObjects.Container | null = null;
  private carGraphics: Phaser.GameObjects.Graphics | null = null;
  private carBody = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    width: 40,
    height: 20
  };

  // Timer properties
  private timerText: Phaser.GameObjects.Text | null = null;
  private startTime: number = 0;
  private elapsedTime: number = 0;

  // Physics constants
  private readonly ACCELERATION = 300;
  private readonly MAX_SPEED = 400;
  private readonly FRICTION = 0.96;
  private readonly TURN_SPEED = 3.5;
  private readonly REVERSE_SPEED = 150;

  // Input keys
  private keys: {
    W?: Phaser.Input.Keyboard.Key;
    A?: Phaser.Input.Keyboard.Key;
    S?: Phaser.Input.Keyboard.Key;
    D?: Phaser.Input.Keyboard.Key;
  } = {};

  constructor() {
    super({ key: 'GameScene' });
  }

  setTrack(track: Track) {
    this.track = track;
  }

  create() {
    this.graphics = this.add.graphics();
    this.renderTrack();
    this.createCar();
    this.setupInput();
    this.createTimerDisplay();
  }

  private renderTrack() {
    if (!this.graphics || !this.track) return;

    this.graphics.clear();

    // Draw outer border in blue
    this.graphics.lineStyle(4, 0x4169e1, 1);
    if (this.track.outerBorder.length > 1) {
      this.drawPath(this.track.outerBorder);
    }

    // Draw inner border in red
    this.graphics.lineStyle(4, 0xdc143c, 1);
    if (this.track.innerBorder.length > 1) {
      this.drawPath(this.track.innerBorder);
    }
  }

  private drawPath(points: { x: number; y: number }[]) {
    if (!this.graphics || points.length < 2) return;

    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);

    // Draw lines between all dense points - they're already interpolated
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }

    // Close the path back to the first point
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  updateTrack(track: Track) {
    this.track = track;
    this.renderTrack();

    // Create car if it doesn't exist yet
    if (!this.car) {
      this.createCar();
    } else {
      this.resetCarPosition();
    }

    // Start timer
    this.startTimer();
  }

  private createCar() {
    if (!this.track) return;

    // Create car graphics
    this.carGraphics = this.add.graphics();
    this.car = this.add.container(0, 0);
    this.car.add(this.carGraphics);

    // Position car at start point
    this.resetCarPosition();

    // Draw the car
    this.drawCar();
  }

  private drawCar() {
    if (!this.carGraphics) return;

    this.carGraphics.clear();

    const hw = this.carBody.width / 2;
    const hh = this.carBody.height / 2;

    // Main car body (gray fill)
    this.carGraphics.fillStyle(0x808080, 1);
    this.carGraphics.fillRect(-hw, -hh, this.carBody.width, this.carBody.height);

    // Blue border at front (right side when rotation = 0)
    this.carGraphics.lineStyle(3, 0x0000ff, 1);
    this.carGraphics.beginPath();
    this.carGraphics.moveTo(hw, -hh);
    this.carGraphics.lineTo(hw, hh);
    this.carGraphics.strokePath();

    // Red border at back (left side when rotation = 0)
    this.carGraphics.lineStyle(3, 0xff0000, 1);
    this.carGraphics.beginPath();
    this.carGraphics.moveTo(-hw, -hh);
    this.carGraphics.lineTo(-hw, hh);
    this.carGraphics.strokePath();

    // Black border on top and bottom
    this.carGraphics.lineStyle(2, 0x000000, 1);
    this.carGraphics.strokeRect(-hw, -hh, this.carBody.width, this.carBody.height);
  }

  private resetCarPosition() {
    if (!this.track || !this.car) return;

    const startPoint = this.track.startPoint;
    this.carBody.x = startPoint.x;
    this.carBody.y = startPoint.y;
    this.carBody.velocityX = 0;
    this.carBody.velocityY = 0;
    this.carBody.rotation = 0;

    this.car.setPosition(this.carBody.x, this.carBody.y);
    this.car.setRotation(this.carBody.rotation);
  }

  private setupInput() {
    if (!this.input.keyboard) return;

    this.keys.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keys.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keys.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keys.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  private createTimerDisplay() {
    // Create timer text in top-right corner
    this.timerText = this.add.text(1200, 20, 'Time: 0:00.0', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.timerText.setOrigin(1, 0); // Right-aligned
  }

  private startTimer() {
    this.startTime = Date.now();
    this.elapsedTime = 0;
  }

  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const deciseconds = Math.floor((milliseconds % 1000) / 100);

    return `Time: ${minutes}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
  }

  update(time: number, delta: number) {
    if (!this.car) return;

    const deltaSeconds = delta / 1000;

    // Update timer
    if (this.startTime > 0) {
      this.elapsedTime = Date.now() - this.startTime;
      if (this.timerText) {
        this.timerText.setText(this.formatTime(this.elapsedTime));
      }
    }

    // Handle input and physics
    this.handleInput(deltaSeconds);
    this.applyPhysics(deltaSeconds);
    this.updateCarPosition();
  }

  private handleInput(deltaSeconds: number) {
    const speed = Math.sqrt(
      this.carBody.velocityX ** 2 + this.carBody.velocityY ** 2
    );

    // W - Accelerate forward
    if (this.keys.W?.isDown) {
      const accel = this.ACCELERATION * deltaSeconds;
      this.carBody.velocityX += Math.cos(this.carBody.rotation) * accel;
      this.carBody.velocityY += Math.sin(this.carBody.rotation) * accel;
    }

    // S - Reverse / Brake
    if (this.keys.S?.isDown) {
      if (speed > 10) {
        // Brake if moving forward
        this.carBody.velocityX *= 0.92;
        this.carBody.velocityY *= 0.92;
      } else {
        // Reverse if slow/stopped
        const accel = this.REVERSE_SPEED * deltaSeconds;
        this.carBody.velocityX -= Math.cos(this.carBody.rotation) * accel;
        this.carBody.velocityY -= Math.sin(this.carBody.rotation) * accel;
      }
    }

    // A - Turn left (only when moving)
    if (this.keys.A?.isDown && speed > 20) {
      const turnAmount = this.TURN_SPEED * deltaSeconds;
      this.carBody.rotation -= turnAmount;
    }

    // D - Turn right (only when moving)
    if (this.keys.D?.isDown && speed > 20) {
      const turnAmount = this.TURN_SPEED * deltaSeconds;
      this.carBody.rotation += turnAmount;
    }
  }

  private applyPhysics(deltaSeconds: number) {
    // Apply friction
    this.carBody.velocityX *= this.FRICTION;
    this.carBody.velocityY *= this.FRICTION;

    // Clamp to max speed
    const speed = Math.sqrt(
      this.carBody.velocityX ** 2 + this.carBody.velocityY ** 2
    );
    if (speed > this.MAX_SPEED) {
      const ratio = this.MAX_SPEED / speed;
      this.carBody.velocityX *= ratio;
      this.carBody.velocityY *= ratio;
    }

    // Update position based on velocity
    this.carBody.x += this.carBody.velocityX * deltaSeconds;
    this.carBody.y += this.carBody.velocityY * deltaSeconds;
  }

  private updateCarPosition() {
    if (!this.car) return;

    this.car.setPosition(this.carBody.x, this.carBody.y);
    this.car.setRotation(this.carBody.rotation);
  }
}
