import {Info, Type} from "lucide-react";

interface TrackInfoProps {
  trackName: string;
  onTrackNameChange: (name: string) => void;
}

export function TrackInfo({trackName, onTrackNameChange}: TrackInfoProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Type className="w-5 h-5" />
        Track Information
      </h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Track Name
        </label>
        <input
          type="text"
          value={trackName}
          onChange={(e) => onTrackNameChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Enter track name"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium text-blue-900">Instructions</p>
        </div>
        <ul className="text-xs text-blue-800 space-y-1.5 ml-6">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Single-click to add points</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Double-click to complete outline</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Complete outer border first</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Obstacles: 2 clicks (start, end)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
