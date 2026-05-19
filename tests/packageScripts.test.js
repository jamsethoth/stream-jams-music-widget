import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("validation builds generated browser bundles before static checks", () => {
  assert.match(packageJson.scripts.validate, /npm run build/);
  assert.match(packageJson.scripts.validate, /node scripts\/validate-static-pages\.js/);
});

test("runtime packaging builds generated browser bundles before zipping", () => {
  assert.match(packageJson.scripts.package, /npm run build/);
  assert.match(packageJson.scripts.package, /node scripts\/package-runtime\.js/);
});

test("runtime package verification packages and validates generated artifacts", () => {
  assert.match(packageJson.scripts["verify:package"], /npm run package/);
  assert.match(packageJson.scripts["verify:package"], /node scripts\/validate-runtime-package\.js/);
});
