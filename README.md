# AutoDrive

A 2D driving game with a visual track builder and telemetry collection system. Built with React, TypeScript, Phaser 3, and Express.

## Features

- **Playable Game**: Drive a car around custom tracks with arcade-style physics
- **Track Builder**: Visual canvas-based editor for creating custom racing tracks
- **Distance Sensors**: Three radar rays detect obstacles and track boundaries
- **Telemetry Collection**: Record gameplay data (inputs, sensor readings) for analysis
- **Timer**: Track your lap times and performance

## Quick Start

### Prerequisites
- Node.js (see `.node-version` for required version)
- npm

### Installation
```bash
npm install
```

### Running the Application
```bash
npm run dev:all
```

This starts both:
- Frontend on http://localhost:5173
- Backend API on http://localhost:3001

### Individual Services
```bash
npm run dev          # Frontend only
npm run dev:server   # Backend only
```

## Usage

### Playing the Game
1. Navigate to the Game page
2. Use **WASD** keys to control the car:
   - W: Accelerate
   - S: Brake/Reverse
   - A: Turn left (when moving)
   - D: Turn right (when moving)
3. Stay between the track boundaries
4. Switch tracks using the overlay menu
5. Save telemetry data after crashes for analysis

### Building Tracks
1. Navigate to the Track Builder page
2. Click to place points for the outer boundary
3. Complete the outer boundary, then draw the inner boundary
4. Click to set the starting position
5. Save your track with a unique name

## Tech Stack

- **Frontend**: React 19, TypeScript 5.9, Phaser 3.90, Vite 7.1
- **Styling**: Tailwind CSS 4.1
- **Routing**: react-router-dom 7.9
- **Backend**: Express 4.18
- **Game Engine**: Phaser 3 (canvas-based 2D rendering)

## Project Structure

```
autodrive/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── scenes/            # Phaser game scenes
│   ├── systems/           # Game systems (physics, radar, telemetry)
│   ├── utils/             # Utilities (collision, interpolation)
│   └── types/             # TypeScript type definitions
├── server/                # Backend Express API
│   ├── tracks/            # Saved track JSON files
│   └── telemetry/         # Saved telemetry data
└── public/                # Static assets
```

## Development

### Build for Production
```bash
npm run build
npm run preview
```

### Linting
```bash
npm run lint
```

## Data Files

- **Tracks**: Stored as JSON in `server/tracks/`
- **Telemetry**: Stored as JSON in `server/telemetry/`

Each track includes boundary points, starting position, and interpolated curves for smooth rendering.

## License

[Add license information]
