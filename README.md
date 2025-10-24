# AutoDrive - 2D Driving Game

A browser-based 2D driving game built with Phaser 3, featuring realistic arcade-style physics, customizable tracks, and a radar system for distance measurements.

## Features

- **Arcade-Style Physics**: Simplified but realistic car movement with acceleration, momentum, and rotation
- **WASD Controls**:
  - W - Accelerate
  - S - Brake/Reverse
  - A - Turn Left
  - D - Turn Right
- **Radar System**: Measures distance from each car corner to the nearest border every 0.5 seconds
- **Visual Feedback**: Green rays showing radar measurements with distance indicators
- **Collision Detection**: Car stops when hitting track boundaries
- **Customizable Tracks**: Load different tracks from JSON files

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. The game will open automatically in your browser at `http://localhost:8080`

## Project Structure

```
autodrive/
├── index.html              # Main HTML page
├── package.json            # Dependencies
├── game/
│   ├── main.js            # Game initialization
│   ├── config.js          # Configuration parameters
│   ├── scenes/
│   │   └── GameScene.js   # Main game scene
│   ├── entities/
│   │   ├── Car.js         # Car entity with physics
│   │   └── Track.js       # Track loader and renderer
│   ├── utils/
│   │   └── Radar.js       # Radar distance system
│   └── tracks/
│       ├── track1.json    # Simple rectangular track
│       ├── track2.json    # Oval track with inner border
│       └── track3.json    # Complex circuit
```

## Creating Custom Tracks

Create a JSON file in `game/tracks/` with the following format:

```json
{
  "name": "Track Name",
  "startPosition": {
    "x": 100,
    "y": 100,
    "angle": 0
  },
  "borders": [
    {
      "points": [
        [x1, y1],
        [x2, y2],
        [x3, y3],
        ...
      ]
    }
  ]
}
```

- **startPosition**: Where the car spawns (x, y coordinates and angle in degrees)
- **borders**: Array of border objects, each containing an array of points
- **points**: Coordinates that will be connected to form the track boundaries

To load a different track, modify `GameScene.js` line 15 to load your track file.

## Configuration

Edit `game/config.js` to adjust game parameters:

### Car Parameters
- `maxSpeed`: Maximum car velocity (default: 200)
- `acceleration`: Acceleration rate (default: 150)
- `drag`: Deceleration when not accelerating (default: 100)
- `rotationSpeed`: How fast the car turns in degrees/second (default: 180)
- `reverseSpeedMultiplier`: Reverse speed relative to forward (default: 0.6)

### Radar Parameters
- `updateInterval`: How often radar scans in seconds (default: 0.5)
- `rayColor`: Color of radar visualization rays (default: green)
- `showDistanceText`: Display distance numbers on canvas (default: true)

### Display Settings
- `width`: Game canvas width (default: 1200)
- `height`: Game canvas height (default: 800)

## How It Works

### Car Physics
The car uses Phaser's Arcade Physics system with:
- Velocity-based movement with drag
- Rotation-based directional control
- Acceleration applied in the direction the car is facing

### Radar System
Every 0.5 seconds (configurable):
1. Calculates the 4 corner positions of the car
2. For each corner, finds the distance to the nearest border segment
3. Uses point-to-line-segment distance calculation
4. Logs distances to console
5. Draws visual rays from corners to nearest border points

### Collision Detection
- Track borders are converted into thin physics rectangles
- Phaser's collision system detects and prevents car from passing through borders
- Car maintains momentum but stops at walls

## Development

The game uses ES6 modules and requires a local server to run. The included `http-server` package handles this automatically when you run `npm run dev`.

## Browser Compatibility

Works in all modern browsers that support:
- ES6 modules
- HTML5 Canvas
- Phaser 3

Tested in:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
