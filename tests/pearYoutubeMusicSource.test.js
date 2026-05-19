import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { PearYoutubeMusicSource } from "../src/sources/pearYoutubeMusicSource.js";

const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

afterEach(() => {
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
});

test("PearYoutubeMusicSource preserves metadata when websocket sends position-only updates", () => {
  const socket = createSocketHarness();
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "ws" },
    { WebSocket: socket.WebSocket },
  );
  const states = [];
  source.on("state", (state) => states.push(state));

  source.connect();
  socket.emit("message", {
    data: JSON.stringify({
      type: "VIDEO_CHANGED",
      song: {
        title: "Night Drive",
        artist: "Aster Pulse",
        album: "Late Signals",
        imageSrc: "https://example.test/art.jpg",
        isPaused: false,
        songDuration: 211,
        elapsedSeconds: 0,
        videoId: "abc123",
      },
      position: 0,
    }),
  });
  socket.emit("message", {
    data: JSON.stringify({
      type: "POSITION_CHANGED",
      position: 15,
    }),
  });

  assert.equal(states.length, 2);
  assert.equal(states[1].title, "Night Drive");
  assert.equal(states[1].artist, "Aster Pulse");
  assert.equal(states[1].album, "Late Signals");
  assert.equal(states[1].elapsedSeconds, 15);
  assert.equal(states[1].isPlaying, true);
});

test("PearYoutubeMusicSource preserves metadata when websocket sends play-state-only updates", () => {
  const socket = createSocketHarness();
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "ws" },
    { WebSocket: socket.WebSocket },
  );
  source.connect();
  socket.emit("message", {
    data: JSON.stringify({
      type: "PLAYER_INFO",
      song: {
        title: "Night Drive",
        artist: "Aster Pulse",
        album: "Late Signals",
        imageSrc: "https://example.test/art.jpg",
        isPaused: false,
        songDuration: 211,
        elapsedSeconds: 12,
        videoId: "abc123",
      },
      isPlaying: true,
      position: 12,
    }),
  });
  socket.emit("message", {
    data: JSON.stringify({
      type: "PLAYER_STATE_CHANGED",
      isPlaying: false,
      position: 18,
    }),
  });

  const state = source.getCurrentState();
  assert.equal(state.title, "Night Drive");
  assert.equal(state.artist, "Aster Pulse");
  assert.equal(state.elapsedSeconds, 18);
  assert.equal(state.isPlaying, false);
});

test("PearYoutubeMusicSource preserves existing album when same-track websocket update omits album", () => {
  const socket = createSocketHarness();
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "ws" },
    { WebSocket: socket.WebSocket },
  );

  source.connect();
  socket.emit("message", {
    data: JSON.stringify({
      type: "PLAYER_INFO",
      song: {
        title: "Night Drive",
        artist: "Aster Pulse",
        album: "Late Signals",
        imageSrc: "https://example.test/art.jpg",
        isPaused: false,
        songDuration: 211,
        elapsedSeconds: 12,
        videoId: "abc123",
      },
      isPlaying: true,
      position: 12,
    }),
  });
  socket.emit("message", {
    data: JSON.stringify({
      type: "PLAYER_INFO",
      song: {
        title: "Night Drive",
        artist: "Aster Pulse",
        album: null,
        imageSrc: "https://example.test/art.jpg",
        isPaused: false,
        songDuration: 211,
        elapsedSeconds: 18,
        videoId: "abc123",
      },
      isPlaying: true,
      position: 18,
    }),
  });

  const state = source.getCurrentState();
  assert.equal(state.title, "Night Drive");
  assert.equal(state.artist, "Aster Pulse");
  assert.equal(state.album, "Late Signals");
  assert.equal(state.elapsedSeconds, 18);
});

test("PearYoutubeMusicSource emits blank album for a new track when Pear provides no album", () => {
  const socket = createSocketHarness();
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "ws" },
    { WebSocket: socket.WebSocket },
  );

  source.connect();
  socket.emit("message", {
    data: JSON.stringify({
      type: "PLAYER_INFO",
      song: {
        title: "Night Drive",
        artist: "Aster Pulse",
        album: "Late Signals",
        isPaused: false,
        songDuration: 211,
        elapsedSeconds: 12,
        videoId: "abc123",
      },
    }),
  });
  socket.emit("message", {
    data: JSON.stringify({
      type: "VIDEO_CHANGED",
      song: {
        title: "No Album Track",
        artist: "Aster Pulse",
        album: null,
        isPaused: false,
        songDuration: 180,
        elapsedSeconds: 0,
        videoId: "def456",
      },
    }),
  });

  const state = source.getCurrentState();
  assert.equal(state.title, "No Album Track");
  assert.equal(state.album, "");
});

