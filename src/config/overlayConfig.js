const INTEGRATIONS = new Set(["pear-youtube-music", "mock"]);
const TRANSPORTS = new Set(["auto", "ws", "poll"]);
const VIEWS = new Set(["full", "compact"]);
const IDLE_MODES = new Set(["none", "hide", "compact"]);
const THEMES = new Set(["dark", "light"]);

export function parseOverlayConfig(input = globalThis.location?.href ?? "") {
  const url = new URL(input, "http://localhost/index.html");
  const params = url.searchParams;
  const integration = params.get("integration") ?? "";
  const errors = [];

  if (!integration) {
    errors.push("Missing integration. Open setup.html to generate an overlay URL.");
  } else if (!INTEGRATIONS.has(integration)) {
    errors.push(`Unsupported integration: ${integration}`);
  }

  const transport = readEnum(params, "transport", TRANSPORTS, "auto", errors);
  const initialView = readEnum(params, "initialView", VIEWS, "full", errors);
  const idleMode = readEnum(params, "idleMode", IDLE_MODES, "none", errors);
  const theme = readEnum(params, "theme", THEMES, "dark", errors);
  const idleAfter = readInteger(params, "idleAfter", 30, { min: 1, max: 600 }, errors);
  const backgroundOpacity = readInteger(params, "backgroundOpacity", 84, { min: 0, max: 100 }, errors);
  const customCss = normalizeCustomCss(params.get("customCss") ?? "", errors);

  let host = "";
  let port = 0;

  if (integration === "pear-youtube-music") {
    host = (params.get("host") || "127.0.0.1").trim();
    port = readInteger(params, "port", 26538, { min: 1, max: 65535 }, errors);
    if (!host) {
      errors.push("Host is required for Pear YouTube Music.");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    integration,
    host,
    port,
    transport,
    initialView,
    idleMode,
    idleAfter,
    theme,
    backgroundOpacity,
    customCss,
  };
}

function readEnum(params, key, allowed, fallback, errors) {
  const value = params.get(key) || fallback;
  if (!allowed.has(value)) {
    errors.push(`${key} must be one of: ${Array.from(allowed).join(", ")}`);
    return fallback;
  }
  return value;
}

function readInteger(params, key, fallback, bounds, errors) {
  const raw = params.get(key);
  if (raw === null || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < bounds.min || value > bounds.max) {
    errors.push(`${key} must be an integer from ${bounds.min} to ${bounds.max}`);
    return fallback;
  }
  return value;
}

function normalizeCustomCss(value, errors) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("/") || trimmed.includes("..")) {
    errors.push("customCss must be a same-folder or same-origin relative path.");
    return "";
  }
  return trimmed;
}
