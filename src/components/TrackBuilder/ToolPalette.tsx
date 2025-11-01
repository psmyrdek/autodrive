import {Pencil, MapPin, Hexagon} from "lucide-react";

interface ToolPaletteProps {
  currentTool: "drag-line" | "start-point" | "obstacles";
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  startPoint: {x: number; y: number} | null;
  obstaclesCount: number;
  onSelectTool: (tool: "drag-line" | "start-point" | "obstacles") => void;
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
      id: "drag-line" as const,
      icon: Pencil,
      label: "Draw Track",
      color: "purple",
      disabled: isOuterComplete && isInnerComplete,
      completed: isOuterComplete && isInnerComplete,
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
          purple: isActive
            ? "bg-purple-600 text-white shadow-lg ring-2 ring-purple-400"
            : "bg-gray-700 text-purple-400 hover:bg-gray-600 border-gray-600",
          green: isActive
            ? "bg-green-600 text-white shadow-lg ring-2 ring-green-400"
            : "bg-gray-700 text-green-400 hover:bg-gray-600 border-gray-600",
          orange: isActive
            ? "bg-orange-600 text-white shadow-lg ring-2 ring-orange-400"
            : "bg-gray-700 text-orange-400 hover:bg-gray-600 border-gray-600",
        };

        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            disabled={tool.disabled}
            className={`relative p-3 rounded-lg transition-all ${
              colorClasses[tool.color]
            } disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg border`}
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
