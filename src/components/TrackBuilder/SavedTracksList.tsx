import {FolderOpen, FileText} from "lucide-react";

interface Track {
  name: string;
}

interface SavedTracksListProps {
  tracks: Track[];
  onLoadTrack: (name: string) => void;
}

export function SavedTracksList({tracks, onLoadTrack}: SavedTracksListProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FolderOpen className="w-5 h-5" />
        Saved Tracks
      </h3>

      {tracks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No saved tracks yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {tracks.map((track) => (
            <button
              key={track.name}
              onClick={() => onLoadTrack(track.name)}
              className="group px-4 py-3 text-sm text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="font-medium text-gray-700 group-hover:text-blue-700">
                {track.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
