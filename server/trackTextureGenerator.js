import "dotenv/config";
import {Runware} from "@runware/sdk-js";
import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";
import {renderBordersGuide} from "./maskRenderer.js";
import {
  TRACK_TEXTURE_PROMPT,
  TRACK_TEXTURE_NEGATIVE,
} from "./prompts/track-texture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Configuration for track texture generation
 * Based on variation_1 parameters - most consistent results
 *
 * CRITICAL BALANCE: ControlNet weight + endStep vs CFG Scale
 * - Too high weight/endStep = edges perfect but prompt ignored (random images)
 * - Too low weight/endStep = prompt followed but edges lousy
 * - Current params: weight=0.74, threshold=0.86, endStep=78%, CFG=8.6
 * - Aggressive ControlNet for precise border alignment, lower CFG to reduce prompt conflict
 */
const GENERATION_CONFIG = {
  name: "Track Texture",
  controlNet: {
    weight: 0.74, // Significantly increased for strong border adherence
    threshold: 0.86, // High edge sensitivity for precise border alignment
    startStepPercentage: 0,
    endStepPercentage: 78, // Extended control through most of generation
    controlMode: "prompt", // Prioritize prompt over pure structure
  },
  generation: {
    steps: 43, // Optimal refinement steps
    CFGScale: 8.6, // Lower CFG to allow ControlNet structural dominance
  },
  guide: {
    blur: 3, // Blur amount in pixels for ControlNet guide image (0 = no blur)
  },
};

/**
 * Base FLUX generation configuration (non-parametrized values)
 */
const GENERATION_BASE = {
  model: "runware:101@1", // FLUX model
  width: 1280,
  height: 640,
  outputFormat: "PNG",
  outputType: "base64Data",
  numberResults: 1,
};

/**
 * Base ControlNet configuration (non-parametrized values)
 */
const CONTROLNET_BASE = {
  model: "runware:27@1", // ControlNet model
  width: 1280,
  height: 640,
};

/**
 * Directory paths for file operations
 */
const PATHS = {
  publicTracks: path.join(__dirname, "..", "public", "tracks"),
};

// ============================================================================
// Filesystem Utilities
// ============================================================================

/**
 * Ensure required directories exist
 */
function ensureDirectoriesExist() {
  if (!fs.existsSync(PATHS.publicTracks)) {
    fs.mkdirSync(PATHS.publicTracks, {recursive: true});
  }
}

/**
 * Sanitize track name for use in filenames
 * @param {string} trackName - Raw track name
 * @returns {string} - Sanitized filename-safe name
 */
function sanitizeTrackName(trackName) {
  return trackName.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
}

/**
 * Save buffer to file
 * @param {Buffer} buffer - File data buffer
 * @param {string} filePath - Full path where to save the file
 */
function saveBuffer(buffer, filePath) {
  fs.writeFileSync(filePath, buffer);
}

/**
 * Generate filename for texture (with timestamp to prevent overwriting)
 * @param {string} sanitizedName - Sanitized track name
 * @returns {string} - Generated filename
 */
