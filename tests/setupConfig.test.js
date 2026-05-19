import assert from "node:assert/strict";
import test from "node:test";

import { setupIntegrations } from "../src/config/setupConfig.js";

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
