import assert from "node:assert/strict";
import test from "node:test";

import { PearYoutubeMusicSource } from "../src/sources/pearYoutubeMusicSource.js";

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

function createSocketHarness() {
  const listeners = new Map();
  return {
    WebSocket: class {
      constructor() {
        return {
          addEventListener(type, handler) {
            listeners.set(type, handler);
          },
          close() {},
        };
      }
    },
    emit(type, event) {
      listeners.get(type)(event);
    },
  };
}
