import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("pull request validation verifies the runtime package artifact", async () => {
  const workflow = await readFile(new URL("../.github/workflows/validate.yml", import.meta.url), "utf8");

  assert.match(workflow, /npm run verify:package/);
});
