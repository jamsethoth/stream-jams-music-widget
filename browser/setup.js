(function () {
  "use strict";

  var STORAGE_KEY = "stream-jams.setup";
  var defaults = {
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

  function loadPreferences() {
    try {
      return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch (error) {
      return sanitize({});
    }
  }

  function savePreferences(values) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(values)));
  }

  function sanitize(values) {
    var next = Object.assign({}, defaults);
    Object.keys(defaults).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(values || {}, key)) {
        next[key] = values[key];
      }
    });
    next.port = clampInteger(next.port, defaults.port, 1, 65535);
    next.idleAfter = clampInteger(next.idleAfter, defaults.idleAfter, 1, 600);
    return next;
  }

  function clampInteger(value, fallback, min, max) {
    var number = Number(value);
    if (!Number.isInteger(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, number));
  }

  function buildOverlayUrl(values) {
    var base = new URL("index.html", window.location.href);
    var settings = sanitize(values);
    Object.keys(settings).forEach(function (key) {
      if (settings[key] !== "" && settings[key] !== undefined && settings[key] !== null) {
        base.searchParams.set(key, String(settings[key]));
      }
    });
    return base.href;
  }

  function renderSetup(root, initialValues) {
    root.innerHTML =
      '<main class="setup-shell">' +
      '<section class="setup-intro"><p class="setup-label">Stream Jams Music Widget</p><h1>Build an OBS overlay URL</h1>' +
      "<p>Connect Pear Desktop's YouTube Music API Server plugin, choose the overlay behavior, then use the generated URL as an OBS browser source.</p></section>" +
      '<form class="setup-form">' +
      '<fieldset><legend>Pear Desktop</legend><ol class="setup-steps"><li>Open Pear Desktop.</li><li>Enable the API Server plugin.</li><li>Set API Server auth strategy to NONE.</li><li>Confirm the host and port below.</li></ol>' +
      '<div class="setup-grid">' +
      labelInput("Host", "host", initialValues.host, "") +
      labelInput("Port", "port", initialValues.port, ' type="number" min="1" max="65535"') +
      labelSelect("Transport", "transport", initialValues.transport, [
        ["auto", "Auto"],
        ["ws", "WebSocket only"],
        ["poll", "Polling only"],
      ]) +
      "</div></fieldset>" +
      '<fieldset><legend>Overlay</legend><div class="setup-grid">' +
      labelSelect("Theme", "theme", initialValues.theme, [
        ["dark", "Dark"],
        ["light", "Light"],
      ]) +
      labelSelect("Initial view", "initialView", initialValues.initialView, [
        ["full", "Full"],
        ["compact", "Compact"],
      ]) +
      labelSelect("Idle mode", "idleMode", initialValues.idleMode, [
        ["none", "None"],
        ["hide", "Hide"],
        ["compact", "Compact"],
      ]) +
      labelInput("Idle after", "idleAfter", initialValues.idleAfter, ' type="number" min="1" max="600"') +
      '<label class="setup-wide">Custom CSS <input name="customCss" value="' +
      escapeAttr(initialValues.customCss) +
      '" placeholder="custom-theme.css"></label>' +
      "</div></fieldset>" +
      '<div class="setup-actions"><button type="button" data-action="test">Test connection</button><a class="setup-preview" href="#" target="_blank" rel="noreferrer">Preview overlay</a></div>' +
      '</form><section class="setup-output"><label>OBS URL <output></output></label><p class="setup-status" role="status"></p></section></main>';
  }

  function labelInput(label, name, value, attrs) {
    return '<label>' + label + ' <input name="' + name + '" value="' + escapeAttr(String(value)) + '"' + attrs + "></label>";
  }

  function labelSelect(label, name, value, options) {
    return (
      '<label>' +
      label +
      ' <select name="' +
      name +
      '">' +
      options
        .map(function (option) {
          return '<option value="' + option[0] + '"' + (option[0] === value ? " selected" : "") + ">" + option[1] + "</option>";
        })
        .join("") +
      "</select></label>"
    );
  }

  function escapeAttr(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function readValues(form) {
    var values = {};
    Array.prototype.forEach.call(new FormData(form).entries(), function (entry) {
      values[entry[0]] = entry[1];
    });
    return values;
  }

  function renderUrl(form, output) {
    var values = readValues(form);
    var url = buildOverlayUrl(values);
    output.textContent = url;
    output.title = url;
    form.querySelector(".setup-preview").href = url;
    return values;
  }

  function setStatus(status, message, tone) {
    status.textContent = message;
    status.dataset.tone = tone || "neutral";
  }

  function testConnection(values, status) {
    setStatus(status, "Testing Pear Desktop...", "neutral");
    fetch("http://" + values.host + ":" + values.port + "/api/v1/song")
      .then(function (response) {
        if (response.ok || response.status === 204) {
          setStatus(status, "Pear Desktop responded. This URL is ready for OBS.", "success");
        } else {
          setStatus(status, "Pear Desktop returned " + response.status + ".", "error");
        }
      })
      .catch(function (error) {
        setStatus(status, error.message, "error");
      });
  }

  function startSetupApp() {
    var root = document.querySelector("#app");
    var initialValues = loadPreferences();
    renderSetup(root, initialValues);

    var form = root.querySelector("form");
    var output = root.querySelector("output");
    var status = root.querySelector(".setup-status");
    renderUrl(form, output);

    form.addEventListener("input", function () {
      var values = renderUrl(form, output);
      savePreferences(values);
    });
    root.querySelector("[data-action='test']").addEventListener("click", function () {
      testConnection(readValues(form), status);
    });
  }

  startSetupApp();
})();
