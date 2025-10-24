/**
 * TrackManager - Handles track selection and provides API for game restart
 */
export class TrackManager {
  constructor() {
    this.tracks = [];
    this.currentTrack = null;
    this.onTrackChangeCallback = null;
  }

  /**
   * Load available tracks from tracks.json
   */
  async loadTracks() {
    try {
      const response = await fetch("game/tracks.json");
      this.tracks = await response.json();
      return this.tracks;
    } catch (error) {
      console.error("Failed to load tracks:", error);
      return [];
    }
  }

  /**
   * Initialize the track picker UI
   */
  async initializeUI() {
    const tracks = await this.loadTracks();
    const selectElement = document.getElementById("track-select");
    const descriptionElement = document.getElementById("track-description");

    if (!selectElement || !descriptionElement) {
      console.error("Track picker UI elements not found");
      return;
    }

    // Clear loading option
    selectElement.innerHTML = "";

    // Populate dropdown with tracks
    tracks.forEach((track, index) => {
      const option = document.createElement("option");
      option.value = track.id;
      option.textContent = track.name;
      selectElement.appendChild(option);
    });

    // Set first track as default
    if (tracks.length > 0) {
      this.currentTrack = tracks[0];
      descriptionElement.textContent = tracks[0].description;
    }

    // Handle track selection changes
    selectElement.addEventListener("change", (event) => {
      const selectedTrack = tracks.find((t) => t.id === event.target.value);
      if (selectedTrack) {
        this.currentTrack = selectedTrack;
        descriptionElement.textContent = selectedTrack.description;

        // Trigger game restart
        if (this.onTrackChangeCallback) {
          this.onTrackChangeCallback(selectedTrack);
        }
      }
    });
  }

  /**
   * Get the current track path
   */
  getCurrentTrackPath() {
    return this.currentTrack ? this.currentTrack.path : "game/tracks/track1.json";
  }

  /**
   * Register callback for when track changes
   */
  onTrackChange(callback) {
    this.onTrackChangeCallback = callback;
  }
}
