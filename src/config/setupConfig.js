export const SETUP_STORAGE_KEY = "stream-jams.setup";

export const setupDefaults = {
  integration: "pear-youtube-music",
  host: "127.0.0.1",
  port: 26538,
  transport: "auto",
  initialView: "full",
  idleMode: "none",
  idleAfter: 30,
  theme: "dark",
  customCss: "",
};

const SAFE_KEYS = Object.keys(setupDefaults);

export function loadSetupPreferences(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...setupDefaults };
  }
  try {
    const saved = JSON.parse(storage.getItem(SETUP_STORAGE_KEY) || "{}");
    return sanitizeSetupPreferences(saved);
  } catch {
    return { ...setupDefaults };
  }
}

export function saveSetupPreferences(values, storage = globalThis.localStorage) {
  if (!storage) {
    return;
  }
  storage.setItem(SETUP_STORAGE_KEY, JSON.stringify(sanitizeSetupPreferences(values)));
}

export function sanitizeSetupPreferences(values) {
  const next = { ...setupDefaults };
  for (const key of SAFE_KEYS) {
    if (Object.hasOwn(values ?? {}, key)) {
      next[key] = values[key];
    }
  }
  next.port = clampInteger(next.port, setupDefaults.port, 1, 65535);
  next.idleAfter = clampInteger(next.idleAfter, setupDefaults.idleAfter, 1, 600);
  return next;
}

export function buildOverlayUrl(values, baseHref = globalThis.location?.href ?? "") {
  const base = new URL("index.html", baseHref);
  const settings = sanitizeSetupPreferences(values);
  for (const [key, value] of Object.entries(settings)) {
    if (value !== "" && value !== undefined && value !== null) {
      base.searchParams.set(key, String(value));
    }
  }
  return base.href;
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}
