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
}

export class TelemetryTracker {
  private readonly TELEMETRY_SAMPLE_INTERVAL = 500; // Sample every 500ms (0.5s)

  private telemetryData: TelemetryData[] = [];
  private lastTelemetrySample: number = 0;

  sample(
    elapsedTime: number,
    inputManager: InputManager,
    radarDistances: RadarDistances
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
      });

      this.lastTelemetrySample = currentTime;
    }
  }

  getTelemetryData(): TelemetryData[] {
    return this.telemetryData;
  }

  clear() {
    this.telemetryData = [];
    this.lastTelemetrySample = 0;
  }
}
