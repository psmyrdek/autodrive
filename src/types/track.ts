export interface Point {
  x: number;
  y: number;
}

export interface Obstacle {
  start: Point;
  end: Point;
}

export interface Track {
  name: string;
  outerBorder: Point[]; // Dense interpolated points for rendering and collision detection
  innerBorder: Point[]; // Dense interpolated points for rendering and collision detection
  startPoint: Point;
  obstacles?: Obstacle[]; // Optional obstacles (lines that cannot be crossed)
  // Sparse points are the original user-placed control points (for editing)
  sparseOuterBorder?: Point[];
  sparseInnerBorder?: Point[];
}
