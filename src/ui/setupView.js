import { buildOverlayUrl } from "../config/setupConfig.js";

export class SetupView {
  #form;
  #urlOutput;
  #status;
  #onChange;
  #onTest;

  constructor(root, initialValues, handlers) {
    this.#onChange = handlers.onChange;
    this.#onTest = handlers.onTest;
    root.innerHTML = `
      <main class="setup-shell">
        <section class="setup-intro">
          <p class="setup-label">Stream Jams Music Widget</p>
          <h1>Build an OBS overlay URL</h1>
          <p>Connect Pear Desktop's YouTube Music API Server plugin, choose the overlay behavior, then use the generated URL as an OBS browser source.</p>
        </section>
        <form class="setup-form">
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
      </main>
    `;
    this.#form = root.querySelector("form");
    this.#urlOutput = root.querySelector("output");
    this.#status = root.querySelector(".setup-status");
    root.querySelector("[data-action='test']").addEventListener("click", () => this.#onTest(this.readValues()));
    this.#form.addEventListener("input", () => this.#onChange(this.readValues()));
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
}

function option(value, label, selected) {
  const selectedAttr = value === selected ? " selected" : "";
  return `<option value="${value}"${selectedAttr}>${label}</option>`;
}
