import "dotenv/config";
import {Runware} from "@runware/sdk-js";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Core texture generation module (extracted from trackTextureGenerator.js)
 * Provides reusable API for generating textures with different configurations
 */

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
 * Convert buffer to base64 data URI
 * @param {Buffer} buffer - Image buffer
 * @returns {string} - Base64 data URI
 */
function createBase64DataUri(buffer) {
  const base64 = buffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}

/**
 * Load guide image from file path
 * @param {string} guidePath - Path to guide image file
 * @returns {string} - Base64 data URI of guide image
 */
export function loadGuideImage(guidePath) {
  if (!fs.existsSync(guidePath)) {
    throw new Error(`Guide image not found: ${guidePath}`);
  }
  const buffer = fs.readFileSync(guidePath);
  return createBase64DataUri(buffer);
}

/**
 * Generate texture with custom configuration
 * @param {Object} config - Generation configuration
 * @param {string} config.positivePrompt - Positive prompt
 * @param {string} config.negativePrompt - Negative prompt
 * @param {string} config.guideDataUri - Base64 data URI of guide image
 * @param {Object} config.controlNet - ControlNet configuration
 * @param {string} config.controlNet.model - ControlNet model ID
 * @param {number} config.controlNet.weight - ControlNet weight (0-1)
 * @param {number} config.controlNet.threshold - Edge detection threshold (0-1)
 * @param {number} config.controlNet.startStepPercentage - Start step percentage (0-100)
 * @param {number} config.controlNet.endStepPercentage - End step percentage (0-100)
 * @param {string} config.controlNet.controlMode - Control mode ("prompt" or "balanced")
 * @param {Object} config.generation - Generation parameters
 * @param {string} config.generation.model - Base model ID
 * @param {number} config.generation.width - Image width
 * @param {number} config.generation.height - Image height
 * @param {number} config.generation.steps - Number of generation steps
 * @param {number} config.generation.CFGScale - CFG scale value
 * @returns {Promise<Buffer>} - Generated image as buffer
 */
export async function generateTexture(config) {
  const apiKey = validateApiKey();
  const runware = new Runware({apiKey});

  // Connect to Runware service
  await runware.connect();

  const requestConfig = {
    positivePrompt: config.positivePrompt,
    negativePrompt: config.negativePrompt,
    model: config.generation.model,
    controlNet: [
      {
        model: config.controlNet.model,
        guideImage: config.guideDataUri,
        weight: config.controlNet.weight,
        threshold: config.controlNet.threshold,
        startStepPercentage: config.controlNet.startStepPercentage,
        endStepPercentage: config.controlNet.endStepPercentage,
        controlMode: config.controlNet.controlMode,
      },
    ],
    width: config.generation.width,
    height: config.generation.height,
    steps: config.generation.steps,
    CFGScale: config.generation.CFGScale,
    outputFormat: "PNG",
    outputType: "base64Data",
    numberResults: 1,
  };

  const result = await runware.requestImages(requestConfig);
  const buffer = Buffer.from(result[0].imageBase64Data, "base64");
  return buffer;
}

/**
 * Save buffer to file
 * @param {Buffer} buffer - File data buffer
 * @param {string} filePath - Full path where to save the file
 */
export function saveBuffer(buffer, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
  fs.writeFileSync(filePath, buffer);
}
