# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoDrive is a browser-based 2D driving game built with Phaser 3. It features arcade-style physics, customizable JSON-defined tracks, and a directional radar system that casts rays at fixed angles from each car corner to measure distances to track borders.

## Development Commands

```bash
# Start development server (opens browser at localhost:8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with UI
npm test:ui
```

## Architecture

### Core Game Loop

The game uses Phaser 3's scene system with a single `GameScene` that orchestrates all game entities:

1. `GameScene` (game/scenes/GameScene.js) loads a track from JSON
2. Track returns starting position, which is used to instantiate the `Car`
3. Phaser's collision system is configured between car and track border physics bodies
4. `Radar` system is initialized with references to both car and track
5. Update loop calls `car.update()` and `radar.update()` each frame

### Entity System

**Car (game/entities/Car.js)**
- Composed of two objects: a graphics object for rendering and a sprite with physics body
- Graphics must be manually synced to physics body position/rotation each frame (see `update()`)
- Corner calculation uses rotation matrix transformation on local corner positions
- Physics: Arcade Physics with velocity-based movement, drag, and max velocity limits
- Controls: WASD (rotation affects movement direction, acceleration applied via `velocityFromRotation`)

**Track (game/entities/Track.js)**
- Loads JSON files defining border point arrays and starting position
- Each border segment becomes both a rendered line and a thin rotated rectangle physics body
- Border segments stored as `{x1, y1, x2, y2}` for radar intersection calculations
- Uses Phaser's `staticGroup` for collision optimization

### Radar System (game/utils/Radar.js)

**Critical implementation details:**
- Casts rays at **fixed angles relative to car's forward direction**, not perpendicular to car's edges
- Ray angles: Front-right (+45°), Front-left (-45°), Back-left (+135°), Back-right (-135°)
- Uses parametric ray-line segment intersection algorithm (not distance to line)
- Updates on fixed interval (default 0.5s), not every frame
- Visualization includes yellow direction indicators showing ray angles

**Ray-segment intersection:**
- Solves `origin + t*rayDir = segment_start + s*segDir`
- Valid when `t >= 0` (forward ray) and `0 <= s <= 1` (on segment)
- Returns closest intersection point among all border segments

### Configuration

All tunable parameters live in `game/config.js`:
- Car physics (maxSpeed, acceleration, drag, rotationSpeed)
- Radar settings (updateInterval, visualization colors)
- Display dimensions (width, height)

To change the active track, modify line 15 of `GameScene.js`.

### Track Format

Tracks are JSON files in `game/tracks/` with structure:
```json
{
  "name": "Track Name",
  "startPosition": {"x": 600, "y": 400, "angle": 0},
  "borders": [
    {"points": [[x1,y1], [x2,y2], ...]}
  ]
}
```

Points form closed polygons (automatically connected back to start). Multiple borders supported for inner/outer boundaries.

## Key Technical Constraints

1. **Car rendering**: Graphics object is separate from physics sprite. Always update graphics.x/y/rotation in car.update() to match body position.

2. **Radar angles are NOT perpendicular**: They're at 45° diagonals relative to forward direction. This is intentional for the game's sensor simulation design.

3. **Physics system**: Uses Arcade Physics (not Matter.js). Border collisions work via thin static rectangles, not line collisions.

4. **Module system**: Project uses ES6 modules. All files must use explicit .js extensions in import statements.

5. **Async track loading**: Car creation happens inside Track.load() promise callback, not in GameScene.create().

## Testing

Tests run with Vitest in jsdom environment. Test files should be named `*.test.js` (none currently exist).
- Do not start dev server to test features - I'm already running one. Just ask for feedback once you're done with task