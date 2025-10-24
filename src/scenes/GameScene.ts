import Phaser from "phaser";
import type {Track} from "../types/track";
import {checkCarCollision} from "../utils/collisionDetection";
import {CarPhysics} from "../systems/CarPhysics";
import {InputManager} from "../systems/InputManager";
import {RadarSystem} from "../systems/RadarSystem";
import {TelemetryTracker} from "../systems/TelemetryTracker";
import {TimerDisplay} from "../systems/TimerDisplay";

export default class GameScene extends Phaser.Scene {
  private track: Track | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;

  // Game state
  private isRunning: boolean = true; // Track if game is active (not crashed)
  private hasStarted: boolean = false; // Track if user has made first action

  // Modular systems
  private carPhysics!: CarPhysics;
  private inputManager!: InputManager;
  private radarSystem!: RadarSystem;
  private telemetryTracker!: TelemetryTracker;
  private timerDisplay!: TimerDisplay;

  constructor() {
    super({key: "GameScene"});
  }

  setTrack(track: Track) {
    this.track = track;
  }

  create() {
    // Initialize modular systems
    this.carPhysics = new CarPhysics(this);
    this.inputManager = new InputManager(this);
    this.radarSystem = new RadarSystem(this);
    this.telemetryTracker = new TelemetryTracker();
    this.timerDisplay = new TimerDisplay(this);

    // Initialize graphics and track
    this.graphics = this.add.graphics();
    this.renderTrack();
    this.createCar();
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

  private drawPath(points: {x: number; y: number}[]) {
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

    // Create car if it doesn't exist, otherwise reset position
    if (!this.carPhysics.isCreated()) {
      this.createCar();
    } else {
      this.resetCarPosition();
    }

    // Reset game state (timer will start on first input)
    this.isRunning = true;
    this.hasStarted = false;
  }

  private createCar() {
    if (!this.track) return;

    const startPoint = this.track.startPoint;
    this.carPhysics.createCar(startPoint.x, startPoint.y);
  }

  private resetCarPosition() {
    if (!this.track) return;

    const startPoint = this.track.startPoint;
    this.carPhysics.resetPosition(startPoint.x, startPoint.y);
  }

  private startTimer() {
    this.timerDisplay.start();
  }

  update(_time: number, delta: number) {
    if (!this.track) return;

    const deltaSeconds = delta / 1000;

    // Only handle input and physics if game is running
    if (this.isRunning) {
      // Start timer and telemetry on first user input
      if (!this.hasStarted && this.inputManager.hasAnyInput()) {
        this.hasStarted = true;
        this.startTimer();
      }

      // Handle user input and apply physics
      this.inputManager.handleInput(this.carPhysics, deltaSeconds);
      this.carPhysics.applyPhysics(deltaSeconds);
      this.carPhysics.updatePosition();

      // Update radar system
      this.radarSystem.update(this.carPhysics.carBody, this.track);

      // Only update timer and sample telemetry after game has started
      if (this.hasStarted) {
        this.timerDisplay.update(this.isRunning);

        // Sample telemetry data
        this.telemetryTracker.sample(
          this.timerDisplay.getElapsedTime(),
          this.inputManager,
          this.radarSystem.distances
        );
      }

      // Check for collision with all 4 corners of the car
      const collision = checkCarCollision(
        this.carPhysics.carBody.x,
        this.carPhysics.carBody.y,
        this.carPhysics.carBody.width,
        this.carPhysics.carBody.height,
        this.carPhysics.carBody.rotation,
        this.track.outerBorder,
        this.track.innerBorder
      );

      if (collision) {
        this.handleCollision();
      }
    }
  }

  private handleCollision() {
    // Stop the game
    this.isRunning = false;

    // Stop car movement
    this.carPhysics.stop();

    // Emit collision event with telemetry data for React component to handle
    this.game.events.emit("collision", {
      elapsedTime: this.timerDisplay.getElapsedTime(),
      telemetryData: this.telemetryTracker.getTelemetryData(),
    });
  }

  /**
   * Public method to restart the game from React component
   */
  restart() {
    if (!this.track) return;

    this.isRunning = true;
    this.hasStarted = false;
    this.resetCarPosition();
    this.telemetryTracker.clear();
  }
}
