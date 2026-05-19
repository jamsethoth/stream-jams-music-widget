import assert from "node:assert/strict";
import test from "node:test";

import { parseOverlayConfig } from "../src/config/overlayConfig.js";

test("parseOverlayConfig accepts the default Pear YouTube Music URL parameters", () => {
  const config = parseOverlayConfig(
    "file:///widget/index.html?integration=pear-youtube-music&host=127.0.0.1&port=26538&transport=auto&initialView=full&idleMode=none&idleAfter=30&theme=dark",
  );

  assert.deepEqual(config, {
    ok: true,
    integration: "pear-youtube-music",
    host: "127.0.0.1",
    port: 26538,
    transport: "auto",
    initialView: "full",
    idleMode: "none",
    idleAfter: 30,
    theme: "dark",
    backgroundOpacity: 84,
    customCss: "",
  });
});

test("parseOverlayConfig reports missing required integration", () => {
  const config = parseOverlayConfig("file:///widget/index.html?theme=dark");

  assert.equal(config.ok, false);
  assert.match(config.errors.join("\n"), /integration/);
});

test("parseOverlayConfig allows mock mode without host and port", () => {
  const config = parseOverlayConfig(
    "https://example.test/index.html?integration=mock&theme=light&initialView=compact&idleMode=hide&idleAfter=5",
  );

  assert.equal(config.ok, true);
  assert.equal(config.integration, "mock");
  assert.equal(config.host, "");
  assert.equal(config.port, 0);
  assert.equal(config.theme, "light");
  assert.equal(config.initialView, "compact");
});

test("parseOverlayConfig accepts a bounded background opacity percentage", () => {
  const config = parseOverlayConfig(
    "https://example.test/index.html?integration=mock&theme=dark&backgroundOpacity=62",
  );

  assert.equal(config.ok, true);
  assert.equal(config.backgroundOpacity, 62);
});

test("parseOverlayConfig rejects background opacity outside 0 to 100", () => {
  const config = parseOverlayConfig(
    "https://example.test/index.html?integration=mock&theme=dark&backgroundOpacity=101",
  );

  assert.equal(config.ok, false);
  assert.match(config.errors.join("\n"), /backgroundOpacity/);
});
