import type {CarBody} from "./CarPhysics";
import type {RadarDistances} from "./RadarSystem";

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

interface Observation {
  l: number;
  ml: number;
  c: number;
  mr: number;
  r: number;
  speed: number;
}

interface PreviousCommands {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  timestamp: number;
}

/**
 * Autopilot system that decides steering commands based on car state.
 * Uses ML-based (neural network) control exclusively.
 * Maintains a ring-buffer of observations for GRU temporal processing.
 */
export class AutopilotSystem {
  // ML API configuration
  private readonly ML_API_URL = "http://localhost:8000/predict";
  private readonly ML_RESET_URL = "http://localhost:8000/reset";
  private mlAvailable: boolean = false;

  // Ring-buffer for temporal sequences
  private readonly SEQUENCE_LENGTH = 10; // T = 10 timesteps (500ms history at 50ms intervals)
  private readonly SAMPLE_INTERVAL_MS = 50; // Must match TelemetryTracker sampling rate!
  private observationBuffer: Observation[] = [];

  // Time accumulator for fixed-rate sampling (matches training data collection)
  private timeAccumulator: number = 0;

  // Timeout budget for ML inference
  private readonly TIMEOUT_MS = 25; // Max time to wait for ML response

  // Cached commands (returned between 50ms inference cycles)
  private cachedCommands: ControlCommands = {
    forward: true,
    backward: false,
    left: false,
    right: false,
  };

  // Hysteresis to prevent flickering
  private previousCommands: PreviousCommands | null = null;
  private readonly HYSTERESIS_TIME_MS = 0; // Disabled: Let model corrections execute immediately (was 100ms)

  // Track last predicted actions for temporal consistency (used as input to next prediction)
  private lastPredictedActions: [number, number, number, number] = [0, 0, 0, 0]; // [w, a, s, d]

  constructor() {
    // Check if ML API is available on startup
    this.checkMlAvailability();
  }

