export function normalizePearSong(payload, now = Date.now()) {
  return normalizePlayerState({
    trackId: payload.videoId || payload.url || payload.title,
    title: payload.title,
    artist: payload.artist,
    album: payload.album,
    artworkUrl: payload.imageSrc,
    durationSeconds: payload.songDuration,
    elapsedSeconds: payload.elapsedSeconds,
    isPlaying: payload.isPaused === false,
    sourceName: "YouTube Music",
    updatedAt: now,
  });
}

export function normalizePlayerState(input = {}) {
  const durationSeconds = positiveNumber(input.durationSeconds);
  const elapsedSeconds = clamp(positiveNumber(input.elapsedSeconds), 0, durationSeconds || 0);

  return {
    trackId: stringOrFallback(input.trackId, ""),
    title: stringOrFallback(input.title, "No track"),
    artist: stringOrFallback(input.artist, "Unknown artist"),
    album: stringOrFallback(input.album, ""),
    artworkUrl: stringOrFallback(input.artworkUrl, ""),
    durationSeconds,
    elapsedSeconds,
    isPlaying: Boolean(input.isPlaying),
    sourceName: stringOrFallback(input.sourceName, ""),
    updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt : Date.now(),
  };
}

function stringOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clamp(value, min, max) {
  if (max <= min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
