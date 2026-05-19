const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function validateReleaseVersion(version) {
  const value = String(version ?? "").trim();
  if (!SEMVER_PATTERN.test(value)) {
    throw new Error("Release version must be a semantic version without a leading v, for example 1.2.3.");
  }
  return value;
}
