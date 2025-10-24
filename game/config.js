// Game configuration parameters
export const GameConfig = {
  // Display settings
  width: 1200,
  height: 800,
  backgroundColor: "#2d2d2d",

  // Car parameters
  car: {
    width: 40,
    height: 20,
    maxSpeed: 200,
    acceleration: 150,
    drag: 100,
    maxWheelAngle: 30, // maximum steering angle in degrees
    wheelTurnSpeed: 120, // degrees per second
    wheelReturnSpeed: 180, // how fast wheels return to center when not steering
    reverseSpeedMultiplier: 0.6,
  },

  // Radar parameters
  radar: {
    updateInterval: 0.5, // seconds
    rayColor: 0x00ff00,
    rayAlpha: 0.6,
    rayWidth: 2,
    showDistanceText: true,
  },

  // Track parameters
  track: {
    borderColor: 0xffffff,
    outerBorderColor: 0xff0000, // Red for outer walls
    innerBorderColor: 0xffffff, // White for inner walls
    borderWidth: 3,
  },
};
