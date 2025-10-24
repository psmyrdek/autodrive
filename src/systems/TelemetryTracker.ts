import type {RadarDistances} from "./RadarSystem";
import type {InputManager} from "./InputManager";

export interface TelemetryData {
  timestamp: number;
  w_pressed: boolean;
  a_pressed: boolean;
  s_pressed: boolean;
  d_pressed: boolean;
  l_sensor_range: number;
  c_sensor_range: number;
  r_sensor_range: number;
  speed: number;
}

export class TelemetryTracker {
  private readonly TELEMETRY_SAMPLE_INTERVAL = 100;

  private telemetryData: TelemetryData[] = [];
  private lastTelemetrySample: number = 0;

  sample(
    elapsedTime: number,
    inputManager: InputManager,
    radarDistances: RadarDistances,
    speed: number
  ) {
    const currentTime = Date.now();

    // Check if enough time has passed since last sample
    if (
      currentTime - this.lastTelemetrySample >=
      this.TELEMETRY_SAMPLE_INTERVAL
    ) {
      this.telemetryData.push({
        timestamp: elapsedTime,
        w_pressed: inputManager.isKeyDown("W"),
        a_pressed: inputManager.isKeyDown("A"),
        s_pressed: inputManager.isKeyDown("S"),
        d_pressed: inputManager.isKeyDown("D"),
        l_sensor_range: Math.round(radarDistances.left),
        c_sensor_range: Math.round(radarDistances.center),
        r_sensor_range: Math.round(radarDistances.right),
        speed: Math.round(speed),
      });

      this.lastTelemetrySample = currentTime;
    }
  }

  /**
   * Record immediate telemetry entry when a key is pressed
   * This ensures we capture quick key presses that might be missed by periodic sampling
   */
  recordKeyPress(
    elapsedTime: number,
    inputManager: InputManager,
    radarDistances: RadarDistances,
    speed: number
  ) {
    this.telemetryData.push({
      timestamp: elapsedTime,
      w_pressed: inputManager.isKeyDown("W"),
      a_pressed: inputManager.isKeyDown("A"),
      s_pressed: inputManager.isKeyDown("S"),
      d_pressed: inputManager.isKeyDown("D"),
      l_sensor_range: Math.round(radarDistances.left),
      c_sensor_range: Math.round(radarDistances.center),
      r_sensor_range: Math.round(radarDistances.right),
      speed: Math.round(speed),
    });
  }

  getTelemetryData(): TelemetryData[] {
    return this.telemetryData;
  }

  clear() {
    this.telemetryData = [];
    this.lastTelemetrySample = 0;
  }
}
