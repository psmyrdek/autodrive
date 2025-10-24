# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoDrive is a 2D driving game with a visual track builder, built with React, TypeScript, Phaser 3, and Express. The application consists of two main features: a playable Game and a Track Builder for creating custom tracks.

## Development Commands

### Starting the Application
- `npm run dev:all` - Start both frontend (Vite on :5173) and backend (Express on :3001) concurrently (recommended)
- `npm run dev` - Start frontend only
- `npm run dev:server` - Start backend only

### Other Commands
- `npm run build` - Build for production (runs TypeScript compiler then Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Preview production build

### Important Note
**DO NOT run dev servers during development sessions.** Automated testing is out of scope.

## Architecture

### Client-Server Structure
The app uses a clear separation between frontend (React + Phaser) and backend (Express API):

- **Frontend (port 5173)**: React SPA with Phaser 3 game engine
- **Backend (port 3001)**: Express REST API for track persistence and telemetry storage
- **API Proxy**: Vite proxies `/api/*` requests to backend (configured in `vite.config.ts`)

### Data Flow: Track Builder → Game

1. **Track Builder** (`src/components/TrackBuilder.tsx`):
   - Canvas-based UI where users draw track boundaries point-by-point
   - Stores **sparse points** (user-placed control points) during editing
   - On save, converts sparse points to **dense points** using cubic bezier interpolation (`src/utils/curveInterpolation.ts`)
   - Both sparse and dense points are saved to backend via `POST /api/tracks`

2. **Track Storage** (`server/index.js`):
   - Tracks stored as JSON files in `server/tracks/` directory
   - Each track file contains: name, outerBorder (dense), innerBorder (dense), startPoint, sparseOuterBorder, sparseInnerBorder

3. **Game** (`src/components/Game.tsx` + `src/scenes/GameScene.ts`):
   - Fetches tracks from backend via `GET /api/tracks`
   - Renders tracks using **dense points** (no runtime interpolation needed)
   - Dense points enable efficient collision detection and smooth rendering
   - Uses `checkCarCollision()` from `src/utils/collisionDetection.ts` for track boundary checks

### Key Type Definitions (`src/types/track.ts`)

```typescript
interface Track {
  name: string;
  outerBorder: Point[];        // Dense interpolated points for rendering
  innerBorder: Point[];        // Dense interpolated points for rendering
  startPoint: Point;
  sparseOuterBorder?: Point[]; // Original user-placed points for editing
  sparseInnerBorder?: Point[]; // Original user-placed points for editing
}
```

### Phaser Integration

The Game component integrates Phaser 3 via `GameScene` (`src/scenes/GameScene.ts`):
- Fixed 1280x720 resolution with FIT scale mode (maintains aspect ratio)
- Scene lifecycle: React creates Phaser game instance, gets scene reference via events
- Track updates: React calls `sceneRef.current.updateTrack(track)` to change tracks
- Collision events: Phaser scene emits `collision` event that React component listens to

### Game Systems

The game uses a modular architecture with specialized systems (in `src/systems/`) that are orchestrated by `GameScene`. Each system has a single responsibility and can be tested/modified independently.

**CarPhysics** (`src/systems/CarPhysics.ts`):
- Manages car movement, position, velocity, rotation, and arcade-style physics
- WSAD controls (W: accelerate, S: brake/reverse, A/D: turn when moving)
- Physics constants: acceleration (300), max speed (400), friction (0.96), turn speed (3.5)
- Car is a 40x20px rectangle with blue front, red back, gray body

**InputManager** (`src/systems/InputManager.ts`):
- Handles keyboard input (WASD keys) and translates it to car physics actions

**RadarSystem** (`src/systems/RadarSystem.ts`):
- Casts three distance-sensing rays (left, center, right) from the front of the car to detect track borders
- Each ray detects distance to nearest track border (up to 1500px), angled at ±20 degrees from car's forward direction
- Visual display: green lines from car to intersection points, distance values in bottom-left

**TelemetryTracker** (`src/systems/TelemetryTracker.ts`):
- Collects gameplay data every 500ms: timestamp, key states (W/A/S/D), sensor ranges (L/C/R)
- On collision, telemetry array is passed to React component
- User can save telemetry to backend via `POST /api/telemetry` (stored in `server/telemetry/`)

**TimerDisplay** (`src/systems/TimerDisplay.ts`):
- Displays and tracks elapsed time in top-right corner (format: M:SS.D)
- Starts automatically when track loads, stops on collision
- Resets when switching tracks or restarting

**Collision Detection** (`src/utils/collisionDetection.ts`):
- Checks all 4 corners of rotated car rectangle against track borders
- Uses point-in-polygon ray casting algorithm
- Car must stay inside outer border and outside inner border

### Curve Interpolation (`src/utils/curveInterpolation.ts`)

The `interpolateDensePoints()` function converts sparse control points into dense point arrays:
- Uses cubic bezier curves with configurable tension (default: 0.5)
- Default: 10 points per segment between user-placed points
- Handles closed paths (loops) for track boundaries
- Ensures smooth curves and adequate density for collision detection

### Component Structure

```
src/
├── components/
│   ├── Navigation.tsx       # Top nav bar (routing links)
│   ├── Game.tsx             # Game container (Phaser integration, track switching, telemetry handling)
│   ├── TrackBuilder.tsx     # Canvas-based track drawing tool
│   ├── TrackSwitcher.tsx    # Track selection overlay in game
│   └── CrashModal.tsx       # Modal for collision events (restart/save telemetry options)
├── scenes/
│   └── GameScene.ts         # Phaser scene orchestrator (track rendering, system coordination, collision handling)
├── systems/
│   ├── CarPhysics.ts        # Car movement, position, velocity, and physics calculations
│   ├── InputManager.ts      # Keyboard input handling (WASD keys)
│   ├── RadarSystem.ts       # Distance sensors and ray casting for obstacle detection
│   ├── TelemetryTracker.ts  # Gameplay data collection and storage
│   └── TimerDisplay.ts      # Game timer display and elapsed time tracking
├── utils/
│   ├── curveInterpolation.ts   # Dense point interpolation (cubic bezier)
│   └── collisionDetection.ts   # Point-in-polygon and car collision checking
├── types/
│   └── track.ts             # Shared Track and Point interfaces
├── App.tsx                  # React Router setup (/, /game, /track-builder)
└── main.tsx                 # React entry point

server/
├── index.js                 # Express API (tracks CRUD, telemetry storage)
├── tracks/                  # Track JSON files (auto-created)
└── telemetry/               # Telemetry JSON files (auto-created)
```

### API Endpoints

**Tracks** (`server/index.js`):
- `GET /api/tracks` - List all saved tracks
- `GET /api/tracks/:name` - Get specific track by name
- `POST /api/tracks` - Save new track (requires `name` field)
- `DELETE /api/tracks/:name` - Delete track

**Telemetry**:
- `POST /api/telemetry` - Save telemetry array (filename: `telemetry_<ISO-timestamp>.json`)

## Coordinate System

Both Track Builder canvas and Game use **1280x720 resolution** for 1:1 coordinate mapping. This ensures tracks drawn in Track Builder render identically in the Game without coordinate transformation.

## Tech Stack Versions

- React 19.1.1 with TypeScript 5.9.3
- Phaser 3.90.0 (game engine)
- Vite 7.1.7 (build tool)
- Tailwind CSS 4.1.16 (styling)
- react-router-dom 7.9.4 (routing)
- Express 4.18.2 (backend)
- Concurrently 8.2.2 (run multiple servers)
