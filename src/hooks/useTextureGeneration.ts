import {useState, RefObject} from "react";
import type {Point} from "../types/track";

export interface TextureGenerationState {
  generatedTexture: string | null;
  isGenerating: boolean;
  error: string | null;
}

export interface TextureGenerationHandlers {
  generateTexture: (
    canvasRef: RefObject<HTMLCanvasElement | null>,
    trackName: string,
    outerBorder: Point[],
    innerBorder: Point[],
    isOuterComplete: boolean,
    isInnerComplete: boolean
  ) => Promise<string | null>;
  clearTexture: () => void;
  setTexture: (texture: string | null) => void;
}

/**
 * Draws smooth curve on canvas (cubic bezier)
 */
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
 * Renders track as gray solid shape (fills area between borders) on a temporary canvas
 */
const renderTrackOutline = (
  width: number,
  height: number,
  outerBorder: Point[],
  innerBorder: Point[]
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Fill track area (between borders) with gray using even-odd fill rule
  if (outerBorder.length > 2 && innerBorder.length > 2) {
    ctx.fillStyle = "#808080"; // Gray color
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
  }

  return canvas;
};

export function useTextureGeneration() {
  const [generatedTexture, setGeneratedTexture] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTexture = async (
    canvasRef: RefObject<HTMLCanvasElement | null>,
    trackName: string,
    outerBorder: Point[],
    innerBorder: Point[],
    isOuterComplete: boolean,
    isInnerComplete: boolean
  ): Promise<string | null> => {
    // Validation
    if (!trackName.trim()) {
      setError("Please enter a track name before generating texture");
      return null;
    }

    if (!isOuterComplete || !isInnerComplete) {
      setError(
        "Please complete both outer and inner borders before generating texture"
      );
      return null;
    }

    if (!canvasRef.current) {
      setError("Canvas not available");
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Send track points to backend
      const response = await fetch("/api/tracks/generate-texture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outerBorder,
          innerBorder,
          trackName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to generate texture");
      }

      const data = await response.json();
      setGeneratedTexture(data.texture);
      setIsGenerating(false);

      return data.texture;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate texture";
      setError(errorMessage);
      setIsGenerating(false);
      return null;
    }
  };

  const clearTexture = () => {
    setGeneratedTexture(null);
    setError(null);
  };

  const setTexture = (texture: string | null) => {
    setGeneratedTexture(texture);
    setError(null);
  };

  const state: TextureGenerationState = {
    generatedTexture,
    isGenerating,
    error,
  };

  const handlers: TextureGenerationHandlers = {
    generateTexture,
    clearTexture,
    setTexture,
  };

  return {state, handlers};
}
