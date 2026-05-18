(function () {
  "use strict";

  var INTEGRATIONS = ["pear-youtube-music", "mock"];
  var TRANSPORTS = ["auto", "ws", "poll"];
  var VIEWS = ["full", "compact"];
  var IDLE_MODES = ["none", "hide", "compact"];
  var THEMES = ["dark", "light"];

  function parseOverlayConfig(input) {
    var url = new URL(input || window.location.href, "http://localhost/index.html");
    var params = url.searchParams;
    var integration = params.get("integration") || "";
    var errors = [];

    if (!integration) {
      errors.push("Missing integration. Open setup.html to generate an overlay URL.");
    } else if (INTEGRATIONS.indexOf(integration) === -1) {
      errors.push("Unsupported integration: " + integration);
    }

    var config = {
      integration: integration,
      host: "",
      port: 0,
      transport: readEnum(params, "transport", TRANSPORTS, "auto", errors),
      initialView: readEnum(params, "initialView", VIEWS, "full", errors),
      idleMode: readEnum(params, "idleMode", IDLE_MODES, "none", errors),
      idleAfter: readInteger(params, "idleAfter", 30, 1, 600, errors),
      theme: readEnum(params, "theme", THEMES, "dark", errors),
      customCss: normalizeCustomCss(params.get("customCss") || "", errors),
    };

    if (integration === "pear-youtube-music") {
      config.host = (params.get("host") || "127.0.0.1").trim();
      config.port = readInteger(params, "port", 26538, 1, 65535, errors);
      if (!config.host) {
        errors.push("Host is required for Pear YouTube Music.");
      }
    }

    if (errors.length) {
      return { ok: false, errors: errors };
    }

    config.ok = true;
    return config;
  }

  function readEnum(params, key, allowed, fallback, errors) {
    var value = params.get(key) || fallback;
    if (allowed.indexOf(value) === -1) {
      errors.push(key + " must be one of: " + allowed.join(", "));
      return fallback;
    }
    return value;
  }

  function readInteger(params, key, fallback, min, max, errors) {
    var raw = params.get(key);
    if (raw === null || raw === "") {
      return fallback;
    }
    var value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      errors.push(key + " must be an integer from " + min + " to " + max);
      return fallback;
    }
    return value;
  }

  function normalizeCustomCss(value, errors) {
    var trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.charAt(0) === "/" || trimmed.indexOf("..") !== -1) {
      errors.push("customCss must be a same-folder or same-origin relative path.");
      return "";
    }
    return trimmed;
  }

  function normalizePearSong(payload) {
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
      updatedAt: Date.now(),
    });
  }

  function normalizePlayerState(input) {
    input = input || {};
    var durationSeconds = positiveNumber(input.durationSeconds);
    var elapsedSeconds = clamp(positiveNumber(input.elapsedSeconds), 0, durationSeconds || 0);
    return {
      trackId: stringOrFallback(input.trackId, ""),
      title: stringOrFallback(input.title, "No track"),
      artist: stringOrFallback(input.artist, "Unknown artist"),
      album: stringOrFallback(input.album, ""),
      artworkUrl: stringOrFallback(input.artworkUrl, ""),
      durationSeconds: durationSeconds,
      elapsedSeconds: elapsedSeconds,
      isPlaying: Boolean(input.isPlaying),
      sourceName: stringOrFallback(input.sourceName, ""),
      updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt : Date.now(),
    };
  }

  function stringOrFallback(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function positiveNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function clamp(value, min, max) {
    return max <= min ? min : Math.min(max, Math.max(min, value));
  }

  function getDisplayedProgress(state) {
    var now = Date.now();
    var durationSeconds = Math.max(0, Number(state && state.durationSeconds) || 0);
    var baseElapsed = Math.max(0, Number(state && state.elapsedSeconds) || 0);
    var updatedAt = Number(state && state.updatedAt) || now;
    var deltaSeconds = state && state.isPlaying ? Math.max(0, now - updatedAt) / 1000 : 0;
    var elapsedSeconds = durationSeconds
      ? Math.min(durationSeconds, baseElapsed + deltaSeconds)
      : baseElapsed + deltaSeconds;
    var percent = durationSeconds ? (elapsedSeconds / durationSeconds) * 100 : 0;
    return {
      elapsedSeconds: elapsedSeconds,
      durationSeconds: durationSeconds,
      percent: Math.min(100, Math.max(0, percent)),
    };
  }

  function formatTime(totalSeconds) {
    var safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var minutes = Math.floor(safeSeconds / 60);
    var seconds = String(safeSeconds % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function EventEmitter() {
    this.listeners = {};
  }

  EventEmitter.prototype.on = function (type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  };

  EventEmitter.prototype.emit = function (type, payload) {
    (this.listeners[type] || []).forEach(function (handler) {
      handler(payload);
    });
  };

  function MockMusicSource() {
    EventEmitter.call(this);
    this.timer = 0;
    this.startedAt = 0;
    this.trackIndex = 0;
    this.state = null;
  }

  MockMusicSource.prototype = Object.create(EventEmitter.prototype);
  MockMusicSource.prototype.constructor = MockMusicSource;
  MockMusicSource.prototype.tracks = [
    {
      trackId: "demo-1",
      title: "Midnight Channel",
      artist: "Stream Jams",
      album: "Overlay Tests",
      durationSeconds: 184,
      artworkUrl: "",
    },
    {
      trackId: "demo-2",
      title: "Low Latency Lights",
      artist: "Aster Pulse",
      album: "Scene Switch",
      durationSeconds: 216,
      artworkUrl: "",
    },
  ];
  MockMusicSource.prototype.connect = function () {
    var self = this;
    this.emit("connection", { state: "connected", message: "Mock source connected" });
    this.startedAt = Date.now();
    this.publish();
    this.timer = window.setInterval(function () {
      self.publish();
    }, 1000);
  };
  MockMusicSource.prototype.disconnect = function () {
    window.clearInterval(this.timer);
    this.emit("connection", { state: "disconnected", message: "Mock source disconnected" });
  };
  MockMusicSource.prototype.publish = function () {
    var track = this.tracks[this.trackIndex];
    var elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    if (elapsedSeconds >= track.durationSeconds) {
      this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
      this.startedAt = Date.now();
    }
    this.state = normalizePlayerState(
      Object.assign({}, this.tracks[this.trackIndex], {
        elapsedSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
        isPlaying: true,
        sourceName: "Mock",
        updatedAt: Date.now(),
      }),
    );
    this.emit("state", this.state);
  };

  function PearYoutubeMusicSource(config) {
    EventEmitter.call(this);
    this.config = config;
    this.socket = null;
    this.pollTimer = 0;
    this.reconnectTimer = 0;
    this.state = null;
    this.stopped = false;
  }

  PearYoutubeMusicSource.prototype = Object.create(EventEmitter.prototype);
  PearYoutubeMusicSource.prototype.constructor = PearYoutubeMusicSource;
  PearYoutubeMusicSource.prototype.connect = function () {
    this.stopped = false;
    this.emit("connection", { state: "connecting", message: "Connecting to Pear Desktop" });
    if (this.config.transport === "poll") {
      this.startPolling();
    } else {
      this.connectWebSocket();
    }
  };
  PearYoutubeMusicSource.prototype.disconnect = function () {
    this.stopped = true;
    window.clearInterval(this.pollTimer);
    window.clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
    }
    this.emit("connection", { state: "disconnected", message: "Disconnected" });
  };
  PearYoutubeMusicSource.prototype.connectWebSocket = function () {
    var self = this;
    if (!window.WebSocket) {
      this.fallbackFromWebSocket();
      return;
    }
    this.socket = new WebSocket("ws://" + this.config.host + ":" + this.config.port + "/api/v1/ws");
    this.socket.addEventListener("open", function () {
      self.emit("connection", { state: "connected", message: "Live updates connected" });
    });
    this.socket.addEventListener("message", function (event) {
      self.handleSocketMessage(event.data);
    });
    this.socket.addEventListener("error", function () {
      self.fallbackFromWebSocket();
    });
    this.socket.addEventListener("close", function () {
      if (self.stopped) {
        return;
      }
      if (self.config.transport === "ws") {
        self.emit("connection", { state: "disconnected", message: "Pear WebSocket disconnected" });
        self.reconnectTimer = window.setTimeout(function () {
          self.connectWebSocket();
        }, 3000);
      } else {
        self.fallbackFromWebSocket();
      }
    });
  };
  PearYoutubeMusicSource.prototype.fallbackFromWebSocket = function () {
    if (this.config.transport === "ws" || this.pollTimer) {
      return;
    }
    this.emit("connection", { state: "connecting", message: "Using polling fallback" });
    this.startPolling();
  };
  PearYoutubeMusicSource.prototype.startPolling = function () {
    var self = this;
    this.pollOnce();
    this.pollTimer = window.setInterval(function () {
      self.pollOnce();
    }, 3000);
  };
  PearYoutubeMusicSource.prototype.pollOnce = function () {
    var self = this;
    fetch("http://" + this.config.host + ":" + this.config.port + "/api/v1/song")
      .then(function (response) {
        if (response.status === 204) {
          self.emit("connection", { state: "waiting", message: "Pear is reachable. No song is playing." });
          return null;
        }
        if (!response.ok) {
          throw new Error("Pear returned " + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        if (!payload) {
          return;
        }
        self.publishPearPayload(payload);
        self.emit("connection", { state: "connected", message: "Polling Pear Desktop" });
      })
      .catch(function (error) {
        self.emit("connection", { state: "disconnected", message: error.message });
      });
  };
  PearYoutubeMusicSource.prototype.handleSocketMessage = function (rawMessage) {
    try {
      var message = JSON.parse(rawMessage);
      var eventType = message.type || message.event || message.eventType;
      if (["PLAYER_INFO", "VIDEO_CHANGED", "PLAYER_STATE_CHANGED", "POSITION_CHANGED"].indexOf(eventType) === -1) {
        return;
      }
      this.publishPearPayload(message.payload || message.data || message.song || message);
    } catch (error) {
      this.emit("connection", { state: "disconnected", message: "Pear sent an unreadable message" });
    }
  };
  PearYoutubeMusicSource.prototype.publishPearPayload = function (payload) {
    this.state = normalizePearSong(payload);
    this.emit("state", this.state);
  };

  function OverlayView(root) {
    this.root = root;
    root.innerHTML =
      '<section class="sj-widget" aria-live="polite">' +
      '<div class="sj-art" aria-hidden="true"><span>SJ</span></div>' +
      '<div class="sj-copy">' +
      '<div class="sj-source"></div>' +
      '<h1 class="sj-title">Connecting...</h1>' +
      '<p class="sj-artist"></p>' +
      '<p class="sj-album"></p>' +
      '<div class="sj-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="sj-progress-fill"></span></div>' +
      '<div class="sj-meta"><span class="sj-status">Starting overlay</span><span class="sj-time">0:00 / 0:00</span></div>' +
      "</div></section>";
    this.statusEl = root.querySelector(".sj-status");
    this.artEl = root.querySelector(".sj-art");
    this.titleEl = root.querySelector(".sj-title");
    this.artistEl = root.querySelector(".sj-artist");
    this.albumEl = root.querySelector(".sj-album");
    this.sourceEl = root.querySelector(".sj-source");
    this.progressEl = root.querySelector(".sj-progress");
    this.progressFillEl = root.querySelector(".sj-progress-fill");
    this.timeEl = root.querySelector(".sj-time");
  }

  OverlayView.prototype.setTheme = function (theme) {
    document.documentElement.dataset.theme = theme;
  };
  OverlayView.prototype.setView = function (view) {
    this.root.dataset.view = view;
  };
  OverlayView.prototype.renderConfigurationError = function (errors) {
    this.root.innerHTML =
      '<section class="sj-widget sj-error" aria-live="assertive"><div class="sj-copy">' +
      '<h1 class="sj-title">Widget setup needed</h1>' +
      '<p class="sj-artist">' +
      escapeHtml(errors.join(" ")) +
      '</p><a class="sj-link" href="setup.html">Open setup</a></div></section>';
  };
  OverlayView.prototype.renderConnection = function (connection) {
    this.statusEl.textContent = connection.message;
    this.root.dataset.connection = connection.state;
    if (connection.state === "waiting") {
      this.titleEl.textContent = "Waiting for music";
      this.artistEl.textContent = "Start a track in YouTube Music";
      this.albumEl.textContent = "";
    }
  };
  OverlayView.prototype.renderTrack = function (state) {
    var progress = getDisplayedProgress(state);
    this.titleEl.textContent = state.title;
    this.artistEl.textContent = state.artist;
    this.albumEl.textContent = state.album;
    this.sourceEl.textContent = state.sourceName;
    this.progressEl.setAttribute("aria-valuenow", String(Math.round(progress.percent)));
    this.progressFillEl.style.inlineSize = progress.percent + "%";
    this.timeEl.textContent = formatTime(progress.elapsedSeconds) + " / " + formatTime(progress.durationSeconds);
    if (state.artworkUrl) {
      this.artEl.style.backgroundImage = 'url("' + state.artworkUrl.replace(/"/g, "%22") + '")';
      this.artEl.classList.add("has-art");
    } else {
      this.artEl.style.backgroundImage = "";
      this.artEl.classList.remove("has-art");
    }
  };

  function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function createMusicSource(config) {
    if (config.integration === "mock") {
      return new MockMusicSource();
    }
    return new PearYoutubeMusicSource(config);
  }

  function startOverlayApp() {
    var root = document.querySelector("#app");
    var config = parseOverlayConfig(window.location.href);
    var view = new OverlayView(root);
    if (!config.ok) {
      view.renderConfigurationError(config.errors);
      return;
    }

    view.setTheme(config.theme);
    view.setView(config.initialView);
    loadCustomCss(config.customCss);

    var source = createMusicSource(config);
    var currentView = config.initialView;
    var idleTimer = 0;
    var latestState = null;

    function restoreInitialView() {
      currentView = config.initialView;
      view.setView(currentView);
      scheduleIdle();
    }

    function scheduleIdle() {
      window.clearTimeout(idleTimer);
      if (config.idleMode === "none") {
        return;
      }
      idleTimer = window.setTimeout(function () {
        currentView = config.idleMode === "hide" ? "hidden" : "compact";
        view.setView(currentView);
      }, config.idleAfter * 1000);
    }

    source.on("connection", function (connection) {
      view.renderConnection(connection);
      if (connection.state === "connected" || connection.state === "waiting") {
        restoreInitialView();
      }
    });
    source.on("state", function (state) {
      var previousTrackId = latestState && latestState.trackId;
      latestState = state;
      view.renderTrack(state);
      if (state.trackId && state.trackId !== previousTrackId) {
        restoreInitialView();
      }
    });
    source.connect();
    window.setInterval(function () {
      if (latestState && currentView !== "hidden") {
        view.renderTrack(latestState);
      }
    }, 1000);
    scheduleIdle();
  }

  function loadCustomCss(path) {
    if (!path) {
      return;
    }
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = path;
    document.head.appendChild(link);
  }

  startOverlayApp();
})();
