import {useEffect, useRef, useState, RefObject} from "react";
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
  centerline?: Point[];
  isDrawing?: boolean;
  trackWidth?: number;
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
    centerline = [],
    isDrawing = false,
    trackWidth = 80,
  } = options;

  // Cache loaded texture image to prevent re-loading on every render
  const textureImgRef = useRef<HTMLImageElement | null>(null);
  const currentTextureUrlRef = useRef<string | null>(null);
  const [textureLoadTrigger, setTextureLoadTrigger] = useState(0);

  // Load texture image when textureUrl changes
  useEffect(() => {
    if (textureUrl && textureUrl !== currentTextureUrlRef.current) {
      const img = new Image();
      // In Vite, public/ files are served from root, so use /tracks/ not /public/tracks/
      img.src = `/public/tracks/${textureUrl}`;

      // Add load handler to trigger re-render when image loads
      img.onload = () => {
        console.log(`✅ Texture loaded successfully: ${textureUrl}`);
        setTextureLoadTrigger((prev) => prev + 1);
      };

      // Add error handler for debugging
      img.onerror = (e) => {
        console.error(`❌ Failed to load texture: ${textureUrl}`, e);
        console.error(`   Attempted path: /tracks/${textureUrl}`);
      };

      textureImgRef.current = img;
      currentTextureUrlRef.current = textureUrl;
      console.log(`🎨 Loading texture: ${textureUrl}`);
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
      // Clear canvas to white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw generated texture if loaded (replaces base layer)
      if (textureImgRef.current?.complete) {
        ctx.drawImage(textureImgRef.current, 0, 0, canvas.width, canvas.height);
        console.log(
          `🖼️  Rendering texture on canvas: ${currentTextureUrlRef.current}`
        );
      }

      // Draw all elements on top
      drawAllElements();
    };

    // Render
    render();

    function drawAllElements() {
      // Draw centerline preview while dragging
      if (isDrawing && centerline.length > 0) {
        // Draw centerline
        ctx.strokeStyle = "#9ca3af"; // Gray
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(centerline[0].x, centerline[0].y);
        for (let i = 1; i < centerline.length; i++) {
          ctx.lineTo(centerline[i].x, centerline[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Calculate and draw preview borders
        if (centerline.length >= 2) {
          const halfWidth = trackWidth / 2;
          const previewOuter: Point[] = [];
          const previewInner: Point[] = [];

          for (let i = 0; i < centerline.length; i++) {
            const current = centerline[i];
            let tangentX = 0;
            let tangentY = 0;

            if (i === 0) {
              tangentX = centerline[1].x - current.x;
              tangentY = centerline[1].y - current.y;
            } else if (i === centerline.length - 1) {
              tangentX = current.x - centerline[i - 1].x;
              tangentY = current.y - centerline[i - 1].y;
            } else {
              tangentX = centerline[i + 1].x - centerline[i - 1].x;
              tangentY = centerline[i + 1].y - centerline[i - 1].y;
            }

            const length = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
            if (length > 0) {
              tangentX /= length;
              tangentY /= length;
            }

            const perpX = -tangentY;
            const perpY = tangentX;

            previewOuter.push({
              x: current.x + perpX * halfWidth,
              y: current.y + perpY * halfWidth,
            });
            previewInner.push({
              x: current.x - perpX * halfWidth,
              y: current.y - perpY * halfWidth,
            });
          }

          // Draw preview borders with transparency
          ctx.globalAlpha = 0.5;
          drawPath(ctx, previewOuter, BORDER_COLORS.canvas.outer, false);
          drawPath(ctx, previewInner, BORDER_COLORS.canvas.inner, false);
          ctx.globalAlpha = 1.0;
        }
      }

      // Draw outer border (solid blue)
      if (!isDrawing && outerBorder.length > 0) {
        drawPath(ctx, outerBorder, BORDER_COLORS.canvas.outer, isOuterComplete);
      }

      // Draw inner border (solid red)
      if (!isDrawing && innerBorder.length > 0) {
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
    textureLoadTrigger,
    centerline,
    isDrawing,
    trackWidth,
    canvasRef,
  ]);
}
