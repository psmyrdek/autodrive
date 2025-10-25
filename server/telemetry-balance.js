import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TELEMETRY_DIR = path.join(__dirname, "telemetry");

function analyzeTelemetryBalance() {
  const counts = {
    w: 0,
    a: 0,
    s: 0,
    d: 0,
  };

  // Read all JSON files from telemetry directory
  const files = fs
    .readdirSync(TELEMETRY_DIR)
    .filter((file) => file.endsWith(".json"));

  console.log(`\nAnalyzing ${files.length} telemetry files...\n`);

  // Process each file
  files.forEach((file) => {
    const filePath = path.join(TELEMETRY_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Count key presses in this file
    data.forEach((entry) => {
      if (entry.w_pressed) counts.w++;
      if (entry.a_pressed) counts.a++;
      if (entry.s_pressed) counts.s++;
      if (entry.d_pressed) counts.d++;
    });
  });

  // Calculate totals
  const totalPresses = counts.w + counts.a + counts.s + counts.d;
  let totalSamples = 0;
  let totalDurationMs = 0;

  // Calculate total samples and recording duration
  // Each telemetry sample is collected every 500ms
  const SAMPLE_INTERVAL_MS = 50;

  files.forEach((file) => {
    const data = JSON.parse(
      fs.readFileSync(path.join(TELEMETRY_DIR, file), "utf8")
    );
    totalSamples += data.length;

    // Calculate duration for this file based on sample count
    // Duration = number of samples * interval between samples
    if (data.length > 0) {
      totalDurationMs += data.length * SAMPLE_INTERVAL_MS;
    }
  });

  const totalMinutes = (totalDurationMs / 1000 / 60).toFixed(2);
  const totalSeconds = (totalDurationMs / 1000).toFixed(1);

  // Calculate percentages
  const percentages = {
    w: totalPresses > 0 ? ((counts.w / totalPresses) * 100).toFixed(2) : 0,
    a: totalPresses > 0 ? ((counts.a / totalPresses) * 100).toFixed(2) : 0,
    s: totalPresses > 0 ? ((counts.s / totalPresses) * 100).toFixed(2) : 0,
    d: totalPresses > 0 ? ((counts.d / totalPresses) * 100).toFixed(2) : 0,
  };

  // Display results
  console.log("=== OVERALL STATISTICS ===");
  console.log(
    `Total recording time: ${totalMinutes} minutes (${totalSeconds} seconds)`
  );
  console.log(`Total samples analyzed: ${totalSamples}`);
  console.log(`Total key presses: ${totalPresses}`);
  console.log();

  console.log("=== KEY PRESS DISTRIBUTION ===");
  console.log(
    `W (Accelerate):    ${counts.w.toLocaleString().padStart(10)} presses  (${
      percentages.w
    }%)`
  );
  console.log(
    `A (Turn Left):     ${counts.a.toLocaleString().padStart(10)} presses  (${
      percentages.a
    }%)`
  );
  console.log(
    `S (Brake/Reverse): ${counts.s.toLocaleString().padStart(10)} presses  (${
      percentages.s
    }%)`
  );
  console.log(
    `D (Turn Right):    ${counts.d.toLocaleString().padStart(10)} presses  (${
      percentages.d
    }%)`
  );
  console.log();

  // Calculate specific balances
  console.log("=== CONTROL BALANCE ANALYSIS ===");

  // Acceleration vs Braking
  const forwardBackwardTotal = counts.w + counts.s;
  if (forwardBackwardTotal > 0) {
    const wPercent = ((counts.w / forwardBackwardTotal) * 100).toFixed(2);
    const sPercent = ((counts.s / forwardBackwardTotal) * 100).toFixed(2);
    console.log("Forward/Backward Balance:");
    console.log(`  W (Accelerate):    ${wPercent}%`);
    console.log(`  S (Brake/Reverse): ${sPercent}%`);
    console.log();
  }

  // Left vs Right steering
  const steeringTotal = counts.a + counts.d;
  if (steeringTotal > 0) {
    const aPercent = ((counts.a / steeringTotal) * 100).toFixed(2);
    const dPercent = ((counts.d / steeringTotal) * 100).toFixed(2);
    console.log("Steering Balance:");
    console.log(`  A (Turn Left):  ${aPercent}%`);
    console.log(`  D (Turn Right): ${dPercent}%`);
    console.log();
  }

  // Acceleration vs Steering
  const accelSteerTotal = counts.w + counts.a + counts.d;
  if (accelSteerTotal > 0) {
    const accelPercent = ((counts.w / accelSteerTotal) * 100).toFixed(2);
    const steerPercent = (
      ((counts.a + counts.d) / accelSteerTotal) *
      100
    ).toFixed(2);
    console.log("Acceleration vs Steering:");
    console.log(`  Acceleration (W): ${accelPercent}%`);
    console.log(`  Steering (A+D):   ${steerPercent}%`);
  }

  console.log("\n");
}

// Run the analysis
try {
  analyzeTelemetryBalance();
} catch (error) {
  console.error("Error analyzing telemetry:", error.message);
  process.exit(1);
}
