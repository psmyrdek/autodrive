import Phaser from "phaser";
import type {Track} from "../types/track";
import {checkCarCollision} from "../utils/collisionDetection";
import {CarPhysics} from "../systems/CarPhysics";
import {InputManager} from "../systems/InputManager";
import {RadarSystem} from "../systems/RadarSystem";
import {TelemetryTracker} from "../systems/TelemetryTracker";
import {TimerDisplay} from "../systems/TimerDisplay";
import {AutopilotSystem, type CarState} from "../systems/AutopilotSystem";

export default class GameScene extends Phaser.Scene {
  private track: Track | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;

  // Game state
  private isRunning: boolean = true; // Track if game is active (not crashed)
  private hasStarted: boolean = false; // Track if user has made first action
  private isAutopilotEnabled: boolean = false; // Track if autopilot mode is active

  // Modular systems
  private carPhysics!: CarPhysics;
  private inputManager!: InputManager;
  private radarSystem!: RadarSystem;
  private telemetryTracker!: TelemetryTracker;
  private timerDisplay!: TimerDisplay;
  private autopilotSystem!: AutopilotSystem;

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
    this.autopilotSystem = new AutopilotSystem(true); // Enable ML mode by default

    // Initialize graphics and track
    this.graphics = this.add.graphics();
    this.renderTrack();
    this.createCar();

    // Set up keyboard shortcut for manual telemetry save (T key)
    const tKey = this.input.keyboard?.addKey("T");
    tKey?.on("down", () => {
      if (this.hasStarted && this.isRunning) {
        // Emit event with current telemetry data
        this.game.events.emit("saveTelemetry", {
          elapsedTime: this.timerDisplay.getElapsedTime(),
          telemetryData: this.telemetryTracker.getTelemetryData(),
        });
      }
    });

    // Set up keyboard shortcut for autopilot toggle (P key)
    const pKey = this.input.keyboard?.addKey("P");
    pKey?.on("down", () => {
      this.toggleAutopilot();
    });

    // Set up key press listeners for WSAD to capture immediate telemetry entries
    const wKey = this.input.keyboard?.addKey("W");
    const aKey = this.input.keyboard?.addKey("A");
    const sKey = this.input.keyboard?.addKey("S");
    const dKey = this.input.keyboard?.addKey("D");

    const recordKeyPressEvent = () => {
      if (this.hasStarted && this.isRunning) {
        this.telemetryTracker.recordKeyPress(
          this.timerDisplay.getElapsedTime(),
          this.inputManager,
          this.radarSystem.distances,
          this.carPhysics.getSpeed()
        );
      }
    };

    wKey?.on("down", recordKeyPressEvent);
    aKey?.on("down", recordKeyPressEvent);
    sKey?.on("down", recordKeyPressEvent);
    dKey?.on("down", recordKeyPressEvent);
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
      // Start timer and telemetry on first user input or autopilot activation
      if (!this.hasStarted && (this.inputManager.hasAnyInput() || this.isAutopilotEnabled)) {
        this.hasStarted = true;
        this.startTimer();
      }

      // Handle input - either from autopilot or manual control
      if (this.isAutopilotEnabled) {
        this.handleAutopilotInput(deltaSeconds);
      } else {
        this.inputManager.handleInput(this.carPhysics, deltaSeconds);
      }

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
          this.radarSystem.distances,
          this.carPhysics.getSpeed()
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

  /**
   * Toggle autopilot mode on/off
   */
  toggleAutopilot() {
    this.isAutopilotEnabled = !this.isAutopilotEnabled;

    // Emit event to React component to update UI
    this.game.events.emit("autopilotToggled", this.isAutopilotEnabled);
  }

  /**
   * Get current autopilot state
   */
  getAutopilotState(): boolean {
    return this.isAutopilotEnabled;
  }

  /**
   * Handle autopilot input by getting commands from AutopilotSystem
   * and applying them to CarPhysics
   */
  private handleAutopilotInput(deltaSeconds: number) {
    // Prepare current car state for autopilot
    const carState: CarState = {
      body: this.carPhysics.carBody,
      sensors: this.radarSystem.distances,
      speed: this.carPhysics.getSpeed(),
    };

    // Get control commands from autopilot (async, non-blocking)
    // We use .then() to avoid blocking the game loop
    this.autopilotSystem.getControlCommands(carState).then((commands) => {
      // Apply commands to car physics (same as manual input would)
      const speed = this.carPhysics.getSpeed();

      if (commands.forward) {
        this.carPhysics.accelerate(deltaSeconds);
      }

      if (commands.backward) {
        if (speed > 10) {
          this.carPhysics.brake();
        } else {
          this.carPhysics.reverse(deltaSeconds);
        }
      }

      if (commands.left && speed > 20) {
        this.carPhysics.turnLeft(deltaSeconds);
      }

      if (commands.right && speed > 20) {
        this.carPhysics.turnRight(deltaSeconds);
      }
    }).catch((error) => {
      console.error("Autopilot error:", error);
    });
  }
}
