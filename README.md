# AutoDrive

A 2D driving game with a visual track builder, built with React, TypeScript, and Vite.

## Features

### Track Builder
- Canvas-based track drawing interface
- Three drawing tools:
  - **Outer Border** (blue) - Define the outer boundary of the track
  - **Inner Border** (red) - Define the inner boundary of the track
  - **Start Point** (green) - Place the car starting position
- Point-by-point drawing with single-click
- Double-click to complete and apply cubic bezier curve smoothing
- Save tracks to the filesystem as JSON
- Load and edit previously saved tracks

### Game (Coming Soon)
- Play on custom-built tracks
- Car physics and controls
- Collision detection with track borders

## Getting Started

### Installation

```bash
npm install
```

### Running the Application

Start both frontend and backend servers:
```bash
npm run dev:all
```

This will start:
- Frontend (Vite): http://localhost:5173
- Backend API (Express): http://localhost:3001

Alternatively, run servers separately:
```bash
# Frontend only
npm run dev

# Backend only
npm run dev:server
```

## How to Use Track Builder

1. Navigate to `/track-builder` in the app
2. Enter a name for your track
3. **Draw Outer Border**: Click points around the canvas, double-click to complete
4. **Draw Inner Border**: Click points for the inner boundary, double-click to complete
5. **Place Start Point**: Single-click to place the car starting position
6. Click **Save Track** to persist to the filesystem
7. View saved tracks in the sidebar and click to load them for editing

## Tech Stack

- **Frontend**: React 19.1.1, TypeScript 5.9.3, Tailwind CSS 4.1.16
- **Build Tool**: Vite 7.1.7
- **Backend**: Express 4.18.2
- **Routing**: react-router-dom 7.9.4

## Project Structure

```
src/
├── components/
│   ├── Navigation.tsx    # Top navigation bar
│   ├── Game.tsx          # Game component (placeholder)
│   └── TrackBuilder.tsx  # Track Builder with canvas drawing
├── types/
│   └── track.ts          # Shared type definitions
├── App.tsx               # Router configuration
└── main.tsx              # App entry point

server/
└── index.js              # Express API server

tracks/                   # Persisted track JSON files
```

## API Endpoints

- `GET /api/tracks` - List all saved tracks
- `GET /api/tracks/:name` - Get a specific track by name
- `POST /api/tracks` - Save a new track
- `DELETE /api/tracks/:name` - Delete a track

## Development

For detailed development notes, see [CLAUDE.md](./CLAUDE.md).
