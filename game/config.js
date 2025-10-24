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
    rotationSpeed: 180, // degrees per second
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
    borderWidth: 3,
  },
};
