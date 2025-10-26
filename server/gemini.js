import "dotenv/config";
import {GoogleGenAI} from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";
import {TRACK_TEXTURE_PROMPT} from "./prompts/track-texture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a racing track texture using Google Gemini 2.5 Flash Image API
 * @param {Buffer} imageBuffer - PNG image buffer of the track outline
 * @param {string} trackName - Name of the track (used for filename)
 * @returns {Promise<string>} - Filename of the generated texture
 */
export async function generateTrackTexture(imageBuffer, trackName) {
  // Validate API key
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENAI_API_KEY environment variable is not set. " +
        "Please set it to use texture generation."
    );
  }

  const ai = new GoogleGenAI({apiKey});

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString("base64");

  // Prepare the prompt with image
  const prompt = [
    {
      text: TRACK_TEXTURE_PROMPT,
    },
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Image,
      },
    },
  ];

  console.log(`Generating texture for track: ${trackName}`);

  try {
    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    // Extract generated image from response
    let generatedImageData = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        generatedImageData = part.inlineData.data;
        break;
      }
    }

    if (!generatedImageData) {
      throw new Error("No image data received from Gemini API");
    }

    // Generate filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const sanitizedName = trackName.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    const filename = `${sanitizedName}-${timestamp}.png`;

    // Save the generated texture
    const publicTracksDir = path.join(__dirname, "..", "public", "tracks");
    if (!fs.existsSync(publicTracksDir)) {
      fs.mkdirSync(publicTracksDir, {recursive: true});
    }

    const outputPath = path.join(publicTracksDir, filename);
    const buffer = Buffer.from(generatedImageData, "base64");
    fs.writeFileSync(outputPath, buffer);

    console.log(`Texture generated and saved: ${filename}`);

    return filename;
  } catch (error) {
    console.error("Error generating texture with Gemini:", error);
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
      console.log(`Deleted texture: ${filename}`);
    }
  } catch (error) {
    console.error(`Error deleting texture ${filename}:`, error);
  }
}
