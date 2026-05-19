export const SETUP_STORAGE_KEY = "stream-jams.setup";

export const setupIntegrations = [
  {
    id: "pear-youtube-music",
    name: "Pear Desktop",
    description: "Use Pear Desktop's API Server plugin to read YouTube Music playback from this machine.",
    status: "available",
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Spotify setup is planned for a future release.",
    status: "coming-soon",
  },
];

export const widgetAlignments = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "center-left", label: "Center left" },
  { value: "center-right", label: "Center right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

export const setupDefaults = {
  integration: "pear-youtube-music",
  host: "127.0.0.1",
  port: 26538,
  transport: "auto",
  initialView: "full",
  idleMode: "none",
  idleAfter: 30,
  theme: "dark",
  backgroundOpacity: 84,
  widgetAlignment: "bottom-left",
};

const SAFE_KEYS = Object.keys(setupDefaults);
const WIDGET_ALIGNMENT_VALUES = new Set(widgetAlignments.map((alignment) => alignment.value));

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
  next.backgroundOpacity = clampInteger(next.backgroundOpacity, setupDefaults.backgroundOpacity, 0, 100);
  next.widgetAlignment = WIDGET_ALIGNMENT_VALUES.has(next.widgetAlignment)
    ? next.widgetAlignment
    : setupDefaults.widgetAlignment;
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
