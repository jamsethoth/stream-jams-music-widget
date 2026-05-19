import assert from "node:assert/strict";
import test from "node:test";

import { buildOverlayUrl, sanitizeSetupPreferences, setupIntegrations } from "../src/config/setupConfig.js";
import { escapeAttribute } from "../src/ui/setupView.js";

test("setupIntegrations exposes Pear Desktop as available and Spotify as coming soon", () => {
  assert.deepEqual(
    setupIntegrations.map((integration) => ({
      id: integration.id,
      status: integration.status,
    })),
    [
      { id: "pear-youtube-music", status: "available" },
      { id: "spotify", status: "coming-soon" },
    ],
  );
});

test("sanitizeSetupPreferences keeps background opacity inside the supported percentage range", () => {
  assert.equal(sanitizeSetupPreferences({ backgroundOpacity: "45" }).backgroundOpacity, 45);
  assert.equal(sanitizeSetupPreferences({ backgroundOpacity: "-1" }).backgroundOpacity, 0);
  assert.equal(sanitizeSetupPreferences({ backgroundOpacity: "101" }).backgroundOpacity, 100);
});

test("buildOverlayUrl includes the selected background opacity", () => {
  const url = buildOverlayUrl(
    {
      integration: "pear-youtube-music",
      host: "127.0.0.1",
      port: 26538,
      backgroundOpacity: 55,
    },
    "file:///widget/setup.html",
  );

  assert.equal(new URL(url).searchParams.get("backgroundOpacity"), "55");
});

test("sanitizeSetupPreferences keeps only supported widget alignment values", () => {
  assert.equal(sanitizeSetupPreferences({ widgetAlignment: "top-right" }).widgetAlignment, "top-right");
  assert.equal(sanitizeSetupPreferences({ widgetAlignment: "center" }).widgetAlignment, "bottom-left");
});

test("buildOverlayUrl includes the selected widget alignment", () => {
  const url = buildOverlayUrl(
    {
      integration: "pear-youtube-music",
      host: "127.0.0.1",
      port: 26538,
      widgetAlignment: "center-right",
    },
    "file:///widget/setup.html",
  );

  assert.equal(new URL(url).searchParams.get("widgetAlignment"), "center-right");
});

test("buildOverlayUrl does not include custom CSS path configuration", () => {
  const url = buildOverlayUrl(
    {
      integration: "pear-youtube-music",
      host: "127.0.0.1",
      port: 26538,
      customCss: "custom-theme.css",
    },
    "file:///widget/setup.html",
  );

  assert.equal(new URL(url).searchParams.has("customCss"), false);
});

test("escapeAttribute keeps saved preferences inert inside setup markup attributes", () => {
  assert.equal(
    escapeAttribute(`127.0.0.1" autofocus onfocus="alert(1)`),
    "127.0.0.1&quot; autofocus onfocus=&quot;alert(1)",
  );
});
