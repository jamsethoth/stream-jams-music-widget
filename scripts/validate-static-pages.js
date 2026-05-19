import { readFile } from "node:fs/promises";
import { buildBrowserBundles } from "./build-browser-bundles.js";

const requiredFiles = [
  "index.html",
  "setup.html",
  "browser/index.js",
  "browser/setup.js",
  "styles/overlay.css",
  "styles/setup.css",
  "src/app/overlayApp.js",
  "src/app/setupApp.js",
];

const failures = [];

for (const file of requiredFiles) {
  try {
    const contents = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    if (!contents.trim()) {
      failures.push(`${file} is empty`);
    }
  } catch {
    failures.push(`${file} is missing`);
  }
}

for (const htmlFile of ["index.html", "setup.html"]) {
  try {
    const contents = await readFile(new URL(`../${htmlFile}`, import.meta.url), "utf8");
    if (!contents.includes("<!doctype html>")) {
      failures.push(`${htmlFile} must declare <!doctype html>`);
    }
    if (contents.includes('type="module"')) {
      failures.push(`${htmlFile} must not use ES module scripts because file:/// OBS/browser loading blocks module imports with CORS errors`);
    }
    if (!contents.includes(`src="browser/${htmlFile.replace(".html", "")}.js"`)) {
      failures.push(`${htmlFile} must load its file-safe browser script`);
    }
  } catch {
    // Missing file is already reported above.
  }
}

for (const file of ["browser/index.js", "browser/setup.js"]) {
  try {
    const contents = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    if (!contents.includes("Generated from src/ by scripts/build-browser-bundles.js")) {
      failures.push(`${file} must be generated from src/ and include the generated-file marker`);
    }
  } catch {
    // Missing file is already reported above when relevant.
  }
}

try {
  const generated = await buildBrowserBundles({ write: false });
  for (const bundle of generated) {
    const current = await readFile(new URL(`../${bundle.outputPath}`, import.meta.url), "utf8");
    if (current !== bundle.contents) {
      failures.push(`${bundle.outputPath} is stale. Run npm run build.`);
    }
  }
} catch (error) {
  failures.push(`Unable to verify generated browser bundles: ${error.message}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Static page validation passed.");
