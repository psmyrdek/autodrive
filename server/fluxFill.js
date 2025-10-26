import "dotenv/config";
import Replicate from "replicate";
import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";
import {renderMask, renderBordersBaseImage} from "./maskRenderer.js";
import {TRACK_TEXTURE_PROMPT} from "./prompts/track-texture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a racing track texture using Flux Fill Pro API
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
  // Validate API key
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    throw new Error(
      "REPLICATE_API_TOKEN environment variable is not set. " +
        "Please set it to use texture generation."
    );
  }

  const replicate = new Replicate({auth: apiKey});

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

    // Generate mask from the track points (filled track area)
    const maskBuffer = renderMask(outerBorder, innerBorder);

    // Generate base image with visible track borders (on top of base layer texture)
    const baseImageBuffer = await renderBordersBaseImage(outerBorder, innerBorder);

    const timestamp = Date.now();
    const sanitizedName = trackName.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();

    // Convert mask to base64 data URI for Replicate
    const maskBase64 = `data:image/png;base64,${maskBuffer.toString("base64")}`;

    // Convert base image (with borders) to base64 data URI
    const baseLayerBase64 = `data:image/png;base64,${baseImageBuffer.toString(
      "base64"
    )}`;

    // Call Flux Fill Pro API
    const input = {
      mask: maskBase64,
      image: baseLayerBase64,
      prompt: TRACK_TEXTURE_PROMPT,
    };

    const output = await replicate.run("black-forest-labs/flux-fill-pro", {
      input,
    });

    // The Replicate SDK returns a FileOutput object that is iterable
    // We can convert it directly to a Buffer
    let buffer;

    if (output && typeof output.arrayBuffer === "function") {
      // If it's a file-like object with arrayBuffer method
      const arrayBuffer = await output.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(output)) {
      // If it's already a Buffer
      buffer = output;
    } else if (
      output &&
      typeof output === "object" &&
      typeof output.getReader === "function"
    ) {
      // If it's a ReadableStream
      const chunks = [];
      const reader = output.getReader();
      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      buffer = Buffer.concat(chunks);
    } else if (
      output &&
      typeof output === "object" &&
      output[Symbol.iterator]
    ) {
      // If it's an iterable (like FileOutput from Replicate SDK)
      const chunks = [];
      for await (const chunk of output) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    } else {
      console.error("Unexpected output type:", output);
      console.error("Output constructor:", output?.constructor?.name);
      throw new Error(
        `Unexpected output type from Flux Fill: ${typeof output}`
      );
    }

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
    console.error("Error generating texture with Flux Fill:", error);
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
