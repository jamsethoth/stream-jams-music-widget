import assert from "node:assert/strict";
import test from "node:test";

import { createCustomThemeStylesheet } from "../src/app/overlayApp.js";

test("createCustomThemeStylesheet points to the optional runtime theme file", () => {
  const link = createCustomThemeStylesheet({
    document: {
      createElement(tagName) {
        assert.equal(tagName, "link");
        return { dataset: {} };
      },
    },
  });

  assert.equal(link.rel, "stylesheet");
  assert.equal(link.href, "styles/custom-theme.css");
  assert.equal(link.dataset.optional, "true");
});
