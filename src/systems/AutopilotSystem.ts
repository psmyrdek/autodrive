import type { CarBody } from "./CarPhysics";
import type { RadarDistances } from "./RadarSystem";

export interface ControlCommands {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface CarState {
  body: CarBody;
  sensors: RadarDistances;
  speed: number;
}

/**
 * Autopilot system that decides steering commands based on car state.
 * Supports both ML-based (neural network) and rule-based control modes.
 */
export class AutopilotSystem {
  // Thresholds for decision-making (used in rule-based mode)
  private readonly STEERING_THRESHOLD = 50; // Minimum distance difference to trigger steering
  private readonly OBSTACLE_WARNING_DISTANCE = 300; // Distance to start slowing down
  private readonly OBSTACLE_DANGER_DISTANCE = 150; // Distance to brake hard
  private readonly MIN_SPEED_FOR_TURNING = 20; // Minimum speed to allow turning
  private readonly TARGET_SPEED = 200; // Target cruising speed

  // ML mode configuration
  private readonly ML_API_URL = "http://localhost:8000/predict";
  private useMlMode: boolean;
  private mlAvailable: boolean = false;

  constructor(useMlMode: boolean = false) {
    this.useMlMode = useMlMode;

    // Check if ML API is available on startup
    if (useMlMode) {
      this.checkMlAvailability();
    }
  }

  /**
   * Check if ML inference API is available.
   */
  private async checkMlAvailability(): Promise<void> {
    try {
      const response = await fetch("http://localhost:8000/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        this.mlAvailable = true;
        console.log("ML autopilot API is available");
      }
    } catch (error) {
      console.warn("ML autopilot API is not available, falling back to rule-based logic");
      this.mlAvailable = false;
    }
  }

  /**
   * Toggle between ML and rule-based mode.
   */
  setMlMode(enabled: boolean): void {
    this.useMlMode = enabled;
    if (enabled && !this.mlAvailable) {
      this.checkMlAvailability();
    }
  }

  /**
   * Get current autopilot mode.
   */
  isMlMode(): boolean {
    return this.useMlMode && this.mlAvailable;
  }

  /**
   * Main entry point: takes current car state and returns control commands.
   * Uses neural network if ML mode is enabled and available, otherwise falls back to rule-based logic.
   */
  async getControlCommands(state: CarState): Promise<ControlCommands> {
    if (this.useMlMode && this.mlAvailable) {
      try {
        return await this.mlLogic(state);
      } catch (error) {
        console.error("ML inference failed, falling back to rule-based logic:", error);
        this.mlAvailable = false; // Disable ML mode if it fails
        return this.mockLogic(state);
      }
    }
    return this.mockLogic(state);
  }

  /**
   * Simple rule-based logic for autopilot.
   * Strategy:
   * - Steering: Turn away from closer walls (sensor-based centering)
   * - Speed: Accelerate to target speed, slow down when obstacles ahead
   * - Safety: Brake hard if very close to obstacle
   */
  private mockLogic(state: CarState): ControlCommands {
    const { sensors, speed } = state;
    const commands: ControlCommands = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    // === Speed Control ===
    const minDistance = Math.min(sensors.left, sensors.center, sensors.right);

    // Brake hard if danger ahead
    if (minDistance < this.OBSTACLE_DANGER_DISTANCE) {
      commands.backward = true; // Use backward as brake
    }
    // Accelerate if safe and below target speed
    else if (
      sensors.center > this.OBSTACLE_WARNING_DISTANCE &&
      speed < this.TARGET_SPEED
    ) {
      commands.forward = true;
    }
    // Coast (no acceleration) if at good speed
    else if (speed < this.TARGET_SPEED * 0.8) {
      commands.forward = true; // Keep some acceleration
    }

    // === Steering Control ===
    // Only steer if moving fast enough
    if (speed > this.MIN_SPEED_FOR_TURNING) {
      const leftRightDiff = sensors.left - sensors.right;

      // If left side is more open than right, turn left
      if (leftRightDiff > this.STEERING_THRESHOLD) {
        commands.left = true;
      }
      // If right side is more open than left, turn right
      else if (leftRightDiff < -this.STEERING_THRESHOLD) {
        commands.right = true;
      }

      // Emergency steering: if one side is very close, turn away aggressively
      if (sensors.left < this.OBSTACLE_DANGER_DISTANCE) {
        commands.left = false;
        commands.right = true;
      } else if (sensors.right < this.OBSTACLE_DANGER_DISTANCE) {
        commands.right = false;
        commands.left = true;
      }
    }

    return commands;
  }

  /**
   * Neural network-based logic for autopilot.
   * Sends car state to FastAPI inference server and receives control commands.
   */
  private async mlLogic(state: CarState): Promise<ControlCommands> {
    const { sensors, speed } = state;

    // Prepare request payload
    const payload = {
      l_sensor: sensors.left,
      c_sensor: sensors.center,
      r_sensor: sensors.right,
      speed: speed,
    };

    // Call FastAPI inference endpoint
    const response = await fetch(this.ML_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`ML API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Return control commands from neural network
    return {
      forward: result.forward,
      backward: result.backward,
      left: result.left,
      right: result.right,
    };
  }
}
