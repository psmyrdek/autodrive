/**
 * Unified track border styling for both TrackBuilder and GameScene
 * - Outer border: Flashy blue
 * - Inner border: Flashy orange
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
 * - Outer: Flashy blue (cyan)
 * - Inner: Flashy orange
 */
export const BORDER_COLORS: TrackBorderColors = {
  canvas: {
    outer: "#00d9ff", // Flashy cyan/blue
    inner: "#ff6600", // Flashy orange
  },
  phaser: {
    outer: 0x00d9ff, // Flashy cyan/blue
    inner: 0xff6600, // Flashy orange
  },
};

/**
 * Line width constants
 */
export const BORDER_LINE_WIDTH = {
  canvas: 5,
  phaser: 6,
} as const;
