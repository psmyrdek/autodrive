import "dotenv/config";
import * as path from "node:path";
import * as fs from "node:fs";
import {fileURLToPath} from "node:url";
import {
  generateTexture,
  loadGuideImage,
  saveBuffer,
} from "./textureGenerator.js";
import {
  TRACK_TEXTURE_PROMPT,
  TRACK_TEXTURE_NEGATIVE,
} from "../prompts/track-texture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration Definitions
// ============================================================================

/**
 * 5 different ControlNet + Base Model configurations to evaluate
 * Goal: Find which configuration produces most consistent results
 */
const EVAL_CONFIGS = [
  {
    name: "depth-balanced-v2",
    description: "Conservative baseline - proven params with moderate CFG",
    guideImage: "testy_depth.png",
    controlNet: {
      model: "runware:27@1", // Depth model
      weight: 0.68,
      threshold: 0.79,
      startStepPercentage: 0,
      endStepPercentage: 70,
      controlMode: "prompt",
    },
    generation: {
      model: "runware:101@1", // FLUX
      width: 1280,
      height: 640,
      steps: 43,
      CFGScale: 9.0, // Back to moderate CFG
    },
  },
  {
    name: "depth-mild-early",
    description: "Gentle early release at 65% with balanced CFG",
    guideImage: "testy_depth.png",
    controlNet: {
      model: "runware:27@1", // Depth model
      weight: 0.68,
      threshold: 0.79,
      startStepPercentage: 0,
      endStepPercentage: 65,
      controlMode: "prompt",
    },
    generation: {
      model: "runware:101@1", // FLUX
      width: 1280,
      height: 640,
      steps: 43,
      CFGScale: 9.3,
    },
  },
  {
    name: "depth-smooth-blend",
    description: "Lower weight for smoother blending, moderate end",
    guideImage: "testy_depth.png",
    controlNet: {
      model: "runware:27@1", // Depth model
      weight: 0.65,
      threshold: 0.78,
      startStepPercentage: 0,
      endStepPercentage: 68,
      controlMode: "prompt",
    },
    generation: {
      model: "runware:101@1", // FLUX
      width: 1280,
      height: 640,
      steps: 43,
      CFGScale: 9.2,
    },
  },
  {
    name: "depth-stable-strong",
    description: "Slightly higher weight for structure, standard end",
    guideImage: "testy_depth.png",
    controlNet: {
      model: "runware:27@1", // Depth model
      weight: 0.7,
      threshold: 0.8,
      startStepPercentage: 0,
      endStepPercentage: 72,
      controlMode: "prompt",
    },
    generation: {
      model: "runware:101@1", // FLUX
      width: 1280,
      height: 640,
      steps: 43,
      CFGScale: 8.8,
    },
  },
  {
    name: "depth-refined-classic",
    description: "Classic proven approach with fine-tuned threshold",
    guideImage: "testy_depth.png",
    controlNet: {
      model: "runware:27@1", // Depth model
      weight: 0.68,
      threshold: 0.81,
      startStepPercentage: 0,
      endStepPercentage: 70,
      controlMode: "prompt",
    },
    generation: {
      model: "runware:101@1", // FLUX
      width: 1280,
      height: 640,
      steps: 43,
      CFGScale: 9.0,
    },
  },
];

// ============================================================================
// Evaluation Settings
// ============================================================================

const RUNS_PER_CONFIG = 10;
const OUTPUT_DIR = path.join(__dirname, "eval-results");
const CONTROLS_DIR = path.join(__dirname, "controls");

// ============================================================================
// Evaluation Functions
// ============================================================================

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, {recursive: true});
  }
}

/**
 * Generate timestamp for filenames
 */
function getTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .split(".")[0];
}

/**
 * Run evaluation for a single configuration
 */
