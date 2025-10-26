import {Sparkles, CheckCircle, AlertCircle, Loader2} from "lucide-react";

interface TexturePanelProps {
  isGenerating: boolean;
  generatedTexture: string | null;
  error: string | null;
  isOuterComplete: boolean;
  isInnerComplete: boolean;
  onGenerateTexture: () => void;
}

export function TexturePanel({
  isGenerating,
  generatedTexture,
  error,
  isOuterComplete,
  isInnerComplete,
  onGenerateTexture,
}: TexturePanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-600" />
        AI Texture Generation
      </h3>

      <button
        onClick={onGenerateTexture}
        disabled={
          isGenerating || !isOuterComplete || !isInnerComplete
        }
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : generatedTexture ? (
          <>
            <Sparkles className="w-5 h-5" />
            Regenerate Texture
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Texture
          </>
        )}
      </button>

      {generatedTexture && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Texture generated successfully!</span>
          </div>
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <img
              src={`/public/tracks/${generatedTexture}`}
              alt="Generated texture preview"
              className="w-full"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">
              An error occurred - check logs to see what went wrong.
            </p>
          </div>
        </div>
      )}

      {!isOuterComplete || !isInnerComplete ? (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Complete both borders to enable texture generation
        </p>
      ) : null}
    </div>
  );
}
