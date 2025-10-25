import {useEffect, useRef, useState} from "react";
import {useSearchParams} from "react-router-dom";
import Phaser from "phaser";
import GameScene from "../scenes/GameScene";
import TrackSwitcher from "./TrackSwitcher";
import CrashModal from "./CrashModal";
import Toast from "./Toast";
import type {Track} from "../types/track";

interface TelemetryEntry {
  timestamp: number;
  w_pressed: boolean;
  a_pressed: boolean;
  s_pressed: boolean;
  d_pressed: boolean;
  l_sensor_range: number;
  c_sensor_range: number;
  r_sensor_range: number;
  speed: number;
}

export default function Game() {
  const [searchParams, setSearchParams] = useSearchParams();
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const [showCrashModal, setShowCrashModal] = useState(false);
  const [crashTime, setCrashTime] = useState(0);
  const [telemetryData, setTelemetryData] = useState<TelemetryEntry[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success"
  );
  const [isAutopilotEnabled, setIsAutopilotEnabled] = useState(false);

  const showToastNotification = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleManualSaveTelemetry = async () => {
    if (!sceneRef.current) return;

    // Manually trigger the save telemetry event from the scene
    gameRef.current?.events.emit("saveTelemetry", {
      elapsedTime: sceneRef.current["timerDisplay"]?.getElapsedTime() || 0,
      telemetryData:
        sceneRef.current["telemetryTracker"]?.getTelemetryData() || [],
    });
  };

  const handleToggleAutopilot = () => {
    if (sceneRef.current) {
      sceneRef.current.toggleAutopilot();
    }
  };

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create Phaser game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1280,
      height: 720,
      backgroundColor: "#1a1a1a",
      scene: GameScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    // Create game instance
    gameRef.current = new Phaser.Game(config);

    // Get reference to the scene
    gameRef.current.events.once("ready", () => {
      if (gameRef.current) {
        sceneRef.current = gameRef.current.scene.scenes[0] as GameScene;
      }
    });

    // Listen for collision events
    const handleCollision = (data: {
      elapsedTime: number;
      telemetryData: TelemetryEntry[];
    }) => {
      setCrashTime(data.elapsedTime);
      setTelemetryData(data.telemetryData);
      setShowCrashModal(true);
    };

    // Listen for manual telemetry save events
    const handleSaveTelemetry = async (data: {
      elapsedTime: number;
      telemetryData: TelemetryEntry[];
    }) => {
      try {
        const response = await fetch("/api/telemetry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data.telemetryData),
        });

        if (!response.ok) {
          throw new Error("Failed to save telemetry");
        }

        const result = await response.json();
        showToastNotification(`Telemetry saved: ${result.fileName}`, "success");
      } catch (error) {
        console.error("Error saving telemetry:", error);
        showToastNotification("Failed to save telemetry", "error");
      }
    };

    // Listen for autopilot toggle events
    const handleAutopilotToggled = (enabled: boolean) => {
      setIsAutopilotEnabled(enabled);
      showToastNotification(
        enabled ? "Autopilot enabled" : "Autopilot disabled",
        "info"
      );
    };

    gameRef.current.events.on("collision", handleCollision);
    gameRef.current.events.on("saveTelemetry", handleSaveTelemetry);
    gameRef.current.events.on("autopilotToggled", handleAutopilotToggled);

    // Cleanup
    return () => {
      if (gameRef.current) {
        gameRef.current.events.off("collision", handleCollision);
        gameRef.current.events.off("saveTelemetry", handleSaveTelemetry);
        gameRef.current.events.off("autopilotToggled", handleAutopilotToggled);
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Load track from URL parameter on mount
  useEffect(() => {
    const trackName = searchParams.get("track");
    if (trackName && !currentTrack) {
      // Fetch the track from the API
      fetch(`/api/tracks/${encodeURIComponent(trackName)}`)
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("Track not found");
        })
        .then((track) => {
          // Wait for scene to be ready before loading track
          const loadTrack = () => {
            if (sceneRef.current) {
              handleTrackChange(track);
            } else {
              setTimeout(loadTrack, 100);
            }
          };
          loadTrack();
        })
        .catch((error) => {
          console.error("Error loading track from URL:", error);
          showToastNotification(`Failed to load track: ${trackName}`, "error");
        });
    }
  }, [searchParams]);

  const handleTrackChange = (track: Track) => {
    setCurrentTrack(track);
    setShowCrashModal(false); // Close modal when switching tracks

    // Update URL with selected track
    setSearchParams({track: track.name});

    // Restart the game with the new track
    if (gameRef.current && sceneRef.current) {
      // Restart the scene
      gameRef.current.scene.stop("GameScene");
      gameRef.current.scene.start("GameScene");

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
      const response = await fetch("/api/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(telemetryData),
      });

      if (!response.ok) {
        throw new Error("Failed to save telemetry");
      }

      const result = await response.json();
      console.log("Telemetry saved successfully:", result.fileName);
    } catch (error) {
      console.error("Error saving telemetry:", error);
    } finally {
      // Always restart regardless of save success/failure
      handleRestart();
    }
  };

  return (
    <div className='w-full h-screen bg-gray-900 overflow-hidden'>
      {/* 3-column grid layout */}
      <div className='grid grid-cols-[200px_1fr_200px] gap-2 h-full p-2'>
        {/* Left column: Track Switcher */}
        <div className='flex flex-col overflow-hidden'>
          <TrackSwitcher
            onTrackChange={handleTrackChange}
            currentTrack={currentTrack}
          />
        </div>

        {/* Center column: Game Canvas */}
        <div className='flex items-center justify-center overflow-hidden'>
          <div
            ref={containerRef}
            className='w-full h-full max-w-full max-h-full'
          />
        </div>

        {/* Right column: Systems */}
        <div className='flex flex-col gap-2 overflow-y-auto'>
          {/* Combined Systems Section */}
          <div className='bg-gray-800 bg-opacity-90 p-3 rounded-lg shadow-lg'>
            <h3 className='text-white font-bold mb-2 text-xs uppercase tracking-wide'>
              Systems
            </h3>

            {/* Autopilot */}
            <button
              onClick={handleToggleAutopilot}
              className={`w-full ${
                isAutopilotEnabled
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-600 hover:bg-gray-700"
              } text-white font-semibold px-3 py-2 rounded transition-colors text-sm mb-1`}
            >
              {isAutopilotEnabled ? "Autopilot: ON" : "Autopilot: OFF"}
            </button>

            {/* Save Telemetry */}
            <button
              onClick={handleManualSaveTelemetry}
              className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded transition-colors text-sm mb-1'
            >
              Save Telemetry
            </button>
          </div>

          {/* Keyboard Controls Reference */}
          <div className='bg-gray-800 bg-opacity-90 p-3 rounded-lg shadow-lg'>
            <h3 className='text-white font-bold mb-2 text-xs uppercase tracking-wide'>
              Keyboard
            </h3>
            <div className='space-y-1 text-xs text-gray-300'>
              <div className='flex justify-between items-center'>
                <span>Accelerate</span>
                <kbd className='bg-gray-700 px-1.5 py-0.5 rounded text-gray-300'>
                  W
                </kbd>
              </div>
              <div className='flex justify-between items-center'>
                <span>Brake</span>
                <kbd className='bg-gray-700 px-1.5 py-0.5 rounded text-gray-300'>
                  S
                </kbd>
              </div>
              <div className='flex justify-between items-center'>
                <span>Turn Left</span>
                <kbd className='bg-gray-700 px-1.5 py-0.5 rounded text-gray-300'>
                  A
                </kbd>
              </div>
              <div className='flex justify-between items-center'>
                <span>Turn Right</span>
                <kbd className='bg-gray-700 px-1.5 py-0.5 rounded text-gray-300'>
                  D
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals and Toasts (overlay on top) */}
      <CrashModal
        isOpen={showCrashModal}
        elapsedTime={crashTime}
        onRestart={handleRestart}
        onSaveAndRestart={handleSaveAndRestart}
      />
      <Toast message={toastMessage} isVisible={showToast} type={toastType} />
    </div>
  );
}
