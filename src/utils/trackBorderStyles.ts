/**
 * Unified track border styling for both TrackBuilder and GameScene
 * - Outer border: Solid blue
 * - Inner border: Solid red
 */

export interface TrackBorderColors {
  canvas: {
    outer: string;
    inner: string;
  };
  phaser: {
    outer: number;
    inner: number;
  };
}

/**
 * Unified border colors
 * - Outer: Blue (royal blue)
 * - Inner: Red (crimson)
 */
export const BORDER_COLORS: TrackBorderColors = {
  canvas: {
    outer: "#4a5568", // Dark gray
    inner: "#4a5568", // Dark gray
  },
  phaser: {
    outer: 0x4a5568, // Dark gray
    inner: 0x4a5568, // Dark gray
  },
};

/**
 * Line width constants
 */
export const BORDER_LINE_WIDTH = {
  canvas: 3,
  phaser: 4,
} as const;
