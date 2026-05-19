import { readFile, stat } from "node:fs/promises";
import packageJson from "../package.json" with { type: "json" };
import { validateReleaseVersion } from "./release-version.js";

const GENERATED_MARKER = "Generated from src/ by scripts/build-browser-bundles.js";

const runtimeFiles = [
  "index.html",
  "setup.html",
  "README.md",
  "RELEASE.txt",
  "browser/index.js",
  "browser/setup.js",
  "styles/overlay.css",
  "styles/setup.css",
];

export async function validateRuntimePackage(options = {}) {
  const version = validateReleaseVersion(options.version || process.env.RELEASE_VERSION || packageJson.version);
  const distUrl = options.distUrl || new URL("../dist/", import.meta.url);
  const packageName = `stream-jams-music-widget-v${version}`;
  const packageUrl = new URL(`${packageName}/`, distUrl);
  const archiveUrl = new URL(`${packageName}.zip`, distUrl);
  const failures = [];

  for (const file of runtimeFiles) {
    await requireReadableFile(new URL(file, packageUrl), file, failures);
  }

  await requireNonEmptyArchive(archiveUrl, failures);
  await requireArchiveEntries(
    archiveUrl,
    runtimeFiles.map((file) => `${packageName}/${file}`),
    failures,
  );
  await requireContains(new URL("index.html", packageUrl), 'src="browser/index.js"', failures);
  await requireContains(new URL("setup.html", packageUrl), 'src="browser/setup.js"', failures);
  await requireContains(new URL("browser/index.js", packageUrl), GENERATED_MARKER, failures);
  await requireContains(new URL("browser/setup.js", packageUrl), GENERATED_MARKER, failures);
  await requireContains(new URL("RELEASE.txt", packageUrl), `Stream Jams Music Widget ${version}`, failures);

  if (failures.length > 0) {
    throw new Error(`Invalid runtime package:\n${failures.join("\n")}`);
  }
}

async function requireReadableFile(fileUrl, label, failures) {
  try {
    const fileStats = await stat(fileUrl);
    if (!fileStats.isFile()) {
      failures.push(`${label} is not a file`);
    } else if (fileStats.size === 0) {
      failures.push(`${label} is empty`);
    }
  } catch {
    failures.push(`${label} is missing`);
  }
}

async function requireNonEmptyArchive(archiveUrl, failures) {
  try {
    const archiveStats = await stat(archiveUrl);
    if (!archiveStats.isFile()) {
      failures.push("runtime zip is not a file");
    } else if (archiveStats.size === 0) {
      failures.push("runtime zip is empty");
    }
  } catch {
    failures.push("runtime zip is missing");
  }
}

async function requireArchiveEntries(archiveUrl, expectedEntries, failures) {
  let entries;
  try {
    entries = readZipEntries(await readFile(archiveUrl));
  } catch {
    failures.push("runtime zip is invalid");
    return;
  }

  for (const entry of expectedEntries) {
    if (!entries.has(entry)) {
      failures.push(`runtime zip is missing ${entry}`);
    }
  }
}

function readZipEntries(buffer) {
  const endOfCentralDirectoryOffset = findEndOfCentralDirectory(buffer);
  const totalEntries = buffer.readUInt16LE(endOfCentralDirectoryOffset + 10);
  let offset = buffer.readUInt32LE(endOfCentralDirectoryOffset + 16);
  const entries = new Set();

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory entry.");
    }

    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const fileCommentLength = buffer.readUInt16LE(offset + 32);
    const fileNameStart = offset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;

    entries.add(buffer.toString("utf8", fileNameStart, fileNameEnd));
    offset = fileNameEnd + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Missing ZIP end of central directory.");
}

async function requireContains(fileUrl, expected, failures) {
  try {
    const contents = await readFile(fileUrl, "utf8");
    if (!contents.includes(expected)) {
      failures.push(`${fileUrl.pathname} must include ${JSON.stringify(expected)}`);
    }
  } catch {
    // Missing files are already reported by requireReadableFile.
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await validateRuntimePackage();
  console.log("Runtime package validation passed.");
}
