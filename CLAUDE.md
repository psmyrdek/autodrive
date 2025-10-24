# AutoDrive - Development Notes

## Overview
A 2D driving game built with React, Vite, Tailwind CSS, Phaser 3, and TypeScript. The app consists of two main features: Game and Track Builder.

## Architecture Implementation Status

### Completed
- **Client-side routing** using react-router-dom
  - `/game` - Game component route
  - `/track-builder` - Track Builder component route
  - Root `/` redirects to `/game`

- **Navigation system**
  - Top-level navigation bar with links to both features
  - Located at `src/components/Navigation.tsx`

- **Component structure**
  - `src/components/Game.tsx` - Game feature with Phaser integration
  - `src/components/TrackBuilder.tsx` - Full Track Builder implementation
  - `src/components/TrackSwitcher.tsx` - Track selection UI component
  - `src/scenes/GameScene.ts` - Phaser scene for track rendering
  - `src/utils/curveInterpolation.ts` - Utility for dense point interpolation

- **Shared type definitions** (`src/types/track.ts`)
  - `Point` interface for coordinates (x, y)
  - `Track` interface for track definitions:
    - name: string
    - outerBorder: Point[] - Dense interpolated points for rendering and collision detection
    - innerBorder: Point[] - Dense interpolated points for rendering and collision detection
    - startPoint: Point
    - sparseOuterBorder?: Point[] - Original user-placed control points (for editing)
    - sparseInnerBorder?: Point[] - Original user-placed control points (for editing)
  - Ensures type compatibility between Game and Track Builder

- **Track Builder** (`src/components/TrackBuilder.tsx`)
  - Canvas-based drawing interface (1280x720)
  - Three drawing tools:
    - Outer Border (blue) - Draw track outer boundary
    - Inner Border (red) - Draw track inner boundary
    - Start Point (green) - Place car starting position
  - Point-by-point drawing:
    - Single-click to add points
    - Double-click to complete outline
  - Cubic bezier curve smoothing for completed borders
  - Dense point interpolation on save (10 points per segment using `src/utils/curveInterpolation.ts`)
  - Stores both sparse (user-placed) and dense (interpolated) points
  - Track naming system
  - Save/Load/Clear functionality
  - Sidebar with tool selection and saved tracks list
  - Visual feedback: checkmarks on completed elements

- **Game Component** (`src/components/Game.tsx`)
  - Phaser 3 integration with fixed 1280x720 resolution
  - Scale mode: FIT (maintains aspect ratio, centers canvas)
  - Track rendering via GameScene (`src/scenes/GameScene.ts`)
  - Track switcher overlay (top-left) for selecting tracks
  - Fetches tracks from backend API
  - Auto-selects first available track on load
  - Restarts scene when switching tracks

- **GameScene** (`src/scenes/GameScene.ts`)
  - Phaser scene for rendering tracks and game logic
  - Renders dense interpolated points as connected lines
  - Visual styling:
    - Outer border: blue (0x4169e1), 4px width
    - Inner border: red (0xdc143c), 4px width
  - Simple line rendering between dense points (no bezier calculation at runtime)
  - **Car implementation**:
    - Rectangle asset (40x20px) with blue front, red back, gray body
    - Spawns at track's startPoint
    - WSAD keyboard controls (W: accelerate, S: brake/reverse, A/D: turn when moving)
    - Arcade-style physics with momentum and friction
    - Physics constants: acceleration (300), max speed (400), friction (0.96), turn speed (3.5)
  - **Timer system**:
    - Continuous timer displayed in top-right corner
    - Format: M:SS.D (minutes:seconds.deciseconds)
    - Starts automatically when track loads
    - Resets when switching tracks
  - Optimized for performance and collision detection

- **Curve Interpolation Utility** (`src/utils/curveInterpolation.ts`)
  - `interpolateDensePoints()` function
  - Converts sparse user-placed points into dense point arrays
  - Uses cubic bezier curves with configurable tension
  - Default: 10 points per segment
  - Ensures smooth curves and adequate point density for collision detection
  - Handles closed paths (loops)