async function evaluateConfig(config, configIndex) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(
    `📊 CONFIG ${configIndex + 1}/${EVAL_CONFIGS.length}: ${config.name}`
  );
  console.log(`📝 ${config.description}`);
  console.log(`${"=".repeat(80)}\n`);

  // Load guide image
  const guidePath = path.join(CONTROLS_DIR, config.guideImage);
  console.log(`📐 Loading guide image: ${config.guideImage}`);
  const guideDataUri = loadGuideImage(guidePath);

  // Create config-specific output directory
  const configOutputDir = path.join(OUTPUT_DIR, config.name);
  if (!fs.existsSync(configOutputDir)) {
    fs.mkdirSync(configOutputDir, {recursive: true});
  }

  const results = [];

  // Run multiple generations
  for (let run = 0; run < RUNS_PER_CONFIG; run++) {
    console.log(`\n🔄 Run ${run + 1}/${RUNS_PER_CONFIG}...`);

    const startTime = Date.now();

    try {
      // Generate texture
      const buffer = await generateTexture({
        positivePrompt: TRACK_TEXTURE_PROMPT,
        negativePrompt: TRACK_TEXTURE_NEGATIVE,
        guideDataUri,
        controlNet: config.controlNet,
        generation: config.generation,
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds

      // Save result
      const filename = `${config.name}_run${String(run + 1).padStart(
        2,
        "0"
      )}.png`;
      const filepath = path.join(configOutputDir, filename);
      saveBuffer(buffer, filepath);

      console.log(`   ✅ Generated in ${duration.toFixed(2)}s: ${filename}`);

      results.push({
        run: run + 1,
        filename,
        filepath,
        duration,
        timestamp: new Date().toISOString(),
        success: true,
      });
    } catch (error) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Force immediate error logging by flushing stdout first
      process.stdout.write("");
      console.error(
        `   ❌ Error in run ${run + 1}:`,
        JSON.stringify(error, null, 2)
      );
      process.stderr.write("\n");

      results.push({
        run: run + 1,
        filename: null,
        filepath: null,
        duration,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Main evaluation runner
 */
async function runEvaluation() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    CONTROLNET CONFIGURATION EVALUATION                     ║
║                                                                            ║
║  Testing ${EVAL_CONFIGS.length} different configurations × ${RUNS_PER_CONFIG} runs each                           ║
║  Goal: Identify which config produces most consistent results             ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  ensureOutputDir();

  const evaluationStartTime = Date.now();

  // Run all configurations in parallel
  console.log(
    `🚀 Starting parallel evaluation of ${EVAL_CONFIGS.length} configurations...\n`
  );

  const configPromises = EVAL_CONFIGS.map((config, i) =>
    evaluateConfig(config, i).then((results) => ({
      name: config.name,
      config: {
        name: config.name,
        description: config.description,
        guideImage: config.guideImage,
        controlNet: config.controlNet,
        generation: config.generation,
      },
      results,
      stats: {
        totalRuns: results.length,
        successfulRuns: results.filter((r) => r.success).length,
        failedRuns: results.filter((r) => !r.success).length,
        averageDuration: (
          results.reduce((sum, r) => sum + r.duration, 0) / results.length
        ).toFixed(2),
      },
    }))
  );

  const allResultsArray = await Promise.all(configPromises);

  // Convert array to object keyed by config name
  const allResults = {};
  allResultsArray.forEach((result) => {
    allResults[result.name] = result;
  });

  const evaluationEndTime = Date.now();
  const totalDuration = (evaluationEndTime - evaluationStartTime) / 1000;

  // Save summary
  const summaryPath = path.join(
    OUTPUT_DIR,
    `evaluation_summary_${getTimestamp()}.json`
  );
  const summary = {
    evaluationDate: new Date().toISOString(),
    totalDuration: `${(totalDuration / 60).toFixed(2)} minutes`,
    runsPerConfig: RUNS_PER_CONFIG,
    totalConfigs: EVAL_CONFIGS.length,
    totalGenerations: EVAL_CONFIGS.length * RUNS_PER_CONFIG,
    results: allResults,
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Print summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📋 EVALUATION SUMMARY`);
  console.log(`${"=".repeat(80)}\n`);
  console.log(`Total Duration: ${(totalDuration / 60).toFixed(2)} minutes`);
  console.log(`Total Generations: ${EVAL_CONFIGS.length * RUNS_PER_CONFIG}\n`);

  Object.entries(allResults).forEach(([name, data]) => {
    console.log(`${name}:`);
    console.log(
      `  ✅ Success: ${data.stats.successfulRuns}/${data.stats.totalRuns}`
    );
    console.log(`  ⏱️  Avg Duration: ${data.stats.averageDuration}s`);
    console.log(`  📁 Output: eval-results/${name}/\n`);
  });

  console.log(`📄 Summary saved: ${summaryPath}\n`);
  console.log(`✨ Evaluation complete! Review images in: ${OUTPUT_DIR}\n`);
}

// ============================================================================
// Run Evaluation
// ============================================================================

runEvaluation().catch((error) => {
  console.error("\n❌ Evaluation failed:", error);
  process.exit(1);
});
