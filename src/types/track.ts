export interface Point {
  x: number;
  y: number;
}

export interface Track {
  name: string;
  outerBorder: Point[]; // Dense interpolated points for rendering and collision detection
  innerBorder: Point[]; // Dense interpolated points for rendering and collision detection
  startPoint: Point;
  // Sparse points are the original user-placed control points (for editing)
  sparseOuterBorder?: Point[];
  sparseInnerBorder?: Point[];
}
