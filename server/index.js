import express from "express";
import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";
import multer from "multer";
import {generateTrackTexture, deleteTrackTexture} from "./fluxInpainter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Multer setup for handling file uploads (texture generation)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for canvas images
  },
});

// Middleware
// Increased limit from default 100kb to 10mb to handle large telemetry payloads
// With 50ms sampling, a 60-second run can generate ~1200 samples (~180kb)
app.use(express.json({limit: "10mb"}));

// CORS middleware for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Tracks directory
const TRACKS_DIR = path.join(__dirname, "tracks");

// Telemetry directory
const TELEMETRY_DIR = path.join(__dirname, "telemetry");

// Ensure tracks directory exists
async function ensureTracksDir() {
  try {
    await fs.access(TRACKS_DIR);
  } catch {
    await fs.mkdir(TRACKS_DIR, {recursive: true});
  }
}

// Ensure telemetry directory exists
async function ensureTelemetryDir() {
  try {
    await fs.access(TELEMETRY_DIR);
  } catch {
    await fs.mkdir(TELEMETRY_DIR, {recursive: true});
  }
}

// Get all tracks
app.get("/api/tracks", async (req, res) => {
  try {
    await ensureTracksDir();
    const files = await fs.readdir(TRACKS_DIR);
    const trackFiles = files.filter((f) => f.endsWith(".json"));

    const tracks = await Promise.all(
      trackFiles.map(async (file) => {
        const content = await fs.readFile(path.join(TRACKS_DIR, file), "utf-8");
        return JSON.parse(content);
      })
    );

    res.json(tracks);
  } catch (error) {
    console.error("Error reading tracks:", error);
    res.status(500).json({error: "Failed to read tracks"});
  }
});

// Get single track by name
app.get("/api/tracks/:name", async (req, res) => {
  try {
    const trackName = decodeURIComponent(req.params.name);
    const filePath = path.join(TRACKS_DIR, `${trackName}.json`);

    const content = await fs.readFile(filePath, "utf-8");
    const track = JSON.parse(content);

    res.json(track);
  } catch (error) {
    console.error("Error reading track:", error);
    res.status(404).json({error: "Track not found"});
  }
});

// Save a new track
app.post("/api/tracks", async (req, res) => {
  try {
    const track = req.body;

    if (!track.name) {
      return res.status(400).json({error: "Track name is required"});
    }

    await ensureTracksDir();

    const fileName = `${track.name}.json`;
    const filePath = path.join(TRACKS_DIR, fileName);

    await fs.writeFile(filePath, JSON.stringify(track, null, 2), "utf-8");

    res.status(201).json({message: "Track saved successfully", track});
  } catch (error) {
    console.error("Error saving track:", error);
    res.status(500).json({error: "Failed to save track"});
  }
});

// Delete a track
app.delete("/api/tracks/:name", async (req, res) => {
  try {
    const trackName = decodeURIComponent(req.params.name);
    const filePath = path.join(TRACKS_DIR, `${trackName}.json`);

    // Read track to get texture filename before deleting
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const track = JSON.parse(content);
      if (track.texture) {
        deleteTrackTexture(track.texture);
      }
    } catch (err) {
      console.error("Error reading track for texture cleanup:", err);
    }

    await fs.unlink(filePath);

    res.json({message: "Track deleted successfully"});
  } catch (error) {
    console.error("Error deleting track:", error);
    res.status(404).json({error: "Track not found"});
  }
});

// Generate track texture using Runware API
app.post("/api/tracks/generate-texture", async (req, res) => {
  try {
    const {outerBorder, innerBorder, trackName} = req.body;

    if (!outerBorder || !innerBorder) {
      console.error("Missing borders:", {
        hasOuter: !!outerBorder,
        hasInner: !!innerBorder,
      });
      return res
        .status(400)
        .json({error: "outerBorder and innerBorder are required"});
    }

    if (!Array.isArray(outerBorder) || !Array.isArray(innerBorder)) {
      console.error("Invalid border types:", {
        outerType: typeof outerBorder,
        innerType: typeof innerBorder,
      });
      return res
        .status(400)
        .json({error: "outerBorder and innerBorder must be arrays"});
    }

    if (outerBorder.length < 3 || innerBorder.length < 3) {
      console.error("Insufficient points:", {
        outerLength: outerBorder.length,
        innerLength: innerBorder.length,
      });
      return res.status(400).json({
        error: "Each border must have at least 3 points",
      });
    }

    const name = trackName || "track";

    // Generate texture using Runware
    const textureFilename = await generateTrackTexture(
      outerBorder,
      innerBorder,
      name
    );

    res.status(201).json({
      message: "Texture generated successfully",
      texture: textureFilename,
    });
  } catch (error) {
    console.error("Error generating texture:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Failed to generate texture",
      details: error.message,
    });
  }
});

// Save telemetry data
app.post("/api/telemetry", async (req, res) => {
  try {
    const telemetryData = req.body;

    if (!telemetryData || !Array.isArray(telemetryData)) {
      return res.status(400).json({error: "Telemetry data must be an array"});
    }

    await ensureTelemetryDir();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `telemetry_${timestamp}.json`;
    const filePath = path.join(TELEMETRY_DIR, fileName);

    await fs.writeFile(
      filePath,
      JSON.stringify(telemetryData, null, 2),
      "utf-8"
    );

    res.status(201).json({message: "Telemetry saved successfully", fileName});
  } catch (error) {
    console.error("Error saving telemetry:", error);
    res.status(500).json({error: "Failed to save telemetry"});
  }
});

app.listen(PORT, () => {});
