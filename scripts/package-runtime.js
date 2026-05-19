import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { relative } from "node:path";
import yazl from "yazl";
import packageJson from "../package.json" with { type: "json" };
import { validateReleaseVersion } from "./release-version.js";

const version = validateReleaseVersion(process.env.RELEASE_VERSION || packageJson.version);
const packageName = `stream-jams-music-widget-v${version}`;
const distUrl = new URL("../dist/", import.meta.url);
const packageUrl = new URL(`../dist/${packageName}/`, import.meta.url);
const archiveUrl = new URL(`../dist/${packageName}.zip`, import.meta.url);

const runtimeFiles = [
  "index.html",
  "setup.html",
  "README.md",
  "browser/index.js",
  "browser/setup.js",
  "styles/overlay.css",
  "styles/setup.css",
];

await rm(packageUrl, { recursive: true, force: true });
await rm(archiveUrl, { force: true });
await mkdir(distUrl, { recursive: true });
await mkdir(packageUrl, { recursive: true });

for (const file of runtimeFiles) {
  const sourceUrl = new URL(`../${file}`, import.meta.url);
  const targetUrl = new URL(`../dist/${packageName}/${file}`, import.meta.url);
  await mkdir(new URL("./", targetUrl), { recursive: true });
  await cp(sourceUrl, targetUrl);
}

await writeFile(
  new URL(`../dist/${packageName}/RELEASE.txt`, import.meta.url),
  [
    `Stream Jams Music Widget ${version}`,
    "",
    "This package contains only the files required to run the widget locally or from static hosting.",
    "",
    "Open setup.html to generate an OBS overlay URL.",
    "",
  ].join("\n"),
);

await createZip(packageUrl, archiveUrl, packageName);

console.log(`Runtime package written to ${archiveUrl.pathname}`);

async function createZip(sourceUrl, targetUrl, rootName) {
  const zipFile = new yazl.ZipFile();
  const output = createWriteStream(targetUrl);
  const done = new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    zipFile.outputStream.on("error", reject);
  });

  zipFile.outputStream.pipe(output);
  await addDirectoryToZip(zipFile, sourceUrl, sourceUrl, rootName);
  zipFile.end();
  await done;
}

async function addDirectoryToZip(zipFile, rootUrl, currentUrl, rootName) {
  for (const entry of await readdir(currentUrl, { withFileTypes: true })) {
    const entryUrl = new URL(entry.name, ensureTrailingSlash(currentUrl));
    const archivePath = `${rootName}/${relative(rootUrl.pathname, entryUrl.pathname).replaceAll("\\", "/")}`;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zipFile, rootUrl, ensureTrailingSlash(entryUrl), rootName);
    } else if (entry.isFile()) {
      const stats = await stat(entryUrl);
      zipFile.addFile(entryUrl.pathname, archivePath, { mtime: stats.mtime });
    }
  }
}

function ensureTrailingSlash(url) {
  return new URL(url.pathname.endsWith("/") ? url.href : `${url.href}/`);
}
