import assert from "node:assert/strict";
import test from "node:test";

import { getDisplayedProgress } from "../src/state/progressClock.js";

test("getDisplayedProgress advances elapsed seconds while playback is active", () => {
  const progress = getDisplayedProgress(
    {
      elapsedSeconds: 20,
      durationSeconds: 180,
      isPlaying: true,
      updatedAt: 1_000,
    },
    6_500,
  );

  assert.equal(progress.elapsedSeconds, 25.5);
  assert.equal(progress.percent, 14.166666666666666);
});

test("getDisplayedProgress stays fixed while paused and caps at duration", () => {
  const paused = getDisplayedProgress(
    {
      elapsedSeconds: 20,
      durationSeconds: 180,
      isPlaying: false,
      updatedAt: 1_000,
    },
    6_500,
  );
  const capped = getDisplayedProgress(
    {
      elapsedSeconds: 179,
      durationSeconds: 180,
      isPlaying: true,
      updatedAt: 1_000,
    },
    6_500,
  );

  assert.equal(paused.elapsedSeconds, 20);
  assert.equal(capped.elapsedSeconds, 180);
  assert.equal(capped.percent, 100);
});
