import { useEffect, useState } from 'react';
import type { Track } from '../types/track';

interface TrackSwitcherProps {
  onTrackChange: (track: Track) => void;
  currentTrack: Track | null;
}

export default function TrackSwitcher({ onTrackChange, currentTrack }: TrackSwitcherProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tracks');
      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }
      const data = await response.json();
      setTracks(data);

      // Auto-select first track if none selected
      if (data.length > 0 && !currentTrack) {
        onTrackChange(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 p-4 rounded shadow-lg z-10">
        <p className="text-white">Loading tracks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 p-4 rounded shadow-lg z-10">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={fetchTracks}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 p-4 rounded shadow-lg z-10">
        <p className="text-white">No tracks available. Create one in Track Builder!</p>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 p-4 rounded shadow-lg z-10">
      <h3 className="text-white font-bold mb-2">Select Track</h3>
      <div className="flex flex-col gap-2">
        {tracks.map((track) => (
          <button
            key={track.name}
            onClick={() => onTrackChange(track)}
            className={`px-4 py-2 rounded text-left transition-colors ${
              currentTrack?.name === track.name
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {track.name}
          </button>
        ))}
      </div>
    </div>
  );
}
