import {createCanvas, loadImage} from "canvas";
import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Draws smooth curve on canvas using cubic bezier (matches frontend logic)
 */
const drawSmoothCurve = (ctx, points, closed) => {
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

/**
 * Draws a path (border line) on canvas with smooth curves
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array<{x: number, y: number}>} points - Border points
 * @param {string} color - Stroke color
 * @param {boolean} isComplete - Whether path is complete (closed)
 * @param {boolean} dashed - Whether to draw dashed line (default: false)
 */
const drawPath = (ctx, points, color, isComplete, dashed = false) => {
  if (points.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.fillStyle = color;

  // Set line dash pattern if needed
  if (dashed) {
    ctx.setLineDash([10, 5]); // 10px dash, 5px gap
  } else {
    ctx.setLineDash([]);
  }

  // Draw points (only if not dashed)
  if (!dashed) {
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

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

  // Reset line dash
  ctx.setLineDash([]);
};

/**
 * Render a base image with track borders visible
 * This shows the outer and inner borders as dashed white lines on top of the base layer texture
 * @param {Array<{x: number, y: number}>} outerBorder - Outer border points
 * @param {Array<{x: number, y: number}>} innerBorder - Inner border points
 * @param {number} width - Canvas width (default: 1280)
 * @param {number} height - Canvas height (default: 720)
 * @returns {Promise<Buffer>} - PNG buffer of the base image
 */
export async function renderBordersBaseImage(
  outerBorder,
  innerBorder,
  width = 1280,
  height = 720
) {
  try {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Load and draw the base layer texture
    const baseLayerPath = path.join(__dirname, "assets", "track-base-layer.png");
    if (!fs.existsSync(baseLayerPath)) {
      throw new Error(
        "Base layer image not found at server/assets/track-base-layer.png"
      );
    }

    const baseImage = await loadImage(baseLayerPath);
    ctx.drawImage(baseImage, 0, 0, width, height);

    // Draw outer border (solid white)
    if (outerBorder && outerBorder.length > 0) {
      drawPath(ctx, outerBorder, "#ffffff", true, false);
    }

    // Draw inner border (dashed white)
    if (innerBorder && innerBorder.length > 0) {
      drawPath(ctx, innerBorder, "#ffffff", true, true);
    }

    // Return as PNG buffer
    const buffer = canvas.toBuffer("image/png");
    return buffer;
  } catch (error) {
    console.error("Error rendering borders base image:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Render a mask from track points
 * The mask has white track area on black background (for Flux Fill)
 * @param {Array<{x: number, y: number}>} outerBorder - Outer border points
 * @param {Array<{x: number, y: number}>} innerBorder - Inner border points
 * @param {number} width - Canvas width (default: 1280)
 * @param {number} height - Canvas height (default: 720)
 * @returns {Buffer} - PNG buffer of the mask
 */
export function renderMask(
  outerBorder,
  innerBorder,
  width = 1280,
  height = 720
) {
  try {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Fill track area (between borders) with white using even-odd fill rule
    if (outerBorder.length > 2 && innerBorder.length > 2) {
      ctx.fillStyle = "#ffffff"; // White for track area
      ctx.beginPath();

      // Draw outer border path (clockwise)
      ctx.moveTo(outerBorder[0].x, outerBorder[0].y);
      drawSmoothCurve(ctx, outerBorder, true);
      ctx.closePath();

      // Draw inner border path (counter-clockwise by reversing)
      const reversedInner = [...innerBorder].reverse();
      ctx.moveTo(reversedInner[0].x, reversedInner[0].y);
      drawSmoothCurve(ctx, reversedInner, true);
      ctx.closePath();

      // Fill using even-odd rule (creates "donut" shape)
      ctx.fill("evenodd");
    } else {
      console.warn("Not enough points to draw track:", {
        outer: outerBorder.length,
        inner: innerBorder.length,
      });
    }

    // Return as PNG buffer
    const buffer = canvas.toBuffer("image/png");
    return buffer;
  } catch (error) {
    console.error("Error rendering mask:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}
