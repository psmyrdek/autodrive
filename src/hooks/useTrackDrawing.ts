import {useState} from "react";
import type {Point, Obstacle} from "../types/track";

type DrawingTool = "outer-border" | "inner-border" | "start-point" | "obstacles";

export interface TrackDrawingState {
  outerBorder: Point[];
  innerBorder: Point[];
  startPoint: Point | null;
  obstacles: Obstacle[];
  currentObstacleStart: Point | null;
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  currentTool: DrawingTool;
}

export interface TrackDrawingHandlers {
  setCurrentTool: (tool: DrawingTool) => void;
  handleCanvasClick: (x: number, y: number) => void;
  handleCanvasDoubleClick: () => void;
  clear: () => void;
  loadTrack: (
    outerBorder: Point[],
    innerBorder: Point[],
    startPoint: Point,
    obstacles: Obstacle[]
  ) => void;
}

export function useTrackDrawing() {
  const [currentTool, setCurrentTool] = useState<DrawingTool>("outer-border");
  const [outerBorder, setOuterBorder] = useState<Point[]>([]);
  const [innerBorder, setInnerBorder] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [currentObstacleStart, setCurrentObstacleStart] = useState<Point | null>(
    null
  );
  const [isOuterComplete, setIsOuterComplete] = useState(false);
  const [isInnerComplete, setIsInnerComplete] = useState(false);

  const handleCanvasClick = (x: number, y: number) => {
    if (currentTool === "outer-border" && !isOuterComplete) {
      setOuterBorder([...outerBorder, {x, y}]);
    } else if (currentTool === "inner-border" && !isInnerComplete) {
      setInnerBorder([...innerBorder, {x, y}]);
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

  const handleCanvasDoubleClick = () => {
    if (currentTool === "outer-border" && outerBorder.length > 2) {
      setIsOuterComplete(true);
      setCurrentTool("inner-border");
    } else if (currentTool === "inner-border" && innerBorder.length > 2) {
      setIsInnerComplete(true);
      setCurrentTool("start-point");
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
    setCurrentTool("outer-border");
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
  };

  const handlers: TrackDrawingHandlers = {
    setCurrentTool: (tool: DrawingTool) => {
      setCurrentTool(tool);
      if (tool === "obstacles") {
        setCurrentObstacleStart(null);
      }
    },
    handleCanvasClick,
    handleCanvasDoubleClick,
    clear,
    loadTrack,
  };

  return {state, handlers};
}