  /**
   * Reset the observation buffer and previous commands.
   * Call this when starting a new driving session.
   */
  async resetBuffer(): Promise<void> {
    this.observationBuffer = [];
    this.timeAccumulator = 0;
    this.previousCommands = null;
    this.lastPredictedActions = [0, 0, 0, 0]; // Reset previous actions
    this.cachedCommands = {
      forward: true,
      backward: false,
      left: false,
      right: false,
    };

    if (!this.mlAvailable) {
      return;
    }

    try {
      const response = await fetch(this.ML_RESET_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
      });

      if (response.ok) {
        console.log("ML autopilot buffer reset");
      }
    } catch (error) {
      console.warn("Failed to reset ML autopilot buffer:", error);
    }
  }

  /**
   * Check if ML inference API is available.
   */
  private async checkMlAvailability(): Promise<void> {
    try {
      const response = await fetch("http://localhost:8000/health", {
        method: "GET",
        headers: {"Content-Type": "application/json"},
      });
      if (response.ok) {
        this.mlAvailable = true;
        console.log("ML autopilot API is available");
      } else {
        throw new Error(`ML API health check failed: ${response.status}`);
      }
    } catch (error) {
      console.error("ML autopilot API is not available:", error);
      this.mlAvailable = false;
    }
  }

  /**
   * Main entry point: takes current car state and returns control commands.
   * Uses time accumulator to sample at exactly 50ms intervals (matching training data).
   * Returns cached commands between inference cycles for consistent frame rate.
   *
   * CRITICAL: Must be called every frame with accurate deltaTime to maintain temporal consistency!
   *
   * @param deltaTime - Time elapsed since last frame (in milliseconds)
   * @param state - Current car state (position, sensors, speed)
   * @returns Control commands (may be cached from previous inference)
   */
  async getControlCommands(deltaTime: number, state: CarState): Promise<ControlCommands> {
    this.timeAccumulator += deltaTime;

    // Only sample and run inference at 50ms intervals (same as training data collection)
    if (this.timeAccumulator >= this.SAMPLE_INTERVAL_MS) {
      this.timeAccumulator -= this.SAMPLE_INTERVAL_MS;

      // Create observation with RAW sensor values (matching TelemetryTracker - no THRESHOLD!)
      const observation: Observation = {
        l: state.sensors.left,
        ml: state.sensors.midLeft,
        c: state.sensors.center,
        mr: state.sensors.midRight,
        r: state.sensors.right,
        speed: state.speed,
      };

      this.observationBuffer.push(observation);

      // Maintain buffer size (ring-buffer behavior)
      if (this.observationBuffer.length > this.SEQUENCE_LENGTH) {
        this.observationBuffer.shift();
      }

      // Run ML inference only when buffer is full
      if (
        this.mlAvailable &&
        this.observationBuffer.length >= this.SEQUENCE_LENGTH
      ) {
        try {
          const commands = await this.mlLogicWithTimeout();

          // Apply hysteresis to prevent flickering
          this.cachedCommands = this.applyHysteresis(commands);
        } catch (error) {
          console.error("[Autopilot] ML inference failed:", error);
          // Keep using last cached commands on error
        }
      }
    }

    // Return cached commands (updated at 50ms intervals, returned at frame rate)
    return this.cachedCommands;
  }

  /**
   * ML inference with timeout budget.
   * Sends sequence to FastAPI inference server.
   */
  private async mlLogicWithTimeout(): Promise<ControlCommands> {
    // Create sequence payload: array of [l, ml, c, mr, r, speed]
    const sequence = this.observationBuffer.map((obs) => [
      obs.l,
      obs.ml,
      obs.c,
      obs.mr,
      obs.r,
      obs.speed,
    ]);

    const payload = {
      dt_ms: this.SAMPLE_INTERVAL_MS,
      x: sequence,
      prev_actions: this.lastPredictedActions, // Send previous predictions for temporal consistency
    };

    // Race between fetch and timeout
    const fetchPromise = fetch(this.ML_API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("ML inference timeout")),
        this.TIMEOUT_MS
      );
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      throw new Error(
        `ML API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    const commands = {
      forward: result.forward,
      backward: result.backward,
      left: result.left,
      right: result.right,
    };

    // Update last predicted actions for next inference call
    // Convert boolean commands to 0/1 for model input format
    this.lastPredictedActions = [
      commands.forward ? 1 : 0,
      commands.left ? 1 : 0,
      commands.backward ? 1 : 0,
      commands.right ? 1 : 0,
    ];

    return commands;
  }

  /**
   * Apply hysteresis to prevent command flickering.
   * CURRENTLY DISABLED (HYSTERESIS_TIME_MS = 0) to match training behavior.
   * Model was trained with 50ms intervals and immediate action execution.
   */
  private applyHysteresis(commands: ControlCommands): ControlCommands {
    const now = Date.now();

    if (this.previousCommands === null) {
      // First command, no hysteresis
      this.previousCommands = {...commands, timestamp: now};
      return commands;
    }

    // Check if commands changed
    const changed =
      commands.forward !== this.previousCommands.forward ||
      commands.backward !== this.previousCommands.backward ||
      commands.left !== this.previousCommands.left ||
      commands.right !== this.previousCommands.right;

    if (!changed) {
      // No change, update timestamp
      this.previousCommands.timestamp = now;
      return commands;
    }

    // Commands changed - check if enough time passed
    const timeSinceLastChange = now - this.previousCommands.timestamp;

    if (timeSinceLastChange < this.HYSTERESIS_TIME_MS) {
      // Too soon, keep previous commands (with HYSTERESIS_TIME_MS=0, this never happens)
      return {
        forward: this.previousCommands.forward,
        backward: this.previousCommands.backward,
        left: this.previousCommands.left,
        right: this.previousCommands.right,
      };
    }

    // Enough time passed (or hysteresis disabled), accept new commands
    this.previousCommands = {...commands, timestamp: now};
    return commands;
  }
}
