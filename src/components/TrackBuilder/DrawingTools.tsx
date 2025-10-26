import {Circle, Square, MapPin, Hexagon} from "lucide-react";

interface DrawingToolsProps {
  currentTool: "outer-border" | "inner-border" | "start-point" | "obstacles";
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  startPoint: {x: number; y: number} | null;
  obstaclesCount: number;
  onSelectTool: (
    tool: "outer-border" | "inner-border" | "start-point" | "obstacles"
  ) => void;
}

export function DrawingTools({
  currentTool,
  isOuterComplete,
  isInnerComplete,
  startPoint,
  obstaclesCount,
  onSelectTool,
}: DrawingToolsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Circle className="w-5 h-5" />
        Drawing Tools
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelectTool("outer-border")}
          disabled={isOuterComplete}
          className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 ${
            currentTool === "outer-border"
              ? "bg-blue-500 text-white shadow-lg scale-105"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
        >
          <Square className="w-6 h-6" />
          <span>Outer Border</span>
          {isOuterComplete && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              ✓
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTool("inner-border")}
          disabled={isInnerComplete}
          className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 ${
            currentTool === "inner-border"
              ? "bg-red-500 text-white shadow-lg scale-105"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
        >
          <Square className="w-6 h-6" />
          <span>Inner Border</span>
          {isInnerComplete && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              ✓
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTool("start-point")}
          className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 ${
            currentTool === "start-point"
              ? "bg-green-500 text-white shadow-lg scale-105"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <MapPin className="w-6 h-6" />
          <span>Start Point</span>
          {startPoint && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              ✓
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTool("obstacles")}
          className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 ${
            currentTool === "obstacles"
              ? "bg-orange-500 text-white shadow-lg scale-105"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Hexagon className="w-6 h-6" />
          <span>Obstacles</span>
          {obstaclesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {obstaclesCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