test("PearYoutubeMusicSource maps Pear album to display details", () => {
  const socket = createSocketHarness();
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "ws" },
    { WebSocket: socket.WebSocket },
  );

  source.connect();
  socket.emit("message", {
    data: JSON.stringify({
      type: "VIDEO_CHANGED",
      song: {
        title: "Night Drive",
        artist: "Aster Pulse",
        album: "Late Signals",
        isPaused: false,
        songDuration: 211,
        elapsedSeconds: 0,
        videoId: "abc123",
      },
    }),
  });

  assert.equal(source.getCurrentState().album, "Late Signals");
});

test("PearYoutubeMusicSource keeps polling after failed poll attempts", async () => {
  const intervalCallbacks = [];
  globalThis.setInterval = (callback) => {
    intervalCallbacks.push(callback);
    return intervalCallbacks.length;
  };
  globalThis.clearInterval = () => {};
  let attempts = 0;
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "poll" },
    {
      fetch: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("offline");
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            title: "Back Online",
            artist: "Aster Pulse",
            album: "Recovered",
            isPaused: false,
            songDuration: 120,
            elapsedSeconds: 4,
            videoId: "online",
          }),
        };
      },
    },
  );

  source.connect();
  await flushPromises();
  assert.equal(source.getCurrentState(), null);
  assert.equal(intervalCallbacks.length, 1);

  await intervalCallbacks[0]();
  assert.equal(source.getCurrentState().title, "Back Online");
  assert.equal(attempts, 2);
});

test("PearYoutubeMusicSource periodically reconnects websocket-only transport after connection closes", () => {
  const timeoutCallbacks = [];
  globalThis.setTimeout = (callback) => {
    timeoutCallbacks.push(callback);
    return timeoutCallbacks.length;
  };
  globalThis.clearTimeout = () => {};
  const socket = createSocketHarness();
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "ws" },
    { WebSocket: socket.WebSocket },
  );
  const connections = [];
  source.on("connection", (connection) => connections.push(connection.state));

  source.connect();
  socket.emit("close", {});

  assert.equal(socket.instances.length, 1);
  assert.equal(timeoutCallbacks.length, 1);
  timeoutCallbacks[0]();
  assert.equal(socket.instances.length, 2);
  assert.deepEqual(connections, ["connecting", "disconnected"]);
});

test("PearYoutubeMusicSource periodically retries websocket after auto fallback", () => {
  const timeoutCallbacks = [];
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};
  globalThis.setTimeout = (callback) => {
    timeoutCallbacks.push(callback);
    return timeoutCallbacks.length;
  };
  globalThis.clearTimeout = () => {};
  const socket = createSocketHarness();
  const source = new PearYoutubeMusicSource(
    { integration: "pear-youtube-music", host: "127.0.0.1", port: 26538, transport: "auto" },
    {
      WebSocket: socket.WebSocket,
      fetch: async () => {
        throw new Error("offline");
      },
    },
  );

  source.connect();
  socket.emit("error", {});

  assert.equal(socket.instances.length, 1);
  assert.equal(timeoutCallbacks.length, 1);
  timeoutCallbacks[0]();
  assert.equal(socket.instances.length, 2);
  socket.emit("error", {});
  assert.equal(timeoutCallbacks.length, 2);
  timeoutCallbacks[1]();
  assert.equal(socket.instances.length, 3);
  source.disconnect();
});

function createSocketHarness() {
  const listeners = new Map();
  const instances = [];
  return {
    WebSocket: class {
      constructor() {
        const instance = {
          addEventListener(type, handler) {
            listeners.set(type, handler);
          },
          close() {},
        };
        instances.push(instance);
        return instance;
      }
    },
    instances,
    emit(type, event) {
      listeners.get(type)(event);
    },
  };
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
