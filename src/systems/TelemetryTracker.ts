import type {RadarDistances} from "./RadarSystem";
import type {InputManager} from "./InputManager";

export interface TelemetryData {
  t_step: number; // Step counter (0, 1, 2, ...) at 20 Hz (50ms intervals)
  // Continuous state (key held down)
  w_pressed: boolean;
  a_pressed: boolean;
  s_pressed: boolean;
  d_pressed: boolean;
  // Impulses (1 only when key transitions from 0→1, otherwise 0)
  w_impulse: boolean;
  a_impulse: boolean;
  s_impulse: boolean;
  d_impulse: boolean;
  // Sensors and speed (floats, no rounding)
  l_sensor_range: number;
  ml_sensor_range: number;
  c_sensor_range: number;
  mr_sensor_range: number;
  r_sensor_range: number;
  speed: number;
}

export class TelemetryTracker {
  private readonly SAMPLE_INTERVAL_MS = 50;

  private telemetryData: TelemetryData[] = [];
  private timeAccumulator: number = 0; // Accumulates frame time deltas
  private stepCounter: number = 0; // Counts samples at fixed 50ms intervals

  // Previous key states for edge detection (0→1 transitions)
  private prevKeyStates = {
    w: false,
    a: false,
    s: false,
    d: false,
  };

  /**
   * Sample telemetry at fixed 20 Hz (50ms) intervals using accumulator pattern.
   * Handles irregular frame times by accumulating delta and emitting samples at exact intervals.
   * @param deltaTime - Time elapsed since last frame (in milliseconds)
   */
  sample(
    deltaTime: number,
    inputManager: InputManager,
    radarDistances: RadarDistances,
    speed: number
  ) {
    this.timeAccumulator += deltaTime;

    // Emit samples at fixed 50ms intervals, regardless of irregular frame timing
    while (this.timeAccumulator >= this.SAMPLE_INTERVAL_MS) {
      this.timeAccumulator -= this.SAMPLE_INTERVAL_MS;

      // Current key states
      const wPressed = inputManager.isKeyDown("W");
      const aPressed = inputManager.isKeyDown("A");
      const sPressed = inputManager.isKeyDown("S");
      const dPressed = inputManager.isKeyDown("D");

      // Detect edges (0→1 transitions) for impulses
      const wImpulse = wPressed && !this.prevKeyStates.w;
      const aImpulse = aPressed && !this.prevKeyStates.a;
      const sImpulse = sPressed && !this.prevKeyStates.s;
      const dImpulse = dPressed && !this.prevKeyStates.d;

      this.telemetryData.push({
        t_step: this.stepCounter,
        w_pressed: wPressed,
        a_pressed: aPressed,
        s_pressed: sPressed,
        d_pressed: dPressed,
        w_impulse: wImpulse,
        a_impulse: aImpulse,
        s_impulse: sImpulse,
        d_impulse: dImpulse,
        l_sensor_range: radarDistances.left,
        ml_sensor_range: radarDistances.midLeft,
        c_sensor_range: radarDistances.center,
        mr_sensor_range: radarDistances.midRight,
        r_sensor_range: radarDistances.right,
        speed: speed,
      });

      // Update previous states for next edge detection
      this.prevKeyStates.w = wPressed;
      this.prevKeyStates.a = aPressed;
      this.prevKeyStates.s = sPressed;
      this.prevKeyStates.d = dPressed;

      this.stepCounter++;
    }
  }

  getTelemetryData(): TelemetryData[] {
    return this.telemetryData;
  }

  clear() {
    this.telemetryData = [];
    this.timeAccumulator = 0;
    this.stepCounter = 0;
    this.prevKeyStates = {
      w: false,
      a: false,
      s: false,
      d: false,
    };
  }
}
