import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import yazl from "yazl";

import { validateRuntimePackage } from "../scripts/validate-runtime-package.js";

test("validateRuntimePackage accepts a complete generated runtime package", async () => {
  const root = await mkdtemp(join("/tmp", "stream-jams-package-"));
  const packageDir = new URL("stream-jams-music-widget-v1.2.3/", pathToFileUrl(root));

  await writePackageFile(packageDir, "index.html", '<!doctype html><script src="browser/index.js"></script>');
  await writePackageFile(packageDir, "setup.html", '<!doctype html><script src="browser/setup.js"></script>');
  await writePackageFile(packageDir, "README.md", "# Runtime");
  await writePackageFile(packageDir, "RELEASE.txt", "Stream Jams Music Widget 1.2.3\n");
  await writePackageFile(packageDir, "browser/index.js", "Generated from src/ by scripts/build-browser-bundles.js");
  await writePackageFile(packageDir, "browser/setup.js", "Generated from src/ by scripts/build-browser-bundles.js");
  await writePackageFile(packageDir, "styles/overlay.css", "body{}");
  await writePackageFile(packageDir, "styles/setup.css", "body{}");
  await createZip(
    new URL("stream-jams-music-widget-v1.2.3.zip", pathToFileUrl(root)),
    [
      "stream-jams-music-widget-v1.2.3/index.html",
      "stream-jams-music-widget-v1.2.3/setup.html",
      "stream-jams-music-widget-v1.2.3/README.md",
      "stream-jams-music-widget-v1.2.3/RELEASE.txt",
      "stream-jams-music-widget-v1.2.3/browser/index.js",
      "stream-jams-music-widget-v1.2.3/browser/setup.js",
      "stream-jams-music-widget-v1.2.3/styles/overlay.css",
      "stream-jams-music-widget-v1.2.3/styles/setup.css",
    ],
  );

  await assert.doesNotReject(() => validateRuntimePackage({ distUrl: pathToFileUrl(root), version: "1.2.3" }));
});

test("validateRuntimePackage rejects incomplete runtime packages", async () => {
  const root = await mkdtemp(join("/tmp", "stream-jams-package-"));
  const packageDir = new URL("stream-jams-music-widget-v1.2.3/", pathToFileUrl(root));

  await writePackageFile(packageDir, "index.html", '<!doctype html><script src="browser/index.js"></script>');
  await writeFile(new URL("stream-jams-music-widget-v1.2.3.zip", pathToFileUrl(root)), "zip");

  await assert.rejects(
    () => validateRuntimePackage({ distUrl: pathToFileUrl(root), version: "1.2.3" }),
    /missing/,
  );
});

test("validateRuntimePackage rejects zips missing runtime entries", async () => {
  const root = await mkdtemp(join("/tmp", "stream-jams-package-"));
  const packageDir = new URL("stream-jams-music-widget-v1.2.3/", pathToFileUrl(root));

  await writePackageFile(packageDir, "index.html", '<!doctype html><script src="browser/index.js"></script>');
  await writePackageFile(packageDir, "setup.html", '<!doctype html><script src="browser/setup.js"></script>');
  await writePackageFile(packageDir, "README.md", "# Runtime");
  await writePackageFile(packageDir, "RELEASE.txt", "Stream Jams Music Widget 1.2.3\n");
  await writePackageFile(packageDir, "browser/index.js", "Generated from src/ by scripts/build-browser-bundles.js");
  await writePackageFile(packageDir, "browser/setup.js", "Generated from src/ by scripts/build-browser-bundles.js");
  await writePackageFile(packageDir, "styles/overlay.css", "body{}");
  await writePackageFile(packageDir, "styles/setup.css", "body{}");
  await createZip(new URL("stream-jams-music-widget-v1.2.3.zip", pathToFileUrl(root)), [
    "stream-jams-music-widget-v1.2.3/index.html",
  ]);

  await assert.rejects(
    () => validateRuntimePackage({ distUrl: pathToFileUrl(root), version: "1.2.3" }),
    /runtime zip is missing/,
  );
});

async function writePackageFile(packageDir, relativePath, contents) {
  const fileUrl = new URL(relativePath, packageDir);
  await mkdir(new URL("./", fileUrl), { recursive: true });
  await writeFile(fileUrl, contents);
}

function pathToFileUrl(path) {
  return pathToFileURL(`${path}/`);
}

async function createZip(targetUrl, entries) {
  const zipFile = new yazl.ZipFile();
  const output = createWriteStream(targetUrl);
  const done = new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    zipFile.outputStream.on("error", reject);
  });

  zipFile.outputStream.pipe(output);
  for (const entry of entries) {
    zipFile.addBuffer(Buffer.from("runtime"), entry);
  }
  zipFile.end();
  await done;
}
