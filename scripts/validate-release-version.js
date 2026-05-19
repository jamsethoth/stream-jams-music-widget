import { validateReleaseVersion } from "./release-version.js";

try {
  validateReleaseVersion(process.argv[2] ?? process.env.RELEASE_VERSION);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
