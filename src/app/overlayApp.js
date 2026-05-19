import { parseOverlayConfig } from "../config/overlayConfig.js";
import { createMusicSource } from "../sources/sourceRegistry.js";
import { OverlayView } from "../ui/overlayView.js";

export function startOverlayApp(root = document.querySelector("#app"), href = globalThis.location.href) {
  const config = parseOverlayConfig(href);
  const view = new OverlayView(root);

  if (!config.ok) {
    view.renderConfigurationError(config.errors);
    return { config, stop() {} };
  }

  view.setTheme(config.theme);
  view.setBackgroundOpacity(config.backgroundOpacity);
  view.setAlignment(config.widgetAlignment);
  view.setView(config.initialView);
  loadOptionalCustomTheme();

  const source = createMusicSource(config);
  let currentView = config.initialView;
  let idleTimer = 0;
  let progressTimer = 0;
  let latestState = null;

  const restoreInitialView = () => {
    currentView = config.initialView;
    view.setView(currentView);
    scheduleIdle();
  };

  const scheduleIdle = () => {
    globalThis.clearTimeout(idleTimer);
    if (config.idleMode === "none") {
      return;
    }
    idleTimer = globalThis.setTimeout(() => {
      currentView = config.idleMode === "hide" ? "hidden" : "compact";
      view.setView(currentView);
    }, config.idleAfter * 1000);
  };

  source.on("connection", (connection) => {
    view.renderConnection(connection);
    if (["connected", "waiting"].includes(connection.state)) {
      restoreInitialView();
    }
  });

  source.on("state", (state) => {
    const previousTrackId = latestState?.trackId;
    latestState = state;
    view.renderTrack(state);
    if (state.trackId && state.trackId !== previousTrackId) {
      restoreInitialView();
    }
  });

  source.connect();
  progressTimer = globalThis.setInterval(() => {
    if (latestState && currentView !== "hidden") {
      view.renderTrack(latestState);
    }
  }, 1000);
  scheduleIdle();

  return {
    config,
    stop() {
      globalThis.clearTimeout(idleTimer);
      globalThis.clearInterval(progressTimer);
      source.disconnect();
    },
  };
}

export function createCustomThemeStylesheet(environment = globalThis) {
  const link = environment.document.createElement("link");
  link.rel = "stylesheet";
  link.href = "styles/custom-theme.css";
  link.dataset.optional = "true";
  return link;
}

function loadOptionalCustomTheme() {
  const link = createCustomThemeStylesheet();
  link.addEventListener("error", () => link.remove(), { once: true });
  document.head.append(link);
}

if (typeof document !== "undefined") {
  startOverlayApp();
}
