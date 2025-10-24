import express from "express";
import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

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

    await fs.unlink(filePath);

    res.json({message: "Track deleted successfully"});
  } catch (error) {
    console.error("Error deleting track:", error);
    res.status(404).json({error: "Track not found"});
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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
