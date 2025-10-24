<!-- b7df9201-cbb7-49b2-af7c-3de7ff7d206e dacf6be7-db8a-4c11-a18b-34d834ca4879 -->
# 2D Driving Game Implementation Plan

## Technology Stack

- **Phaser 3** - Popular, free HTML5 game framework
- **HTML5 Canvas** - Rendering via Phaser
- **Vanilla JavaScript/TypeScript** - Game logic
- **JSON** - Track definition files

## Core Components

### 1. Project Setup

Create the basic file structure:

- `index.html` - Main HTML page with canvas
- `game/main.js` - Phaser game initialization and configuration
- `game/scenes/GameScene.js` - Main game scene
- `game/entities/Car.js` - Car class with physics and controls
- `game/entities/Track.js` - Track class to load and render borders
- `game/utils/Radar.js` - Radar system for distance measurements
- `game/tracks/*.json` - Track definition files
- `package.json` - Dependencies (Phaser 3)

### 2. Track System (`game/entities/Track.js`)

**JSON Format:**

```json
{
  "name": "Track 1",
  "startPosition": { "x": 100, "y": 100, "angle": 0 },
  "borders": [
    { "points": [[x1, y1], [x2, y2], [x3, y3], ...] }
  ]
}
```

**Implementation:**

- Load JSON track files
- Render borders as graphics (lines connecting points)
- Create physics bodies for collision detection using Phaser's Matter.js or Arcade Physics
- Store border line segments for radar calculations

### 3. Car Entity (`game/entities/Car.js`)

**Visual:**

- Black rectangle (e.g., 40x20 pixels) with white outline
- Store 4 corner positions relative to center

**Physics (Arcade-style):**

- WASD controls: W=accelerate, S=brake/reverse, A=turn left, D=turn right
- Rotation based on A/D keys
- Acceleration/deceleration with max speed limits
- Simple momentum (no complex tire physics)

**Controls:**

- W: Apply forward acceleration
- S: Apply backward acceleration / braking
- A/D: Rotate car (rotation speed depends on velocity)

### 4. Radar System (`game/utils/Radar.js`)

**Functionality:**

- Timer that fires every 0.5s (configurable parameter)
- Calculate 4 corner positions of car rectangle
- Cast rays from each corner to all border segments
- Find nearest intersection point for each corner
- Calculate distance to nearest border

**Display:**

- Console log: "Corner [1-4]: distance to nearest border"
- Visual overlay: Draw lines from corners to nearest border points
- Optional: Display distance numbers on canvas

### 5. Collision Detection

- Use Phaser's built-in collision system
- When car body collides with border physics bodies:
  - Stop/reverse momentum
  - Prevent movement through walls
  - Optional: small bounce-back effect

### 6. Game Scene (`game/scenes/GameScene.js`)

**Setup:**

- Initialize Phaser scene
- Load track JSON
- Create Track instance and render borders
- Create Car instance at starting position
- Initialize Radar system
- Setup WASD key listeners

**Update Loop:**

- Update car physics based on input
- Check collisions
- Update radar visualization
- Update camera to follow car (optional)

## File Structure

```
/Users/psmyrdek/dev/ml-projects/autodrive/
├── index.html
├── package.json
├── game/
│   ├── main.js
│   ├── config.js
│   ├── scenes/
│   │   └── GameScene.js
│   ├── entities/
│   │   ├── Car.js
│   │   └── Track.js
│   ├── utils/
│   │   └── Radar.js
│   └── tracks/
│       ├── track1.json
│       └── track2.json
```

## Implementation Order

1. Setup HTML structure and Phaser initialization
2. Create basic GameScene with placeholder graphics
3. Implement Car entity with WASD controls and arcade physics
4. Implement Track loader and border rendering
5. Add collision detection between car and borders
6. Implement Radar system with distance calculations
7. Add visual radar display overlay
8. Create sample track JSON files
9. Polish and parameter tuning

## Key Parameters

- Radar update interval: 0.5s (configurable in `config.js`)
- Car max speed: ~200 (tunable)
- Car acceleration: ~150 (tunable)
- Car rotation speed: ~180 degrees/second (tunable)
- Car dimensions: 40x20 pixels (tunable)

### To-dos

- [ ] Create project structure with HTML, package.json, and Phaser initialization
- [ ] Create GameScene with basic setup and update loop
- [ ] Build Car entity with WASD controls and arcade-style physics
- [ ] Build Track loader with JSON parsing and border rendering
- [ ] Implement collision detection between car and track borders
- [ ] Build Radar system with distance calculations and visual/console output
- [ ] Create sample track JSON files for testing