import {Circle, Square, MapPin, Hexagon} from "lucide-react";

interface ToolPaletteProps {
  currentTool: "outer-border" | "inner-border" | "start-point" | "obstacles";
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  startPoint: {x: number; y: number} | null;
  obstaclesCount: number;
  onSelectTool: (
    tool: "outer-border" | "inner-border" | "start-point" | "obstacles"
  ) => void;
}

export function ToolPalette({
  currentTool,
  isOuterComplete,
  isInnerComplete,
  startPoint,
  obstaclesCount,
  onSelectTool,
}: ToolPaletteProps) {
  const tools = [
    {
      id: "outer-border" as const,
      icon: Square,
      label: "Outer (Out)",
      color: "blue",
      disabled: isOuterComplete,
      completed: isOuterComplete,
    },
    {
      id: "inner-border" as const,
      icon: Square,
      label: "Inner (In)",
      color: "red",
      disabled: isInnerComplete,
      completed: isInnerComplete,
    },
    {
      id: "start-point" as const,
      icon: MapPin,
      label: "Start",
      color: "green",
      disabled: false,
      completed: !!startPoint,
    },
    {
      id: "obstacles" as const,
      icon: Hexagon,
      label: "Obstacles",
      color: "orange",
      disabled: false,
      completed: obstaclesCount > 0,
      badge: obstaclesCount > 0 ? obstaclesCount : undefined,
    },
  ];

  return (
    <div className="flex gap-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;
        const colorClasses = {
          blue: isActive
            ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-300"
            : "bg-white text-blue-600 hover:bg-blue-50",
          red: isActive
            ? "bg-red-500 text-white shadow-lg ring-2 ring-red-300"
            : "bg-white text-red-600 hover:bg-red-50",
          green: isActive
            ? "bg-green-500 text-white shadow-lg ring-2 ring-green-300"
            : "bg-white text-green-600 hover:bg-green-50",
          orange: isActive
            ? "bg-orange-500 text-white shadow-lg ring-2 ring-orange-300"
            : "bg-white text-orange-600 hover:bg-orange-50",
        };

        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            disabled={tool.disabled}
            className={`relative p-3 rounded-lg transition-all ${
              colorClasses[tool.color]
            } disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg border border-gray-200`}
            title={tool.label}
          >
            <Icon className="w-5 h-5" />
            {tool.completed && !isActive && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-md">
                ✓
              </span>
            )}
            {tool.badge !== undefined && tool.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold shadow-md">
                {tool.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
