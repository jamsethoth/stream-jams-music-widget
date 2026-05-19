import { buildOverlayUrl, setupIntegrations } from "../config/setupConfig.js";

export class SetupView {
  #form;
  #urlOutput;
  #status;
  #backgroundOpacityOutput;
  #sourceMenu;
  #pearPanel;
  #spotifyPanel;
  #onChange;
  #onTest;

  constructor(root, initialValues, handlers) {
    this.#onChange = handlers.onChange;
    this.#onTest = handlers.onTest;
    root.innerHTML = `
      <main class="setup-shell">
        <section class="setup-intro">
          <p class="setup-label">Stream Jams Music Widget</p>
          <h1>Choose a music source</h1>
          <p>Select the playback source Stream Jams should read from. Each source can have its own setup requirements.</p>
        </section>
        <section class="setup-source-menu">
          ${setupIntegrations.map(sourceCard).join("")}
        </section>
        <section class="setup-panel" data-panel="pear" hidden>
          <div class="setup-panel-heading">
            <button class="setup-back" type="button" data-action="back">Back</button>
            <div>
              <p class="setup-label">Pear Desktop</p>
              <h2>Build an OBS overlay URL</h2>
              <p>Connect Pear Desktop's YouTube Music API Server plugin, choose the overlay behavior, then use the generated URL as an OBS browser source.</p>
            </div>
          </div>
          <form class="setup-form">
            <input type="hidden" name="integration" value="pear-youtube-music">
            <fieldset>
              <legend>Pear Desktop</legend>
              <ol class="setup-steps">
                <li>Open Pear Desktop.</li>
                <li>Enable the API Server plugin.</li>
                <li>Set API Server auth strategy to NONE.</li>
                <li>Confirm the host and port below.</li>
              </ol>
              <div class="setup-grid">
                <label>Host <input name="host" value="${initialValues.host}" autocomplete="off"></label>
                <label>Port <input name="port" type="number" min="1" max="65535" value="${initialValues.port}"></label>
                <label>Transport
                  <select name="transport">
                    ${option("auto", "Auto", initialValues.transport)}
                    ${option("ws", "WebSocket only", initialValues.transport)}
                    ${option("poll", "Polling only", initialValues.transport)}
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>Overlay</legend>
              <div class="setup-grid">
                <label>Theme
                  <select name="theme">
                    ${option("dark", "Dark", initialValues.theme)}
                    ${option("light", "Light", initialValues.theme)}
                  </select>
                </label>
                <label>Initial view
                  <select name="initialView">
                    ${option("full", "Full", initialValues.initialView)}
                    ${option("compact", "Compact", initialValues.initialView)}
                  </select>
                </label>
                <label>Idle mode
                  <select name="idleMode">
                    ${option("none", "None", initialValues.idleMode)}
                    ${option("hide", "Hide", initialValues.idleMode)}
                    ${option("compact", "Compact", initialValues.idleMode)}
                  </select>
                </label>
                <label>Idle after
                  <input name="idleAfter" type="number" min="1" max="600" value="${initialValues.idleAfter}">
                </label>
                <label class="setup-wide setup-range-label">
                  Background opacity <output data-background-opacity>${initialValues.backgroundOpacity}%</output>
                  <input name="backgroundOpacity" type="range" min="0" max="100" step="1" value="${initialValues.backgroundOpacity}">
                </label>
                <label class="setup-wide">Custom CSS
                  <input name="customCss" value="${initialValues.customCss}" placeholder="custom-theme.css">
                </label>
              </div>
            </fieldset>
            <div class="setup-actions">
              <button type="button" data-action="test">Test connection</button>
              <a class="setup-preview" href="#" target="_blank" rel="noreferrer">Preview overlay</a>
            </div>
          </form>
          <section class="setup-output">
            <label>OBS URL <output></output></label>
            <p class="setup-status" role="status"></p>
          </section>
        </section>
        <section class="setup-panel setup-placeholder" data-panel="spotify" hidden>
          <button class="setup-back" type="button" data-action="back">Back</button>
          <p class="setup-label">Spotify</p>
          <h2>Spotify support is coming soon</h2>
          <p>Spotify integration will be added in a future release. For now, use Pear Desktop for YouTube Music playback.</p>
        </section>
      </main>
    `;
    this.#form = root.querySelector("form");
    this.#urlOutput = root.querySelector(".setup-output output");
    this.#status = root.querySelector(".setup-status");
    this.#backgroundOpacityOutput = root.querySelector("[data-background-opacity]");
    this.#sourceMenu = root.querySelector(".setup-source-menu");
    this.#pearPanel = root.querySelector('[data-panel="pear"]');
    this.#spotifyPanel = root.querySelector('[data-panel="spotify"]');
    root.querySelectorAll("[data-source]").forEach((button) => {
      button.addEventListener("click", () => this.showSource(button.dataset.source));
    });
    root.querySelectorAll('[data-action="back"]').forEach((button) => {
      button.addEventListener("click", () => this.showSourceMenu());
    });
    root.querySelector("[data-action='test']").addEventListener("click", () => this.#onTest(this.readValues()));
    this.#form.addEventListener("input", () => {
      this.#updateBackgroundOpacityOutput();
      this.#onChange(this.readValues());
    });
    this.#updateBackgroundOpacityOutput();
  }

  readValues() {
    return Object.fromEntries(new FormData(this.#form).entries());
  }

  renderUrl(values) {
    const url = buildOverlayUrl(values, globalThis.location.href);
    this.#urlOutput.textContent = url;
    this.#urlOutput.title = url;
    this.#form.querySelector(".setup-preview").href = url;
  }

  renderStatus(message, tone = "neutral") {
    this.#status.textContent = message;
    this.#status.dataset.tone = tone;
  }

  #updateBackgroundOpacityOutput() {
    this.#backgroundOpacityOutput.textContent = `${this.#form.elements.backgroundOpacity.value}%`;
  }

  showSource(sourceId) {
    this.#sourceMenu.hidden = true;
    this.#pearPanel.hidden = sourceId !== "pear-youtube-music";
    this.#spotifyPanel.hidden = sourceId !== "spotify";
    if (sourceId === "pear-youtube-music") {
      this.renderUrl(this.readValues());
    }
  }

  showSourceMenu() {
    this.#sourceMenu.hidden = false;
    this.#pearPanel.hidden = true;
    this.#spotifyPanel.hidden = true;
  }
}

function sourceCard(integration) {
  const statusText = integration.status === "coming-soon" ? "Coming soon" : "Available";
  return `
    <button class="setup-source-card" type="button" data-source="${integration.id}">
      <span>${integration.name}</span>
      <small>${integration.description}</small>
      <strong>${statusText}</strong>
    </button>
  `;
}

function option(value, label, selected) {
  const selectedAttr = value === selected ? " selected" : "";
  return `<option value="${value}"${selectedAttr}>${label}</option>`;
}
