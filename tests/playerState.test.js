import assert from "node:assert/strict";
import test from "node:test";

import { normalizePearSong, normalizePlayerState } from "../src/state/playerState.js";

test("normalizePearSong maps Pear song payloads to the source-neutral player state", () => {
  const state = normalizePearSong(
    {
      title: "Night Drive",
      artist: "Aster Pulse",
      album: "Late Signals",
      imageSrc: "https://example.test/art.jpg",
      isPaused: false,
      songDuration: 211,
      elapsedSeconds: 42,
      videoId: "abc123",
    },
    1000,
  );

  assert.deepEqual(state, {
    trackId: "abc123",
    title: "Night Drive",
    artist: "Aster Pulse",
    album: "Late Signals",
    artworkUrl: "https://example.test/art.jpg",
    durationSeconds: 211,
    elapsedSeconds: 42,
    isPlaying: true,
    sourceName: "YouTube Music",
    updatedAt: 1000,
  });
});

test("normalizePlayerState clamps invalid progress values and fills display fallbacks", () => {
  const state = normalizePlayerState({
    durationSeconds: -4,
    elapsedSeconds: 500,
    isPlaying: false,
  });

  assert.equal(state.title, "No track");
  assert.equal(state.artist, "Unknown artist");
  assert.equal(state.album, "");
  assert.equal(state.durationSeconds, 0);
  assert.equal(state.elapsedSeconds, 0);
  assert.equal(state.isPlaying, false);
});
