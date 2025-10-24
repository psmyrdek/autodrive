import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import TrackSwitcher from './TrackSwitcher';
import type { Track } from '../types/track';

export default function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const sceneRef = useRef<GameScene | null>(null);

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

    // Cleanup
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const handleTrackChange = (track: Track) => {
    setCurrentTrack(track);

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

  return (
    <div className="relative w-full h-screen bg-gray-900">
      <div ref={containerRef} className="w-full h-full" />
      <TrackSwitcher onTrackChange={handleTrackChange} currentTrack={currentTrack} />
    </div>
  );
}
