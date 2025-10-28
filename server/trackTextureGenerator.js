import "dotenv/config";
import {Runware} from "@runware/sdk-js";
import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";
import {renderBordersGuide} from "./maskRenderer.js";
import {TRACK_TEXTURE_PROMPT} from "./prompts/track-texture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * ControlNet configuration for FLUX image generation
 * These parameters control how the guide image influences the generation
 */
const CONTROLNET_CONFIG = {
  model: "runware:25@1", // ControlNet model
  weight: 0.8, //0.6, // How strongly the ControlNet guide influences generation (0-1)
  threshold: 0.95, // 0.95
  startStepPercentage: 0, // When to start applying ControlNet (0 = from beginning)
  endStepPercentage: 70, //85, // When to stop applying ControlNet (85 = apply for 85% of steps)
  controlMode: "balanced", // Balance between prompt and control
};

/**
 * FLUX model generation parameters
 */
const GENERATION_CONFIG = {
  model: "runware:101@1", // FLUX model
  width: 1280,
  height: 640,
  steps: 28,
  CFGScale: 8,
  outputFormat: "PNG",
  outputType: "base64Data",
  numberResults: 1,
};

/**
 * Directory paths for file operations
 */
const PATHS = {
  requests: path.join(__dirname, "requests"),
  publicTracks: path.join(__dirname, "..", "public", "tracks"),
  logs: path.join(__dirname, "log"),
};

// ============================================================================
// Filesystem Utilities
// ============================================================================

/**
 * Ensure required directories exist
 */
function ensureDirectoriesExist() {
  if (!fs.existsSync(PATHS.requests)) {
    fs.mkdirSync(PATHS.requests, {recursive: true});
  }
  if (!fs.existsSync(PATHS.publicTracks)) {
    fs.mkdirSync(PATHS.publicTracks, {recursive: true});
  }
  if (!fs.existsSync(PATHS.logs)) {
    fs.mkdirSync(PATHS.logs, {recursive: true});
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
 * Save JSON data to file
 * @param {Object} data - JSON data to save
 * @param {string} filePath - Full path where to save the file
 */
function saveJSON(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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
    model: GENERATION_CONFIG.model,
    controlNet: [
      {
        model: CONTROLNET_CONFIG.model,
        guideImage: guideDataUri,
        weight: CONTROLNET_CONFIG.weight,
        threshold: CONTROLNET_CONFIG.threshold,
        startStepPercentage: CONTROLNET_CONFIG.startStepPercentage,
        endStepPercentage: CONTROLNET_CONFIG.endStepPercentage,
        controlMode: CONTROLNET_CONFIG.controlMode,
      },
    ],
    width: GENERATION_CONFIG.width,
    height: GENERATION_CONFIG.height,
    steps: GENERATION_CONFIG.steps,
    CFGScale: GENERATION_CONFIG.CFGScale,
    outputFormat: GENERATION_CONFIG.outputFormat,
    outputType: GENERATION_CONFIG.outputType,
    numberResults: GENERATION_CONFIG.numberResults,
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
 * @param {Array<{x: number, y: number}>} outerBorder - Outer border points
 * @param {Array<{x: number, y: number}>} innerBorder - Inner border points
 * @param {string} trackName - Name of the track (used for filename)
 * @returns {Promise<string>} - Filename of the generated texture
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

  try {
    // Ensure output directories exist
    ensureDirectoriesExist();

    // Prepare base filename
    const sanitizedName = sanitizeTrackName(trackName);

    // Step 1: Generate ControlNet guide image locally
    // White border lines on black background (edge detection style)
    const bordersGuideBuffer = renderBordersGuide(outerBorder, innerBorder);
    const guideDataUri = createBase64DataUri(bordersGuideBuffer);

    // Log guide image for debugging
    const guideLogPath = path.join(
      PATHS.logs,
      `guide_${sanitizedName}_${Date.now()}.png`
    );
    saveBuffer(bordersGuideBuffer, guideLogPath);
    console.log(`Saved guide image to: ${guideLogPath}`);

    // Step 2: Generate texture
    console.log(`Generating texture for "${trackName}"...`);
    const requestConfig = buildRunwareRequest(guideDataUri);
    const result = await runware.requestImages(requestConfig);

    // Step 3: Save texture
    const filename = generateTextureFilename(sanitizedName);
    const textureBuffer = Buffer.from(result[0].imageBase64Data, "base64");
    saveGeneratedTexture(textureBuffer, filename);

    return filename;
  } catch (error) {
    console.error("Error generating texture with Runware:", error);
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
