import Phaser from 'phaser';
import type { Track } from '../types/track';
import { checkCarCollision } from '../utils/collisionDetection';

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
  private isRunning: boolean = true; // Track if game is active (not crashed)

  // Radar properties
  private radarGraphics: Phaser.GameObjects.Graphics | null = null;
  private radarTexts: {
    left: Phaser.GameObjects.Text | null;
    center: Phaser.GameObjects.Text | null;
    right: Phaser.GameObjects.Text | null;
  } = { left: null, center: null, right: null };
  private radarDistances = { left: 0, center: 0, right: 0 };
  private readonly RADAR_MAX_DISTANCE = 1500; // Maximum radar range

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
    this.createRadarDisplay();
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

    // Start timer and reset game state
    this.isRunning = true;
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

  private createRadarDisplay() {
    // Create radar graphics for drawing beams
    this.radarGraphics = this.add.graphics();

    // Create radar distance text displays at the bottom-left corner
    const textStyle = {
      fontSize: '20px',
      color: '#00ff00',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    };

    this.radarTexts.left = this.add.text(20, 590, 'L: 0', textStyle);
    this.radarTexts.center = this.add.text(20, 620, 'C: 0', textStyle);
    this.radarTexts.right = this.add.text(20, 650, 'R: 0', textStyle);
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

  /**
   * Check if two line segments intersect and return the intersection point
   */
  private lineIntersection(
    x1: number, y1: number, x2: number, y2: number,  // Line 1
    x3: number, y3: number, x4: number, y4: number   // Line 2
  ): { x: number; y: number } | null {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denominator) < 0.0001) {
      return null; // Lines are parallel
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  }

  /**
   * Cast a ray from a point in a direction and find the nearest intersection with track borders
   */
  private castRay(
    originX: number,
    originY: number,
    dirX: number,
    dirY: number
  ): { x: number; y: number; distance: number } | null {
    if (!this.track) return null;

    // Calculate ray end point (far away)
    const rayEndX = originX + dirX * this.RADAR_MAX_DISTANCE;
    const rayEndY = originY + dirY * this.RADAR_MAX_DISTANCE;

    let closestIntersection: { x: number; y: number } | null = null;
    let closestDistance = Infinity;

    // Check against outer border segments
    for (let i = 0; i < this.track.outerBorder.length; i++) {
      const p1 = this.track.outerBorder[i];
      const p2 = this.track.outerBorder[(i + 1) % this.track.outerBorder.length];

      const intersection = this.lineIntersection(
        originX, originY, rayEndX, rayEndY,
        p1.x, p1.y, p2.x, p2.y
      );

      if (intersection) {
        const distance = Math.sqrt(
          (intersection.x - originX) ** 2 + (intersection.y - originY) ** 2
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIntersection = intersection;
        }
      }
    }

    // Check against inner border segments
    for (let i = 0; i < this.track.innerBorder.length; i++) {
      const p1 = this.track.innerBorder[i];
      const p2 = this.track.innerBorder[(i + 1) % this.track.innerBorder.length];

      const intersection = this.lineIntersection(
        originX, originY, rayEndX, rayEndY,
        p1.x, p1.y, p2.x, p2.y
      );

      if (intersection) {
        const distance = Math.sqrt(
          (intersection.x - originX) ** 2 + (intersection.y - originY) ** 2
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIntersection = intersection;
        }
      }
    }

    if (closestIntersection) {
      return {
        x: closestIntersection.x,
        y: closestIntersection.y,
        distance: closestDistance
      };
    }

    return null;
  }

  private updateRadar() {
    if (!this.radarGraphics || !this.track) return;

    // Clear previous radar beams
    this.radarGraphics.clear();

    const hw = this.carBody.width / 2;
    const hh = this.carBody.height / 2;
    const rotation = this.carBody.rotation;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Calculate the three sensor positions (front of car)
    // Left front corner
    const leftSensorX = this.carBody.x + (hw * cos - hh * sin);
    const leftSensorY = this.carBody.y + (hw * sin + hh * cos);

    // Center front
    const centerSensorX = this.carBody.x + hw * cos;
    const centerSensorY = this.carBody.y + hw * sin;

    // Right front corner
    const rightSensorX = this.carBody.x + (hw * cos + hh * sin);
    const rightSensorY = this.carBody.y + (hw * sin - hh * cos);

    // Ray directions with 20-degree angles for corners
    const angleOffset = (20 * Math.PI) / 180; // Convert 20 degrees to radians

    // Left beam: +20 degrees from forward (clockwise in screen coordinates)
    const leftAngle = rotation + angleOffset;
    const leftDirX = Math.cos(leftAngle);
    const leftDirY = Math.sin(leftAngle);

    // Center beam: straight forward
    const centerDirX = cos;
    const centerDirY = sin;

    // Right beam: -20 degrees from forward (counterclockwise in screen coordinates)
    const rightAngle = rotation - angleOffset;
    const rightDirX = Math.cos(rightAngle);
    const rightDirY = Math.sin(rightAngle);

    // Cast rays from each sensor
    const leftHit = this.castRay(leftSensorX, leftSensorY, leftDirX, leftDirY);
    const centerHit = this.castRay(centerSensorX, centerSensorY, centerDirX, centerDirY);
    const rightHit = this.castRay(rightSensorX, rightSensorY, rightDirX, rightDirY);

    // Update distances
    this.radarDistances.left = leftHit ? leftHit.distance : this.RADAR_MAX_DISTANCE;
    this.radarDistances.center = centerHit ? centerHit.distance : this.RADAR_MAX_DISTANCE;
    this.radarDistances.right = rightHit ? rightHit.distance : this.RADAR_MAX_DISTANCE;

    // Draw radar beams
    this.radarGraphics.lineStyle(2, 0x00ff00, 0.6);

    if (leftHit) {
      this.radarGraphics.lineBetween(leftSensorX, leftSensorY, leftHit.x, leftHit.y);
    }
    if (centerHit) {
      this.radarGraphics.lineBetween(centerSensorX, centerSensorY, centerHit.x, centerHit.y);
    }
    if (rightHit) {
      this.radarGraphics.lineBetween(rightSensorX, rightSensorY, rightHit.x, rightHit.y);
    }

    // Update distance text displays
    if (this.radarTexts.left) {
      this.radarTexts.left.setText(`L: ${Math.round(this.radarDistances.left)}`);
    }
    if (this.radarTexts.center) {
      this.radarTexts.center.setText(`C: ${Math.round(this.radarDistances.center)}`);
    }
    if (this.radarTexts.right) {
      this.radarTexts.right.setText(`R: ${Math.round(this.radarDistances.right)}`);
    }
  }

  update(_time: number, delta: number) {
    if (!this.car || !this.track) return;

    const deltaSeconds = delta / 1000;

    // Only update timer if game is running
    if (this.isRunning && this.startTime > 0) {
      this.elapsedTime = Date.now() - this.startTime;
      if (this.timerText) {
        this.timerText.setText(this.formatTime(this.elapsedTime));
      }
    }

    // Only handle input and physics if game is running
    if (this.isRunning) {
      this.handleInput(deltaSeconds);
      this.applyPhysics(deltaSeconds);
      this.updateCarPosition();

      // Update radar system
      this.updateRadar();

      // Check for collision with all 4 corners of the car
      const collision = checkCarCollision(
        this.carBody.x,
        this.carBody.y,
        this.carBody.width,
        this.carBody.height,
        this.carBody.rotation,
        this.track.outerBorder,
        this.track.innerBorder
      );

      if (collision) {
        this.handleCollision();
      }
    }
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

  private handleCollision() {
    // Stop the game
    this.isRunning = false;

    // Stop car movement
    this.carBody.velocityX = 0;
    this.carBody.velocityY = 0;

    // Emit collision event for React component to handle
    this.game.events.emit('collision', this.elapsedTime);
  }

  /**
   * Public method to restart the game from React component
   */
  restart() {
    if (!this.track) return;

    this.isRunning = true;
    this.resetCarPosition();
    this.startTimer();
  }
}
