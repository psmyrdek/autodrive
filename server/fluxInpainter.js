import "dotenv/config";
import {Runware} from "@runware/sdk-js";
import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";
import {renderMask, renderBordersBaseImage} from "./maskRenderer.js";
import {TRACK_TEXTURE_PROMPT} from "./prompts/track-texture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a racing track texture using Runware inpainting
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
  // Validate environment variables
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RUNWARE_API_KEY environment variable is required. " +
        "Please set it to use Runware texture generation."
    );
  }

  // Initialize Runware client
  const runware = new Runware({apiKey});

  try {
    // Validate track points
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

    // Generate base image with track borders on base layer texture
    const baseImageBuffer = await renderBordersBaseImage(
      outerBorder,
      innerBorder
    );

    // Generate mask (white track area on black background)
    const maskBuffer = renderMask(outerBorder, innerBorder);

    const timestamp = Date.now();
    const sanitizedName = trackName.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();

    // Convert buffers to base64 data URIs for Runware
    const baseImageDataUri = `data:image/png;base64,${baseImageBuffer.toString(
      "base64"
    )}`;
    const maskImageDataUri = `data:image/png;base64,${maskBuffer.toString(
      "base64"
    )}`;

    // Using FLUX Fill model for specialized inpainting - it automatically handles
    // strength and other parameters for optimal results
    const result = await runware.requestImages({
      positivePrompt: TRACK_TEXTURE_PROMPT,
      model: "runware:102@1", // FLUX Fill - specialized inpainting model
      seedImage: baseImageDataUri,
      maskImage: maskImageDataUri,
      width: 1280,
      height: 640,
      outputFormat: "PNG",
      outputType: "base64Data", // Get base64 data directly
      numberResults: 1,
    });

    // Convert base64 data to buffer
    const buffer = Buffer.from(result[0].imageBase64Data, "base64");

    fs.writeFileSync("result.json", JSON.stringify(result, null, 2));

    // Generate filename with timestamp to avoid conflicts
    const filename = `${sanitizedName}-${timestamp}.png`;

    // Save the generated texture
    const publicTracksDir = path.join(__dirname, "..", "public", "tracks");
    if (!fs.existsSync(publicTracksDir)) {
      fs.mkdirSync(publicTracksDir, {recursive: true});
    }

    const outputPath = path.join(publicTracksDir, filename);
    fs.writeFileSync(outputPath, buffer);

    return filename;
  } catch (error) {
    console.error("Error generating texture with Runware:", error);
    throw new Error(`Failed to generate texture: ${error.message}`);
  }
}

/**
 * Delete a track texture file
 * @param {string} filename - Texture filename to delete
 */
export function deleteTrackTexture(filename) {
  if (!filename) return;

  try {
    const publicTracksDir = path.join(__dirname, "..", "public", "tracks");
    const filePath = path.join(publicTracksDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting texture ${filename}:`, error);
  }
}
