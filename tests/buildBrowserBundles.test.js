import { rm, stat } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import { buildBrowserBundles } from "../scripts/build-browser-bundles.js";

const browserDir = new URL("../browser/", import.meta.url);

test("buildBrowserBundles creates the generated output directory when missing", async () => {
  await rm(browserDir, { recursive: true, force: true });

  await buildBrowserBundles({ write: true });

  assert.ok((await stat(new URL("index.js", browserDir))).isFile());
  assert.ok((await stat(new URL("setup.js", browserDir))).isFile());
});
