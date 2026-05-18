import { EventEmitter } from "./musicSource.js";
import { normalizePlayerState } from "../state/playerState.js";

const DEMO_TRACKS = [
  {
    trackId: "demo-1",
    title: "Midnight Channel",
    artist: "Stream Jams",
    album: "Overlay Tests",
    durationSeconds: 184,
    artworkUrl: "",
  },
  {
    trackId: "demo-2",
    title: "Low Latency Lights",
    artist: "Aster Pulse",
    album: "Scene Switch",
    durationSeconds: 216,
    artworkUrl: "",
  },
];

export class MockMusicSource extends EventEmitter {
  #timer = 0;
  #startedAt = 0;
  #trackIndex = 0;
  #state = null;

  connect() {
    this.emit("connection", { state: "connected", message: "Mock source connected" });
    this.#startedAt = Date.now();
    this.#publish();
    this.#timer = globalThis.setInterval(() => this.#publish(), 1000);
  }

  disconnect() {
    globalThis.clearInterval(this.#timer);
    this.emit("connection", { state: "disconnected", message: "Mock source disconnected" });
  }

  getCurrentState() {
    return this.#state;
  }

  #publish() {
    const track = DEMO_TRACKS[this.#trackIndex];
    const elapsedSeconds = Math.floor((Date.now() - this.#startedAt) / 1000);
    if (elapsedSeconds >= track.durationSeconds) {
      this.#trackIndex = (this.#trackIndex + 1) % DEMO_TRACKS.length;
      this.#startedAt = Date.now();
    }
    this.#state = normalizePlayerState({
      ...DEMO_TRACKS[this.#trackIndex],
      elapsedSeconds: Math.floor((Date.now() - this.#startedAt) / 1000),
      isPlaying: true,
      sourceName: "Mock",
      updatedAt: Date.now(),
    });
    this.emit("state", this.#state);
  }
}
