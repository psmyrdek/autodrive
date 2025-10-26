import {useState} from "react";
import {HelpCircle, X} from "lucide-react";

export function InstructionsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all hover:scale-110"
        title="Show Instructions"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 w-80 max-w-[calc(100vw-3rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          Instructions
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">
              Drawing Borders
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start">
                <span className="mr-2 text-blue-500">•</span>
                <span>Single-click to add points</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-500">•</span>
                <span>Double-click to complete the outline</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-500">•</span>
                <span>Draw outer border first, then inner</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">
              Start Point & Obstacles
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start">
                <span className="mr-2 text-green-500">•</span>
                <span>Click once to place start point</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-orange-500">•</span>
                <span>Obstacles: Click start, then end point</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">
              AI Texture
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start">
                <span className="mr-2 text-purple-500">•</span>
                <span>Complete both borders to generate texture</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
