import assert from "node:assert/strict";
import test from "node:test";

import { validateReleaseVersion } from "../scripts/release-version.js";

test("validateReleaseVersion accepts semantic versions without a leading v", () => {
  assert.equal(validateReleaseVersion("1.2.3"), "1.2.3");
  assert.equal(validateReleaseVersion("1.2.3-beta.1"), "1.2.3-beta.1");
  assert.equal(validateReleaseVersion("1.2.3+build.5"), "1.2.3+build.5");
});

test("validateReleaseVersion rejects shell and path unsafe values", () => {
  assert.throws(() => validateReleaseVersion("v1.2.3"), /semantic version/);
  assert.throws(() => validateReleaseVersion("1/../../outside"), /semantic version/);
  assert.throws(() => validateReleaseVersion('1.2.3"; echo injected'), /semantic version/);
});
