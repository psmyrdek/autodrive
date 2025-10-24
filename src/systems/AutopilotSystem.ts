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
 * Currently uses simple rule-based logic, designed to be replaced with
 * neural network predictions in the future.
 */
export class AutopilotSystem {
  // Thresholds for decision-making
  private readonly STEERING_THRESHOLD = 50; // Minimum distance difference to trigger steering
  private readonly OBSTACLE_WARNING_DISTANCE = 300; // Distance to start slowing down
  private readonly OBSTACLE_DANGER_DISTANCE = 150; // Distance to brake hard
  private readonly MIN_SPEED_FOR_TURNING = 20; // Minimum speed to allow turning
  private readonly TARGET_SPEED = 200; // Target cruising speed

  /**
   * Main entry point: takes current car state and returns control commands.
   * This is where the neural network will plug in later.
   */
  getControlCommands(state: CarState): ControlCommands {
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
   * Placeholder for future neural network integration.
   * Will take the same CarState input and return ControlCommands.
   *
   * Example structure:
   * - Input features: [sensors.left, sensors.center, sensors.right, speed, rotation_rate, ...]
   * - Output: [forward_prob, backward_prob, left_prob, right_prob]
   * - Convert probabilities to boolean commands
   */
  // private mlLogic(state: CarState): ControlCommands {
  //   const inputFeatures = this.prepareInputFeatures(state);
  //   const predictions = neuralNetwork.predict(inputFeatures);
  //   return this.convertPredictionsToCommands(predictions);
  // }
}
