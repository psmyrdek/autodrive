import {useState, useRef} from "react";
import type {Point, Obstacle} from "../types/track";

type DrawingTool = "drag-line" | "start-point" | "obstacles";

export interface TrackDrawingState {
  outerBorder: Point[];
  innerBorder: Point[];
  startPoint: Point | null;
  obstacles: Obstacle[];
  currentObstacleStart: Point | null;
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  currentTool: DrawingTool;
  centerline: Point[];
  isDrawing: boolean;
  trackWidth: number;
}

export interface TrackDrawingHandlers {
  setCurrentTool: (tool: DrawingTool) => void;
  handleCanvasClick: (x: number, y: number) => void;
  handleMouseMove: (x: number, y: number) => void;
  clear: () => void;
  loadTrack: (
    outerBorder: Point[],
    innerBorder: Point[],
    startPoint: Point,
    obstacles: Obstacle[]
  ) => void;
}

// Helper function to calculate perpendicular offset points
const calculateParallelBorders = (
  centerline: Point[],
  width: number
): {outer: Point[]; inner: Point[]} => {
  if (centerline.length < 2) {
    return {outer: [], inner: []};
  }

  const outer: Point[] = [];
  const inner: Point[] = [];
  const halfWidth = width / 2;

  for (let i = 0; i < centerline.length; i++) {
    const current = centerline[i];
    let tangentX = 0;
    let tangentY = 0;

    // Calculate tangent vector
    if (i === 0) {
      // First point: use direction to next point
      tangentX = centerline[1].x - current.x;
      tangentY = centerline[1].y - current.y;
    } else if (i === centerline.length - 1) {
      // Last point: use direction from previous point
      tangentX = current.x - centerline[i - 1].x;
      tangentY = current.y - centerline[i - 1].y;
    } else {
      // Middle points: average of incoming and outgoing directions
      tangentX = centerline[i + 1].x - centerline[i - 1].x;
      tangentY = centerline[i + 1].y - centerline[i - 1].y;
    }

    // Normalize tangent
    const length = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
    if (length > 0) {
      tangentX /= length;
      tangentY /= length;
    }

    // Perpendicular is (-tangentY, tangentX) for right side and (tangentY, -tangentX) for left
    const perpX = -tangentY;
    const perpY = tangentX;

    // Create outer and inner points (swapped to fix geometry)
    inner.push({
      x: current.x + perpX * halfWidth,
      y: current.y + perpY * halfWidth,
    });
    outer.push({
      x: current.x - perpX * halfWidth,
      y: current.y - perpY * halfWidth,
    });
  }

  return {outer, inner};
};

export function useTrackDrawing() {
  const [currentTool, setCurrentTool] = useState<DrawingTool>("drag-line");
  const [outerBorder, setOuterBorder] = useState<Point[]>([]);
  const [innerBorder, setInnerBorder] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [currentObstacleStart, setCurrentObstacleStart] = useState<Point | null>(
    null
  );
  const [isOuterComplete, setIsOuterComplete] = useState(false);
  const [isInnerComplete, setIsInnerComplete] = useState(false);
  const [centerline, setCenterline] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [trackWidth] = useState(80); // Fixed width
  const lastSampleTime = useRef<number>(0);
  const MIN_SAMPLE_INTERVAL = 100; // 10fps sampling rate (50% less frequent)
  const MIN_SAMPLE_DISTANCE = 24; // 24px minimum distance between points

  const handleMouseMove = (x: number, y: number) => {
    // Only add points to centerline when actively drawing
    if (!isDrawing || currentTool !== "drag-line") return;

    const now = Date.now();
    // Sample at regular intervals
    if (now - lastSampleTime.current >= MIN_SAMPLE_INTERVAL) {
      if (centerline.length === 0) {
        // First point when starting to draw
        setCenterline([{x, y}]);
        lastSampleTime.current = now;
      } else {
        const lastPoint = centerline[centerline.length - 1];
        const distance = Math.sqrt(
          (x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2
        );

        // Only add point if moved minimum distance to avoid clustering
        if (distance >= MIN_SAMPLE_DISTANCE) {
          setCenterline([...centerline, {x, y}]);
          lastSampleTime.current = now;
        }
      }
    }
  };

  const handleCanvasClick = (x: number, y: number) => {
    if (currentTool === "drag-line") {
      if (!isDrawing) {
        // First click: Start drawing
        setIsDrawing(true);
        setCenterline([{x, y}]);
        lastSampleTime.current = Date.now();
      } else {
        // Second click: Finish track
        if (centerline.length >= 2) {
          const {outer, inner} = calculateParallelBorders(centerline, trackWidth);
          setOuterBorder(outer);
          setInnerBorder(inner);
          setIsOuterComplete(true);
          setIsInnerComplete(true);
          setIsDrawing(false);
          setCenterline([]);
          setCurrentTool("start-point");
        }
      }
    } else if (currentTool === "start-point") {
      setStartPoint({x, y});
    } else if (currentTool === "obstacles") {
      if (!currentObstacleStart) {
        // First click: set start point
        setCurrentObstacleStart({x, y});
      } else {
        // Second click: create obstacle
        setObstacles([
          ...obstacles,
          {start: currentObstacleStart, end: {x, y}},
        ]);
        setCurrentObstacleStart(null);
      }
    }
  };

  const clear = () => {
    setOuterBorder([]);
    setInnerBorder([]);
    setStartPoint(null);
    setObstacles([]);
    setCurrentObstacleStart(null);
    setIsOuterComplete(false);
    setIsInnerComplete(false);
    setCenterline([]);
    setIsDrawing(false);
    setCurrentTool("drag-line");
  };

  const loadTrack = (
    loadedOuterBorder: Point[],
    loadedInnerBorder: Point[],
    loadedStartPoint: Point,
    loadedObstacles: Obstacle[]
  ) => {
    setOuterBorder(loadedOuterBorder);
    setInnerBorder(loadedInnerBorder);
    setStartPoint(loadedStartPoint);
    setObstacles(loadedObstacles);
    setCurrentObstacleStart(null);
    setIsOuterComplete(true);
    setIsInnerComplete(true);
  };

  const state: TrackDrawingState = {
    outerBorder,
    innerBorder,
    startPoint,
    obstacles,
    currentObstacleStart,
    isOuterComplete,
    isInnerComplete,
    currentTool,
    centerline,
    isDrawing,
    trackWidth,
  };

  const handlers: TrackDrawingHandlers = {
    setCurrentTool: (tool: DrawingTool) => {
      setCurrentTool(tool);
      if (tool === "obstacles") {
        setCurrentObstacleStart(null);
      }
    },
    handleCanvasClick,
    handleMouseMove,
    clear,
    loadTrack,
  };

  return {state, handlers};
}
