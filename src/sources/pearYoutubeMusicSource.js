import { EventEmitter } from "./musicSource.js";
import { normalizePearSong, normalizePlayerState } from "../state/playerState.js";

export class PearYoutubeMusicSource extends EventEmitter {
  #config;
  #fetch;
  #WebSocket;
  #socket = null;
  #pollTimer = 0;
  #reconnectTimer = 0;
  #webSocketRetryTimer = 0;
  #state = null;
  #stopped = false;

  constructor(config, dependencies = {}) {
    super();
    this.#config = config;
    this.#fetch = dependencies.fetch ?? globalThis.fetch?.bind(globalThis);
    this.#WebSocket = dependencies.WebSocket ?? globalThis.WebSocket;
  }

  connect() {
    this.#stopped = false;
    this.emit("connection", { state: "connecting", message: "Connecting to Pear Desktop" });
    if (this.#config.transport === "poll") {
      this.#startPolling();
      return;
    }
    this.#connectWebSocket();
  }

  disconnect() {
    this.#stopped = true;
    globalThis.clearInterval(this.#pollTimer);
    globalThis.clearTimeout(this.#reconnectTimer);
    globalThis.clearTimeout(this.#webSocketRetryTimer);
    this.#socket?.close?.();
    this.emit("connection", { state: "disconnected", message: "Disconnected" });
  }

  getCurrentState() {
    return this.#state;
  }

  async testConnection() {
    const response = await this.#requestSong();
    return response.ok || response.status === 204;
  }

  #connectWebSocket() {
    if (!this.#WebSocket) {
      this.#fallbackFromWebSocket();
      return;
    }

    const socket = new this.#WebSocket(`ws://${this.#config.host}:${this.#config.port}/api/v1/ws`);
    this.#socket = socket;
    socket.addEventListener("open", () => {
      if (this.#pollTimer) {
        globalThis.clearInterval(this.#pollTimer);
        this.#pollTimer = 0;
      }
      globalThis.clearTimeout(this.#webSocketRetryTimer);
      this.emit("connection", { state: "connected", message: "" });
    });
    socket.addEventListener("message", (event) => this.#handleSocketMessage(event.data));
    socket.addEventListener("error", () => this.#fallbackFromWebSocket());
    socket.addEventListener("close", () => {
      if (this.#stopped) {
        return;
      }
      if (this.#config.transport === "ws") {
        this.emit("connection", { state: "disconnected", message: "Pear WebSocket disconnected" });
        this.#reconnectTimer = globalThis.setTimeout(() => this.#connectWebSocket(), 3000);
      } else {
        this.#fallbackFromWebSocket();
      }
    });
  }

  #fallbackFromWebSocket() {
    if (this.#config.transport === "ws") {
      return;
    }
    if (!this.#pollTimer) {
      this.emit("connection", { state: "connecting", message: "Using polling fallback" });
      this.#startPolling();
    }
    this.#scheduleWebSocketRetry();
  }

  #startPolling() {
    this.#pollOnce();
    this.#pollTimer = globalThis.setInterval(() => this.#pollOnce(), 3000);
  }

  async #pollOnce() {
    try {
      const response = await this.#requestSong();
      if (response.status === 204) {
        this.emit("connection", { state: "waiting", message: "Pear is reachable. No song is playing." });
        return;
      }
      if (!response.ok) {
        throw new Error(`Pear returned ${response.status}`);
      }
      this.#publishPearPayload(await response.json());
      this.emit("connection", { state: "connected", message: "Polling Pear Desktop" });
    } catch (error) {
      this.emit("connection", { state: "disconnected", message: error.message });
    }
  }

  #requestSong() {
    if (!this.#fetch) {
      throw new Error("Fetch is not available in this browser.");
    }
    return this.#fetch(`http://${this.#config.host}:${this.#config.port}/api/v1/song`);
  }

  #handleSocketMessage(rawMessage) {
    try {
      const message = JSON.parse(rawMessage);
      const eventType = message.type ?? message.event ?? message.eventType;
      if (!["PLAYER_INFO", "VIDEO_CHANGED", "PLAYER_STATE_CHANGED", "POSITION_CHANGED"].includes(eventType)) {
        return;
      }
      const song = message.payload?.song ?? message.data?.song ?? message.song;
      if (song) {
        this.#publishPearPayload({
          ...song,
          elapsedSeconds: readPosition(message, song.elapsedSeconds),
          isPaused: typeof message.isPlaying === "boolean" ? !message.isPlaying : song.isPaused,
        });
        return;
      }
      this.#publishPartialState(message);
    } catch {
      this.emit("connection", { state: "disconnected", message: "Pear sent an unreadable message" });
    }
  }

  #publishPearPayload(payload) {
    this.#state = normalizePearSong(payload);
    this.emit("state", this.#state);
  }

  #publishPartialState(message) {
    if (!this.#state) {
      return;
    }

    this.#state = normalizePlayerState({
      ...this.#state,
      elapsedSeconds: readPosition(message, this.#state.elapsedSeconds),
      isPlaying: typeof message.isPlaying === "boolean" ? message.isPlaying : this.#state.isPlaying,
      updatedAt: Date.now(),
    });
    this.emit("state", this.#state);
  }

  #scheduleWebSocketRetry() {
    if (this.#config.transport !== "auto" || this.#webSocketRetryTimer) {
      return;
    }
    this.#webSocketRetryTimer = globalThis.setTimeout(() => {
      this.#webSocketRetryTimer = 0;
      if (!this.#stopped) {
        this.#connectWebSocket();
      }
    }, 3000);
  }
}

function readPosition(message, fallback) {
  const value = Number(message.position ?? message.payload?.position ?? message.data?.position);
  return Number.isFinite(value) ? value : fallback;
}
