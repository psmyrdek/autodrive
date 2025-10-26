import {useState} from "react";
import {Save, FolderOpen, ChevronDown, Sparkles, Loader2} from "lucide-react";

interface Track {
  name: string;
}

interface SavePanelProps {
  onSave: () => void;
  onLoadTrack: (name: string) => void;
  tracks: Track[];
  isGeneratingTexture: boolean;
  generatedTexture: string | null;
  textureError: string | null;
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  onGenerateTexture: () => void;
}

export function SavePanel({
  onSave,
  onLoadTrack,
  tracks,
  isGeneratingTexture,
  generatedTexture,
  textureError,
  isOuterComplete,
  isInnerComplete,
  onGenerateTexture,
}: SavePanelProps) {
  const [showTracks, setShowTracks] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSave}
        className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg"
        title="Save Track"
      >
        <Save className="w-5 h-5" />
      </button>

      <button
        onClick={onGenerateTexture}
        disabled={isGeneratingTexture || !isOuterComplete || !isInnerComplete}
        className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        title={
          isGeneratingTexture
            ? "Generating texture..."
            : generatedTexture
            ? "Regenerate AI Texture"
            : "Generate AI Texture"
        }
      >
        {isGeneratingTexture ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
      </button>

      {textureError && (
        <div className="absolute top-full mt-2 right-0 bg-red-50 border border-red-200 rounded px-2 py-1">
          <p className="text-xs text-red-600 whitespace-nowrap">Generation failed</p>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setShowTracks(!showTracks)}
          className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all shadow-md"
          title="Load Track"
        >
          <FolderOpen className="w-5 h-5" />
        </button>

        {showTracks && (
          <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {tracks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No saved tracks
                </p>
              ) : (
                tracks.map((track) => (
                  <button
                    key={track.name}
                    onClick={() => {
                      onLoadTrack(track.name);
                      setShowTracks(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded transition-all"
                  >
                    {track.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
