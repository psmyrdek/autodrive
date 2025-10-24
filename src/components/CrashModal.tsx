interface CrashModalProps {
  isOpen: boolean;
  elapsedTime: number;
  onRestart: () => void;
  onSaveAndRestart: () => void;
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const deciseconds = Math.floor((milliseconds % 1000) / 100);

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
}

export default function CrashModal({
  isOpen,
  elapsedTime,
  onRestart,
  onSaveAndRestart,
}: CrashModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-red-500">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-red-500 mb-4">CRASH!</h2>
          <p className="text-white text-xl mb-2">You hit the border</p>
          <p className="text-gray-300 text-lg mb-6">
            Time: <span className="font-mono font-bold">{formatTime(elapsedTime)}</span>
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onRestart}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Restart
            </button>
            <button
              onClick={onSaveAndRestart}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Save & Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