function generateTextureFilename(sanitizedName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${sanitizedName}_${timestamp}.png`;
}

// ============================================================================
// Runware API Utilities
// ============================================================================

/**
 * Validate Runware API key
 * @throws {Error} If API key is missing
 */
function validateApiKey() {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RUNWARE_API_KEY environment variable is required. " +
        "Please set it to use Runware texture generation."
    );
  }
  return apiKey;
}

/**
 * Build Runware API request configuration
 * @param {string} guideDataUri - Base64 data URI of the ControlNet guide image
 * @returns {Object} - Runware API request configuration
 */
function buildRunwareRequest(guideDataUri) {
  return {
    positivePrompt: TRACK_TEXTURE_PROMPT,
    negativePrompt: TRACK_TEXTURE_NEGATIVE,
    model: GENERATION_BASE.model,
    controlNet: [
      {
        model: CONTROLNET_BASE.model,
        guideImage: guideDataUri,
        weight: GENERATION_CONFIG.controlNet.weight,
        threshold: GENERATION_CONFIG.controlNet.threshold,
        startStepPercentage: GENERATION_CONFIG.controlNet.startStepPercentage,
        endStepPercentage: GENERATION_CONFIG.controlNet.endStepPercentage,
        controlMode: GENERATION_CONFIG.controlNet.controlMode,
      },
    ],
    width: GENERATION_BASE.width,
    height: GENERATION_BASE.height,
    steps: GENERATION_CONFIG.generation.steps,
    CFGScale: GENERATION_CONFIG.generation.CFGScale,
    outputFormat: GENERATION_BASE.outputFormat,
    outputType: GENERATION_BASE.outputType,
    numberResults: GENERATION_BASE.numberResults,
  };
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate a racing track texture using ControlNet-guided generation
 * Uses track borders as structural guides by generating white border lines on
 * black background (edge detection style) instead of external ControlNet preprocessing.
 * This enables edge-to-edge texture generation while maintaining track boundaries.
 *
 * Aggressive settings for precise borders: weight=0.74, threshold=0.86, endStep=78%, CFG=8.6
 * Optional blur applied to guide image for softer edge guidance.
 *
 * @param {Array<{x: number, y: number}>} outerBorder - Outer border points
 * @param {Array<{x: number, y: number}>} innerBorder - Inner border points
 * @param {string} trackName - Name of the track (used for filename)
 * @returns {Promise<string>} - Filename of generated texture
 */
export async function generateTrackTexture(
  outerBorder,
  innerBorder,
  trackName
) {
  // Validate inputs
  validateTrackBorders(outerBorder, innerBorder);
  const apiKey = validateApiKey();

  // Initialize Runware client
  const runware = new Runware({apiKey});
  await runware.connect();

  try {
    // Ensure output directories exist
    ensureDirectoriesExist();

    // Prepare base filename
    const sanitizedName = sanitizeTrackName(trackName);

    // Step 1: Generate ControlNet guide image locally
    // White border lines on black background (edge detection style)
    console.log(`\n🎨 Generating texture for "${trackName}"...`);
    console.log("📐 Creating ControlNet guide from track borders...");

    // Prepare guide image output path
    const guideFilename = `${sanitizedName}_guide.png`;
    const guideOutputPath = path.join(PATHS.publicTracks, guideFilename);

    // Generate and save guide image with optional blur
    const bordersGuideBuffer = await renderBordersGuide(
      outerBorder,
      innerBorder,
      1280,
      640,
      GENERATION_CONFIG.guide.blur,
      guideOutputPath
    );
    const guideDataUri = createBase64DataUri(bordersGuideBuffer);
    console.log(`   Guide saved: ${guideFilename}`);

    // Step 2: Generate texture
    console.log(`\n🔄 Generating with ${GENERATION_CONFIG.name}...`);
    console.log(`   Guide: blur=${GENERATION_CONFIG.guide.blur}px`);
    console.log(
      `   ControlNet: weight=${GENERATION_CONFIG.controlNet.weight}, threshold=${GENERATION_CONFIG.controlNet.threshold}, endStep=${GENERATION_CONFIG.controlNet.endStepPercentage}%`
    );
    console.log(
      `   Generation: steps=${GENERATION_CONFIG.generation.steps}, CFG=${GENERATION_CONFIG.generation.CFGScale}`
    );

    const requestConfig = buildRunwareRequest(guideDataUri);
    const result = await runware.requestImages(requestConfig);

    // Step 3: Save texture
    const filename = generateTextureFilename(sanitizedName);
    const textureBuffer = Buffer.from(result[0].imageBase64Data, "base64");
    saveGeneratedTexture(textureBuffer, filename);

    console.log(`\n✨ Texture generated successfully!`);
    console.log(`   Saved: ${filename}`);

    return filename;
  } catch (error) {
    console.error("\n❌ Error generating texture with Runware:", error);
    throw new Error(`Failed to generate texture: ${error.message}`);
  }
}

/**
 * Validate track border data
 * @param {Array<{x: number, y: number}>} outerBorder - Outer border points
 * @param {Array<{x: number, y: number}>} innerBorder - Inner border points
 * @throws {Error} If borders are invalid
 */
function validateTrackBorders(outerBorder, innerBorder) {
  if (
    !outerBorder ||
    !innerBorder ||
    outerBorder.length < 3 ||
    innerBorder.length < 3
  ) {
    const error = `Invalid track borders: need at least 3 points for each border (got outer: ${outerBorder?.length}, inner: ${innerBorder?.length})`;
    console.error(error);
    throw new Error(error);
  }
}

/**
 * Convert buffer to base64 data URI
 * @param {Buffer} buffer - Image buffer
 * @returns {string} - Base64 data URI
 */
function createBase64DataUri(buffer) {
  const base64 = buffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}

/**
 * Save generated texture to public tracks directory
 * @param {Buffer} buffer - Texture image buffer
 * @param {string} filename - Filename to save as
 */
function saveGeneratedTexture(buffer, filename) {
  const outputPath = path.join(PATHS.publicTracks, filename);
  saveBuffer(buffer, outputPath);
  console.log(`Saved generated texture: ${filename}`);
}

/**
 * Delete a track texture file
 * @param {string} filename - Texture filename to delete
 */
export function deleteTrackTexture(filename) {
  if (!filename) return;

  try {
    const filePath = path.join(PATHS.publicTracks, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted texture: ${filename}`);
    }
  } catch (error) {
    console.error(`Error deleting texture ${filename}:`, error);
  }
}
