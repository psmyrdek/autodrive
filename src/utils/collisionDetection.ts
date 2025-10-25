import type { Point, Obstacle } from '../types/track';

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
 * Check if two line segments intersect
 * Line 1: from p1 to p2
 * Line 2: from p3 to p4
 */
function doLineSegmentsIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const denominator =
    (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  // Lines are parallel
  if (denominator === 0) return false;

  const ua =
    ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
    denominator;
  const ub =
    ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
    denominator;

  // Check if intersection point is on both line segments
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Check if any edge of the car intersects with obstacles
 */
function checkObstacleCollision(
  carCorners: Point[],
  obstacles: Obstacle[]
): boolean {
  // Create car edges from corners
  const carEdges: [Point, Point][] = [
    [carCorners[0], carCorners[1]],
    [carCorners[1], carCorners[2]],
    [carCorners[2], carCorners[3]],
    [carCorners[3], carCorners[0]],
  ];

  // Check each car edge against each obstacle
  for (const [edgeStart, edgeEnd] of carEdges) {
    for (const obstacle of obstacles) {
      if (
        doLineSegmentsIntersect(edgeStart, edgeEnd, obstacle.start, obstacle.end)
      ) {
        return true; // Collision detected
      }
    }
  }

  return false; // No collision
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
  innerBorder: Point[],
  obstacles?: Obstacle[]
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

  // Check if car hits any obstacles
  if (obstacles && obstacles.length > 0) {
    if (checkObstacleCollision(corners, obstacles)) {
      return true; // Collision: car hit an obstacle
    }
  }

  return false; // No collision
}
