import {useRef} from "react";
import {RotateCcw, Sparkles, Wand2} from "lucide-react";
import {useTrackDrawing} from "../hooks/useTrackDrawing";
import {useTrackCanvas} from "../hooks/useTrackCanvas";
import {useTrackPersistence} from "../hooks/useTrackPersistence";
import {useTextureGeneration} from "../hooks/useTextureGeneration";
import {ToolPalette} from "./TrackBuilder/ToolPalette";
import {SavePanel} from "./TrackBuilder/SavePanel";
import {InstructionsPanel} from "./TrackBuilder/InstructionsPanel";

export default function TrackBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Custom hooks for business logic
  const {state: drawingState, handlers: drawingHandlers} = useTrackDrawing();
  const {
    tracks,
    trackName,
    setTrackName,
    handlers: persistenceHandlers,
  } = useTrackPersistence();
  const {state: textureState, handlers: textureHandlers} =
    useTextureGeneration();

  // Canvas rendering
  useTrackCanvas(canvasRef, {
    outerBorder: drawingState.outerBorder,
    innerBorder: drawingState.innerBorder,
    startPoint: drawingState.startPoint,
    obstacles: drawingState.obstacles,
    currentObstacleStart: drawingState.currentObstacleStart,
    isOuterComplete: drawingState.isOuterComplete,
    isInnerComplete: drawingState.isInnerComplete,
    textureUrl: textureState.generatedTexture,
  });

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawingHandlers.handleCanvasClick(x, y);
  };

  const handleCanvasDoubleClick = () => {
    drawingHandlers.handleCanvasDoubleClick();
  };

  const handleGenerateTexture = async () => {
    const texture = await textureHandlers.generateTexture(
      canvasRef,
      trackName,
      drawingState.outerBorder,
      drawingState.innerBorder,
      drawingState.isOuterComplete,
      drawingState.isInnerComplete
    );

    if (!texture) {
      alert(textureState.error || "Failed to generate texture");
    }
  };

  const handleSaveTrack = async () => {
    await persistenceHandlers.saveTrack(
      trackName,
      drawingState.outerBorder,
      drawingState.innerBorder,
      drawingState.startPoint,
      drawingState.obstacles,
      drawingState.isOuterComplete,
      drawingState.isInnerComplete,
      textureState.generatedTexture,
      () => {
        drawingHandlers.clear();
        setTrackName("");
        textureHandlers.clearTexture();
      }
    );
  };

  const handleClear = () => {
    drawingHandlers.clear();
    setTrackName("");
    textureHandlers.clearTexture();
  };

  const handleLoadTrack = async (name: string) => {
    const track = await persistenceHandlers.loadTrack(name);
    if (track) {
      // Use sparse points if available (for editing), otherwise use dense points
      drawingHandlers.loadTrack(
        track.sparseOuterBorder || track.outerBorder,
        track.sparseInnerBorder || track.innerBorder,
        track.startPoint,
        track.obstacles || []
      );
    }
  };

  return (
    <div className='relative h-full min-h-fit bg-gray-900 overflow-auto'>
      {/* Centered Canvas - Fixed 720p */}
      <div className='absolute inset-0 flex items-center justify-center'>
        <canvas
          ref={canvasRef}
          width={1280}
          height={640}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          className='bg-white cursor-crosshair shadow-2xl'
        />

        {/* Loading Overlay for AI Texture Generation */}
        {textureState.isGenerating && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
            <div className='bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 rounded-2xl shadow-2xl p-8 border-2 border-purple-400/30'>
              <div className='flex flex-col items-center gap-6'>
                {/* Animated Icons */}
                <div className='relative w-24 h-24'>
                  <Sparkles className='w-24 h-24 text-yellow-300 absolute animate-ping' />
                  <Wand2 className='w-24 h-24 text-white absolute animate-pulse' />
                </div>

                {/* Loading Text */}
                <div className='flex flex-col items-center gap-2'>
                  <h3 className='text-2xl font-bold text-white'>
                    Generating AI Texture
                  </h3>
                  <p className='text-purple-200 text-sm'>
                    Creating photorealistic track texture...
                  </p>
                </div>

                {/* Progress Dots */}
                <div className='flex gap-2'>
                  <div className='w-3 h-3 bg-purple-300 rounded-full animate-bounce [animation-delay:0ms]'></div>
                  <div className='w-3 h-3 bg-purple-300 rounded-full animate-bounce [animation-delay:150ms]'></div>
                  <div className='w-3 h-3 bg-purple-300 rounded-full animate-bounce [animation-delay:300ms]'></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Center - Track Name & Save Panel */}
      <div className='absolute top-6 left-1/2 -translate-x-1/2 z-10'>
        <div className='bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-3 flex items-center gap-3'>
          <input
            type='text'
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            className='text-lg font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-0 min-w-[300px] text-center'
            placeholder='Untitled Track'
          />
          <div className='w-px h-8 bg-gray-300'></div>
          <SavePanel
            onSave={handleSaveTrack}
            onLoadTrack={handleLoadTrack}
            tracks={tracks}
            isGeneratingTexture={textureState.isGenerating}
            generatedTexture={textureState.generatedTexture}
            textureError={textureState.error}
            isOuterComplete={drawingState.isOuterComplete}
            isInnerComplete={drawingState.isInnerComplete}
            onGenerateTexture={handleGenerateTexture}
          />
        </div>
      </div>

      {/* Bottom Center - Tools */}
      <div className='absolute bottom-6 left-1/2 -translate-x-1/2 z-10'>
        <div className='bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-3'>
          <div className='flex items-center gap-2'>
            <ToolPalette
              currentTool={drawingState.currentTool}
              isOuterComplete={drawingState.isOuterComplete}
              isInnerComplete={drawingState.isInnerComplete}
              startPoint={drawingState.startPoint}
              obstaclesCount={drawingState.obstacles.length}
              onSelectTool={drawingHandlers.setCurrentTool}
            />
            <div className='w-px h-8 bg-gray-300'></div>
            <button
              onClick={handleClear}
              className='p-3 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-all flex items-center gap-2'
              title='Clear Canvas'
            >
              <RotateCcw className='w-5 h-5' />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Right - Help Button (Instructions) */}
      <InstructionsPanel />
    </div>
  );
}
