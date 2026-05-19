import { formatTime, getDisplayedProgress } from "../state/progressClock.js";

export class OverlayView {
  #root;
  #artEl;
  #titleEl;
  #detailsEl;
  #progressEl;
  #timeEl;

  constructor(root) {
    this.#root = root;
    this.#root.innerHTML = `
      <section class="sj-widget" aria-live="polite">
        <div class="sj-art" aria-hidden="true"><span>SJ</span></div>
        <div class="sj-copy">
          <h1 class="sj-title"><span>Connecting...</span></h1>
          <p class="sj-details"><span></span></p>
          <div class="sj-progress-row">
            <div class="sj-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span class="sj-progress-fill"></span>
            </div>
            <span class="sj-time">0:00 / 0:00</span>
          </div>
        </div>
      </section>
    `;
    this.#artEl = this.#root.querySelector(".sj-art");
    this.#titleEl = this.#root.querySelector(".sj-title");
    this.#detailsEl = this.#root.querySelector(".sj-details");
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
    this.#root.dataset.connection = connection.state;
    if (connection.state === "waiting") {
      setScrollingText(this.#titleEl, "Waiting for music");
      setScrollingText(this.#detailsEl, "Start a track in YouTube Music");
    }
  }

  renderTrack(state, now = Date.now()) {
    const progress = getDisplayedProgress(state, now);
    setScrollingText(this.#titleEl, state.title);
    setScrollingText(this.#detailsEl, formatTrackDetails(state));
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

function formatTrackDetails(state) {
  return [state.artist, state.album].filter(Boolean).join(" - ");
}

function setScrollingText(element, value) {
  const text = value || "";
  let content = element.querySelector("span");
  if (!content) {
    content = document.createElement("span");
    element.textContent = "";
    element.append(content);
  }

  if (content.textContent !== text) {
    content.textContent = text;
    element.classList.remove("is-overflowing");
  }

  requestAnimationFrame(() => {
    const isOverflowing = content.scrollWidth > element.clientWidth;
    element.classList.toggle("is-overflowing", isOverflowing);
    if (isOverflowing) {
      const distance = content.scrollWidth - element.clientWidth;
      element.style.setProperty("--sj-scroll-distance", `${distance + 18}px`);
      element.style.setProperty("--sj-scroll-duration", `${Math.max(10, Math.min(28, distance / 12))}s`);
    } else {
      element.style.removeProperty("--sj-scroll-distance");
      element.style.removeProperty("--sj-scroll-duration");
    }
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
