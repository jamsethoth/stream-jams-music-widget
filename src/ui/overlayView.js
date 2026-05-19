import { formatTime, getDisplayedProgress } from "../state/progressClock.js";

export class OverlayView {
  #root;
  #statusEl;
  #artEl;
  #titleEl;
  #artistEl;
  #albumEl;
  #sourceEl;
  #progressEl;
  #timeEl;

  constructor(root) {
    this.#root = root;
    this.#root.innerHTML = `
      <section class="sj-widget" aria-live="polite">
        <div class="sj-art" aria-hidden="true"><span>SJ</span></div>
        <div class="sj-copy">
          <div class="sj-source"></div>
          <h1 class="sj-title">Connecting...</h1>
          <p class="sj-artist"></p>
          <p class="sj-album"></p>
          <div class="sj-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <span class="sj-progress-fill"></span>
          </div>
          <div class="sj-meta">
            <span class="sj-status">Starting overlay</span>
            <span class="sj-time">0:00 / 0:00</span>
          </div>
        </div>
      </section>
    `;
    this.#statusEl = this.#root.querySelector(".sj-status");
    this.#artEl = this.#root.querySelector(".sj-art");
    this.#titleEl = this.#root.querySelector(".sj-title");
    this.#artistEl = this.#root.querySelector(".sj-artist");
    this.#albumEl = this.#root.querySelector(".sj-album");
    this.#sourceEl = this.#root.querySelector(".sj-source");
    this.#progressEl = this.#root.querySelector(".sj-progress");
    this.#timeEl = this.#root.querySelector(".sj-time");
  }

  setTheme(theme) {
    document.documentElement.dataset.theme = theme;
  }

  setView(view) {
    this.#root.dataset.view = view;
  }

  renderConfigurationError(errors) {
    this.#root.innerHTML = `
      <section class="sj-widget sj-error" aria-live="assertive">
        <div class="sj-copy">
          <h1 class="sj-title">Widget setup needed</h1>
          <p class="sj-error-message">${escapeHtml(errors.join(" "))}</p>
          <a class="sj-link" href="setup.html">Open setup</a>
        </div>
      </section>
    `;
  }

  renderConnection(connection) {
    this.#statusEl.textContent = connection.message;
    this.#root.dataset.connection = connection.state;
    if (connection.state === "waiting") {
      this.#titleEl.textContent = "Waiting for music";
      this.#artistEl.textContent = "Start a track in YouTube Music";
      this.#albumEl.textContent = "";
    }
  }

  renderTrack(state, now = Date.now()) {
    const progress = getDisplayedProgress(state, now);
    this.#titleEl.textContent = state.title;
    this.#artistEl.textContent = state.artist;
    this.#albumEl.textContent = state.album;
    this.#sourceEl.textContent = state.sourceName;
    this.#progressEl.setAttribute("aria-valuenow", String(Math.round(progress.percent)));
    this.#progressEl.querySelector(".sj-progress-fill").style.inlineSize = `${progress.percent}%`;
    this.#timeEl.textContent = `${formatTime(progress.elapsedSeconds)} / ${formatTime(progress.durationSeconds)}`;

    if (state.artworkUrl) {
      this.#artEl.style.backgroundImage = `url("${state.artworkUrl.replaceAll('"', "%22")}")`;
      this.#artEl.classList.add("has-art");
    } else {
      this.#artEl.style.backgroundImage = "";
      this.#artEl.classList.remove("has-art");
    }
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
