import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import TrackSwitcher from './TrackSwitcher';
import CrashModal from './CrashModal';
import type { Track } from '../types/track';

interface TelemetryEntry {
  timestamp: number;
  w_pressed: boolean;
  a_pressed: boolean;
  s_pressed: boolean;
  d_pressed: boolean;
  l_sensor_range: number;
  c_sensor_range: number;
  r_sensor_range: number;
}

export default function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const [showCrashModal, setShowCrashModal] = useState(false);
  const [crashTime, setCrashTime] = useState(0);
  const [telemetryData, setTelemetryData] = useState<TelemetryEntry[]>([]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create Phaser game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1280,
      height: 720,
      backgroundColor: '#1a1a1a',
      scene: GameScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    // Create game instance
    gameRef.current = new Phaser.Game(config);

    // Get reference to the scene
    gameRef.current.events.once('ready', () => {
      if (gameRef.current) {
        sceneRef.current = gameRef.current.scene.scenes[0] as GameScene;
      }
    });

    // Listen for collision events
    const handleCollision = (data: { elapsedTime: number; telemetryData: TelemetryEntry[] }) => {
      setCrashTime(data.elapsedTime);
      setTelemetryData(data.telemetryData);
      setShowCrashModal(true);
    };

    gameRef.current.events.on('collision', handleCollision);

    // Cleanup
    return () => {
      if (gameRef.current) {
        gameRef.current.events.off('collision', handleCollision);
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const handleTrackChange = (track: Track) => {
    setCurrentTrack(track);
    setShowCrashModal(false); // Close modal when switching tracks

    // Restart the game with the new track
    if (gameRef.current && sceneRef.current) {
      // Restart the scene
      gameRef.current.scene.stop('GameScene');
      gameRef.current.scene.start('GameScene');

      // Wait a frame for the scene to restart, then update the track
      setTimeout(() => {
        if (gameRef.current) {
          sceneRef.current = gameRef.current.scene.scenes[0] as GameScene;
          sceneRef.current.updateTrack(track);
        }
      }, 100);
    } else if (sceneRef.current) {
      // If scene is ready but game just started, just update the track
      sceneRef.current.updateTrack(track);
    }
  };

  const handleRestart = () => {
    setShowCrashModal(false);
    if (sceneRef.current) {
      sceneRef.current.restart();
    }
  };

  const handleSaveAndRestart = async () => {
    try {
      // Send telemetry data to backend
      const response = await fetch('/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telemetryData),
      });

      if (!response.ok) {
        throw new Error('Failed to save telemetry');
      }

      const result = await response.json();
      console.log('Telemetry saved successfully:', result.fileName);
    } catch (error) {
      console.error('Error saving telemetry:', error);
    } finally {
      // Always restart regardless of save success/failure
      handleRestart();
    }
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      <div ref={containerRef} className="w-full h-full" />
      <TrackSwitcher onTrackChange={handleTrackChange} currentTrack={currentTrack} />
      <CrashModal
        isOpen={showCrashModal}
        elapsedTime={crashTime}
        onRestart={handleRestart}
        onSaveAndRestart={handleSaveAndRestart}
      />
    </div>
  );
}
