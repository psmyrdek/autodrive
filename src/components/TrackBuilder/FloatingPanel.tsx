import {ReactNode, useState} from "react";
import {X, GripVertical} from "lucide-react";

interface FloatingPanelProps {
  title?: string;
  children: ReactNode;
  defaultPosition?: {x: number; y: number};
  onClose?: () => void;
  collapsible?: boolean;
  className?: string;
}

export function FloatingPanel({
  title,
  children,
  defaultPosition = {x: 20, y: 20},
  onClose,
  collapsible = false,
  className = "",
}: FloatingPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`absolute bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 ${className}`}
      style={{
        left: `${defaultPosition.x}px`,
        top: `${defaultPosition.y}px`,
      }}
    >
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 cursor-move">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          </div>
          <div className="flex items-center gap-1">
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <span className="text-xs text-gray-600">
                  {isCollapsed ? "▼" : "▲"}
                </span>
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      )}
      {!isCollapsed && <div className="p-3">{children}</div>}
    </div>
  );
}
