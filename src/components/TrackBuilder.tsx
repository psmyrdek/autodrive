import {useEffect, useRef, useState} from "react";
import type {Point, Track} from "../types/track";
import {interpolateDensePoints} from "../utils/curveInterpolation";

type DrawingTool = "outer-border" | "inner-border" | "start-point";

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
  ctx.lineWidth = 3;
  ctx.fillStyle = color;

  // Draw points
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

export default function TrackBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<DrawingTool>("outer-border");
  const [trackName, setTrackName] = useState("");
  const [outerBorder, setOuterBorder] = useState<Point[]>([]);
  const [innerBorder, setInnerBorder] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [isOuterComplete, setIsOuterComplete] = useState(false);
  const [isInnerComplete, setIsInnerComplete] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);

  // Load existing tracks on mount
  useEffect(() => {
    fetch("/api/tracks")
      .then((res) => res.json())
      .then((data) => setTracks(data))
      .catch((err) => console.error("Failed to load tracks:", err));
  }, []);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw outer border
    if (outerBorder.length > 0) {
      drawPath(ctx, outerBorder, "#3b82f6", isOuterComplete);
    }

    // Draw inner border
    if (innerBorder.length > 0) {
      drawPath(ctx, innerBorder, "#ef4444", isInnerComplete);
    }

    // Draw start point
    if (startPoint) {
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [outerBorder, innerBorder, startPoint, isOuterComplete, isInnerComplete]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === "outer-border" && !isOuterComplete) {
      setOuterBorder([...outerBorder, {x, y}]);
    } else if (currentTool === "inner-border" && !isInnerComplete) {
      setInnerBorder([...innerBorder, {x, y}]);
    } else if (currentTool === "start-point") {
      setStartPoint({x, y});
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

  const handleSaveTrack = async () => {
    if (!trackName.trim()) {
      alert("Please enter a track name");
      return;
    }

    if (!isOuterComplete || !isInnerComplete || !startPoint) {
      alert(
        "Please complete all track elements (outer border, inner border, and start point)"
      );
      return;
    }

    // Interpolate dense points from sparse user-placed points
    // Using 10 points per segment for smooth curves and good collision detection
    const denseOuterBorder = interpolateDensePoints(outerBorder, 10, true, 0.5);
    const denseInnerBorder = interpolateDensePoints(innerBorder, 10, true, 0.5);

    const track: Track = {
      name: trackName,
      outerBorder: denseOuterBorder,
      innerBorder: denseInnerBorder,
      startPoint,
      sparseOuterBorder: outerBorder,
      sparseInnerBorder: innerBorder,
    };

    try {
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(track),
      });

      if (response.ok) {
        alert("Track saved successfully!");
        // Reload tracks
        const tracksResponse = await fetch("/api/tracks");
        const tracksData = await tracksResponse.json();
        setTracks(tracksData);
        // Reset the builder
        handleClear();
      } else {
        alert("Failed to save track");
      }
    } catch (err) {
      console.error("Error saving track:", err);
      alert("Error saving track");
    }
  };

  const handleClear = () => {
    setOuterBorder([]);
    setInnerBorder([]);
    setStartPoint(null);
    setIsOuterComplete(false);
    setIsInnerComplete(false);
    setCurrentTool("outer-border");
    setTrackName("");
  };

  const handleLoadTrack = async (trackName: string) => {
    try {
      const response = await fetch(
        `/api/tracks/${encodeURIComponent(trackName)}`
      );
      if (response.ok) {
        const track: Track = await response.json();
        setTrackName(track.name);
        // Use sparse points if available (for editing), otherwise use dense points
        setOuterBorder(track.sparseOuterBorder || track.outerBorder);
        setInnerBorder(track.sparseInnerBorder || track.innerBorder);
        setStartPoint(track.startPoint);
        setIsOuterComplete(true);
        setIsInnerComplete(true);
      }
    } catch (err) {
      console.error("Error loading track:", err);
    }
  };

  return (
    <div className='flex h-screen bg-gray-100'>
      {/* Sidebar */}
      <div className='w-64 bg-white shadow-lg p-4 flex flex-col gap-4'>
        <h2 className='text-xl font-bold text-gray-800'>Track Builder</h2>

        {/* Track Name Input */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Track Name
          </label>
          <input
            type='text'
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            placeholder='Enter track name'
          />
        </div>

        {/* Drawing Tools */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Drawing Tool
          </label>
          <div className='flex flex-col gap-2'>
            <button
              onClick={() => setCurrentTool("outer-border")}
              disabled={isOuterComplete}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentTool === "outer-border"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Outer Border {isOuterComplete && "✓"}
            </button>
            <button
              onClick={() => setCurrentTool("inner-border")}
              disabled={isInnerComplete}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentTool === "inner-border"
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Inner Border {isInnerComplete && "✓"}
            </button>
            <button
              onClick={() => setCurrentTool("start-point")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentTool === "start-point"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Start Point {startPoint && "✓"}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className='text-xs text-gray-600'>
          <p className='font-medium mb-1'>Instructions:</p>
          <ul className='list-disc list-inside space-y-1'>
            <li>Single-click to add points</li>
            <li>Double-click to complete outline</li>
            <li>Complete outer border first</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className='flex flex-col gap-2 mt-auto'>
          <button
            onClick={handleSaveTrack}
            className='w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium'
          >
            Save Track
          </button>
          <button
            onClick={handleClear}
            className='w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium'
          >
            Clear
          </button>
        </div>

        {/* Saved Tracks */}
        <div className='border-t pt-4'>
          <h3 className='text-sm font-medium text-gray-700 mb-2'>
            Saved Tracks
          </h3>
          <div className='flex flex-col gap-1 max-h-48 overflow-y-auto'>
            {tracks.map((track) => (
              <button
                key={track.name}
                onClick={() => handleLoadTrack(track.name)}
                className='px-2 py-1 text-sm text-left bg-gray-100 hover:bg-gray-200 rounded'
              >
                {track.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className='flex-1 flex items-center justify-center p-8'>
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          className='border-4 border-gray-300 bg-white shadow-lg cursor-crosshair'
        />
      </div>
    </div>
  );
}
