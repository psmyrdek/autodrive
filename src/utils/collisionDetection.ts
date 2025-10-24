import type { Point } from '../types/track';

/**
 * Point-in-polygon algorithm using ray casting
 * Returns true if point is inside the polygon
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Get the 4 corners of a rotated rectangle
 */
function getCarCorners(
  carX: number,
  carY: number,
  width: number,
  height: number,
  rotation: number
): Point[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Calculate corners relative to center (before rotation)
  const corners = [
    { x: halfWidth, y: halfHeight },   // Bottom-right
    { x: halfWidth, y: -halfHeight },  // Top-right
    { x: -halfWidth, y: -halfHeight }, // Top-left
    { x: -halfWidth, y: halfHeight },  // Bottom-left
  ];

  // Rotate and translate corners to world position
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return corners.map(corner => ({
    x: carX + (corner.x * cos - corner.y * sin),
    y: carY + (corner.x * sin + corner.y * cos),
  }));
}

/**
 * Check if car (rectangular bounds) collides with track borders
 * Car should be inside outer border and outside inner border
 * Checks all 4 corners of the car
 */
export function checkCarCollision(
  carX: number,
  carY: number,
  carWidth: number,
  carHeight: number,
  carRotation: number,
  outerBorder: Point[],
  innerBorder: Point[]
): boolean {
  // Get all 4 corners of the car
  const corners = getCarCorners(carX, carY, carWidth, carHeight, carRotation);

  // Check if any corner is outside the outer border or inside the inner border
  for (const corner of corners) {
    // Check if corner is outside the outer border (collision)
    const insideOuter = isPointInPolygon(corner, outerBorder);
    if (!insideOuter) {
      return true; // Collision: car corner went outside track
    }

    // Check if corner is inside the inner border (collision)
    const insideInner = isPointInPolygon(corner, innerBorder);
    if (insideInner) {
      return true; // Collision: car corner went into inner barrier
    }
  }

  return false; // No collision
}
