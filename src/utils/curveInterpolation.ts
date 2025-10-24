import type { Point } from '../types/track';

/**
 * Evaluates a cubic bezier curve at parameter t (0 to 1)
 */
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/**
 * Interpolates dense points from sparse control points using cubic bezier curves
 * @param sparsePoints - The user-placed points
 * @param pointsPerSegment - Number of interpolated points between each pair of sparse points (default: 10)
 * @param closed - Whether the curve should be closed (default: true)
 * @param tension - Curve tension factor (default: 0.5)
 * @returns Array of dense interpolated points
 */
export function interpolateDensePoints(
  sparsePoints: Point[],
  pointsPerSegment: number = 10,
  closed: boolean = true,
  tension: number = 0.5
): Point[] {
  if (sparsePoints.length < 3) {
    return [...sparsePoints];
  }

  const densePoints: Point[] = [];

  // Interpolate between each consecutive pair of points
  for (let i = 0; i < sparsePoints.length - 1; i++) {
    const p0 = sparsePoints[i === 0 ? (closed ? sparsePoints.length - 1 : 0) : i - 1];
    const p1 = sparsePoints[i];
    const p2 = sparsePoints[i + 1];
    const p3 =
      sparsePoints[
        i + 2 >= sparsePoints.length
          ? closed
            ? (i + 2) % sparsePoints.length
            : sparsePoints.length - 1
          : i + 2
      ];

    // Calculate control points for cubic bezier
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    // Generate points along the bezier curve
    for (let j = 0; j < pointsPerSegment; j++) {
      const t = j / pointsPerSegment;
      const x = cubicBezier(t, p1.x, cp1x, cp2x, p2.x);
      const y = cubicBezier(t, p1.y, cp1y, cp2y, p2.y);
      densePoints.push({ x, y });
    }
  }

  // Handle closing the loop if needed
  if (closed && sparsePoints.length > 2) {
    const p0 = sparsePoints[sparsePoints.length - 2];
    const p1 = sparsePoints[sparsePoints.length - 1];
    const p2 = sparsePoints[0];
    const p3 = sparsePoints[1];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    for (let j = 0; j < pointsPerSegment; j++) {
      const t = j / pointsPerSegment;
      const x = cubicBezier(t, p1.x, cp1x, cp2x, p2.x);
      const y = cubicBezier(t, p1.y, cp1y, cp2y, p2.y);
      densePoints.push({ x, y });
    }
  } else {
    // If not closed, add the last point
    densePoints.push({ ...sparsePoints[sparsePoints.length - 1] });
  }

  return densePoints;
}
