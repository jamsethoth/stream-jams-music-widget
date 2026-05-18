export function getDisplayedProgress(state, now = Date.now()) {
  const durationSeconds = Math.max(0, Number(state?.durationSeconds) || 0);
  const baseElapsed = Math.max(0, Number(state?.elapsedSeconds) || 0);
  const updatedAt = Number(state?.updatedAt) || now;
  const deltaSeconds = state?.isPlaying ? Math.max(0, now - updatedAt) / 1000 : 0;
  const elapsedSeconds = durationSeconds
    ? Math.min(durationSeconds, baseElapsed + deltaSeconds)
    : baseElapsed + deltaSeconds;
  const percent = durationSeconds ? (elapsedSeconds / durationSeconds) * 100 : 0;

  return {
    elapsedSeconds,
    durationSeconds,
    percent: Math.min(100, Math.max(0, percent)),
  };
}

export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