- **Backend API** (`server/index.js`)
  - Express server on port 3001
  - RESTful endpoints:
    - `GET /api/tracks` - List all tracks
    - `GET /api/tracks/:name` - Get specific track
    - `POST /api/tracks` - Save new track
    - `DELETE /api/tracks/:name` - Delete track
  - File-based persistence (JSON files in `tracks/` directory)
  - CORS enabled for development

- **Development Setup**
  - Vite proxy configured to route `/api` requests to backend
  - Concurrent script to run both Vite and API server
  - Use `npm run dev:all` to start both servers

## Project Structure
```
src/
├── components/
│   ├── Navigation.tsx      # Top-level nav bar
│   ├── Game.tsx            # Game feature with Phaser integration
│   ├── TrackBuilder.tsx    # Track Builder feature (fully implemented)
│   └── TrackSwitcher.tsx   # Track selection UI overlay
├── scenes/
│   └── GameScene.ts        # Phaser scene for track rendering
├── utils/
│   └── curveInterpolation.ts  # Dense point interpolation utility
├── types/
│   └── track.ts            # Shared Track type definitions
├── App.tsx                 # Router configuration
├── main.tsx                # App entry point
└── index.css               # Tailwind imports

server/
└── index.js                # Express API server

tracks/                     # Persisted track JSON files (created automatically)
```

## Tech Stack
- React 19.1.1
- TypeScript 5.9.3
- Vite 7.1.7
- Tailwind CSS 4.1.16
- react-router-dom 7.9.4
- Express 4.18.2
- Concurrently 8.2.2
- Phaser 3.87.0 (integrated)

## How to Run
1. Install dependencies: `npm install`
2. Start both frontend and backend: `npm run dev:all`
   - Frontend runs on http://localhost:5173
   - Backend API runs on http://localhost:3001
3. Alternative: Run servers separately:
   - `npm run dev` (frontend only)
   - `npm run dev:server` (backend only)

## Game Controls
1. Navigate to `/game`
2. Select a track from the top-left panel
3. Car spawns at the track's start point
4. **Controls**:
   - **W** - Accelerate forward
   - **S** - Brake (when moving) / Reverse (when stopped)
   - **A** - Turn left (requires movement)
   - **D** - Turn right (requires movement)
5. Timer starts automatically and runs continuously
6. Switch tracks anytime using the track selector

## Track Builder Usage
1. Navigate to `/track-builder`
2. Enter a track name
3. Use Outer Border tool to draw outer boundary (click points, double-click to finish)
4. Use Inner Border tool to draw inner boundary (click points, double-click to finish)
5. Use Start Point tool to place car starting position (single click)
6. Click "Save Track" to persist to filesystem
7. Saved tracks appear in sidebar and can be loaded for editing

## Track Data Format & Interpolation
- **Sparse Points**: User-placed control points in Track Builder (stored in `sparseOuterBorder` and `sparseInnerBorder`)
- **Dense Points**: Automatically generated interpolated points (stored in `outerBorder` and `innerBorder`)
- **Interpolation Process**:
  - On save, sparse points are converted to dense points using cubic bezier curves
  - Default: 10 interpolated points per segment between user-placed points
  - Tension factor: 0.5 for smooth natural curves
- **Benefits**:
  - Consistent rendering between Track Builder preview and Game
  - Dense point arrays ready for efficient collision detection
  - Smooth curves without runtime bezier calculations
  - Original sparse points preserved for editing
- **Resolution**: Both Track Builder and Game use 1280x720 canvas for 1:1 coordinate mapping

## Next Steps
1. ✅ ~~Integrate Phaser 3 into Game component~~ - COMPLETED
2. ✅ ~~Add track selection UI in Game component~~ - COMPLETED
3. ✅ ~~Implement car physics and controls in Game~~ - COMPLETED
4. ✅ ~~Add continuous timer to track driving time~~ - COMPLETED
5. Add collision detection with track borders using dense point arrays
6. Add lap timing and checkpoints system

# SUPER IMPORTANT

DO NOT RUN DEV SERVERS AT ALL. AUTOMATED TESTING IS OUT OF YOUR SCOPE.
