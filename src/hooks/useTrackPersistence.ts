import {useState, useEffect} from "react";
import type {Track, Point, Obstacle} from "../types/track";
import {interpolateDensePoints} from "../utils/curveInterpolation";

export interface TrackPersistenceHandlers {
  saveTrack: (
    trackName: string,
    outerBorder: Point[],
    innerBorder: Point[],
    startPoint: Point | null,
    obstacles: Obstacle[],
    isOuterComplete: boolean,
    isInnerComplete: boolean,
    texture: string | null,
    onSuccess: () => void
  ) => Promise<void>;
  loadTrack: (trackName: string) => Promise<Track | null>;
  refreshTracks: () => Promise<void>;
}

export function useTrackPersistence() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackName, setTrackName] = useState("");

  // Load existing tracks on mount
  useEffect(() => {
    refreshTracks();
  }, []);

  const refreshTracks = async () => {
    try {
      const res = await fetch("/api/tracks");
      const data = await res.json();
      setTracks(data);
    } catch (err) {
      console.error("Failed to load tracks:", err);
    }
  };

  const saveTrack = async (
    name: string,
    outerBorder: Point[],
    innerBorder: Point[],
    startPoint: Point | null,
    obstacles: Obstacle[],
    isOuterComplete: boolean,
    isInnerComplete: boolean,
    texture: string | null,
    onSuccess: () => void
  ) => {
    if (!name.trim()) {
      alert("Please enter a track name");
      return;
    }

    if (!isOuterComplete || !isInnerComplete || !startPoint) {
      alert(
        "Please complete all track elements (outer border, inner border, and start point)"
      );
      return;
    }

    // Interpolate dense points from sparse user-placed points
    // Using 10 points per segment for smooth curves and good collision detection
    const denseOuterBorder = interpolateDensePoints(outerBorder, 10, true, 0.5);
    const denseInnerBorder = interpolateDensePoints(innerBorder, 10, true, 0.5);

    const track: Track = {
      name,
      outerBorder: denseOuterBorder,
      innerBorder: denseInnerBorder,
      startPoint,
      obstacles: obstacles.length > 0 ? obstacles : undefined,
      sparseOuterBorder: outerBorder,
      sparseInnerBorder: innerBorder,
      texture: texture || undefined,
    };

    try {
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(track),
      });

      if (response.ok) {
        alert("Track saved successfully!");
        await refreshTracks();
        onSuccess();
      } else {
        alert("Failed to save track");
      }
    } catch (err) {
      console.error("Error saving track:", err);
      alert("Error saving track");
    }
  };

  const loadTrack = async (name: string): Promise<Track | null> => {
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(name)}`);
      if (response.ok) {
        const track: Track = await response.json();
        setTrackName(track.name);
        return track;
      }
      return null;
    } catch (err) {
      console.error("Error loading track:", err);
      return null;
    }
  };

  const handlers: TrackPersistenceHandlers = {
    saveTrack,
    loadTrack,
    refreshTracks,
  };

  return {
    tracks,
    trackName,
    setTrackName,
    handlers,
  };
}
