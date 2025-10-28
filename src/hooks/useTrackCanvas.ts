import {useEffect, useRef, RefObject} from "react";
import type {Point, Obstacle} from "../types/track";
import {BORDER_COLORS, BORDER_LINE_WIDTH} from "../utils/trackBorderStyles";

const drawSmoothCurve = (
  ctx: CanvasRenderingContext2D,
  points: Point[],
  closed: boolean
) => {
  if (points.length < 3) return;

  const tension = 0.5;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? (closed ? points.length - 1 : 0) : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 =
      points[
        i + 2 >= points.length
          ? closed
            ? (i + 2) % points.length
            : points.length - 1
          : i + 2
      ];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  if (closed) {
    // Close the path
    const p0 = points[points.length - 2];
    const p1 = points[points.length - 1];
    const p2 = points[0];
    const p3 = points[1];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
};

const drawPath = (
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  isComplete: boolean
) => {
  if (points.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = BORDER_LINE_WIDTH.canvas;
  ctx.fillStyle = color;
  ctx.setLineDash([]);

  // Draw control points
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw lines/curves
  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (isComplete && points.length > 2) {
      // Draw smooth cubic bezier curves
      drawSmoothCurve(ctx, points, true);
    } else {
      // Draw straight lines for incomplete paths
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }

    ctx.stroke();
  }
};

export interface CanvasRenderOptions {
  outerBorder: Point[];
  innerBorder: Point[];
  startPoint: Point | null;
  obstacles: Obstacle[];
  currentObstacleStart: Point | null;
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  textureUrl?: string | null;
}

export function useTrackCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: CanvasRenderOptions
) {
  const {
    outerBorder,
    innerBorder,
    startPoint,
    obstacles,
    currentObstacleStart,
    isOuterComplete,
    isInnerComplete,
    textureUrl,
  } = options;

  // Cache loaded images to prevent re-loading on every render
  const baseLayerImgRef = useRef<HTMLImageElement | null>(null);
  const textureImgRef = useRef<HTMLImageElement | null>(null);
  const currentTextureUrlRef = useRef<string | null>(null);

  // Load base layer image once
  useEffect(() => {
    if (!baseLayerImgRef.current) {
      const img = new Image();
      img.src = "/server/assets/track-base-layer.png";
      baseLayerImgRef.current = img;
    }
  }, []);

  // Load texture image when textureUrl changes
  useEffect(() => {
    if (textureUrl && textureUrl !== currentTextureUrlRef.current) {
      const img = new Image();
      img.src = `/public/tracks/${textureUrl}`;
      textureImgRef.current = img;
      currentTextureUrlRef.current = textureUrl;
    } else if (!textureUrl) {
      textureImgRef.current = null;
      currentTextureUrlRef.current = null;
    }
  }, [textureUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw base layer if loaded
      if (baseLayerImgRef.current?.complete) {
        ctx.drawImage(
          baseLayerImgRef.current,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      // Draw generated texture if loaded
      if (textureImgRef.current?.complete) {
        ctx.drawImage(textureImgRef.current, 0, 0, canvas.width, canvas.height);
      }

      // Draw all elements on top
      drawAllElements();
    };

    // Set up image load listeners if images aren't loaded yet
    if (baseLayerImgRef.current && !baseLayerImgRef.current.complete) {
      baseLayerImgRef.current.onload = render;
    }
    if (textureImgRef.current && !textureImgRef.current.complete) {
      textureImgRef.current.onload = render;
    }

    // Initial render
    render();

    function drawAllElements() {
      // Draw outer border (solid blue)
      if (outerBorder.length > 0) {
        drawPath(ctx, outerBorder, BORDER_COLORS.canvas.outer, isOuterComplete);
      }

      // Draw inner border (solid red)
      if (innerBorder.length > 0) {
        drawPath(ctx, innerBorder, BORDER_COLORS.canvas.inner, isInnerComplete);
      }

      // Draw start point
      if (startPoint) {
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw obstacles
      obstacles.forEach((obstacle) => {
        ctx.strokeStyle = "#f97316"; // Orange
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(obstacle.start.x, obstacle.start.y);
        ctx.lineTo(obstacle.end.x, obstacle.end.y);
        ctx.stroke();

        // Draw endpoint circles
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(obstacle.start.x, obstacle.start.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obstacle.end.x, obstacle.end.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw current obstacle being created
      if (currentObstacleStart) {
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(
          currentObstacleStart.x,
          currentObstacleStart.y,
          5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }, [
    outerBorder,
    innerBorder,
    startPoint,
    obstacles,
    currentObstacleStart,
    isOuterComplete,
    isInnerComplete,
    textureUrl,
    canvasRef,
  ]);
}
