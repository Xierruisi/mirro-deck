import { readFile } from "node:fs/promises";
import { join } from "node:path";

// SemVer 2.0.0, including the rule that numeric pre-release identifiers must
// not contain leading zeroes.
export const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function isSemanticVersion(value) {
  return typeof value === "string" && semverPattern.test(value);
}

export function validateReleaseTag(rawTag) {
  if (typeof rawTag !== "string" || rawTag.length === 0) {
    throw new Error("missing release tag (expected, for example, v0.1.0)");
  }

  if (rawTag !== rawTag.trim()) {
    throw new Error(
      "release tag must not contain leading or trailing whitespace",
    );
  }

  if (!rawTag.startsWith("v") || !isSemanticVersion(rawTag.slice(1))) {
    throw new Error(`invalid release tag "${rawTag}" (expected v<semver>)`);
  }

  return rawTag.slice(1);
}

export function readCargoPackageVersion(source) {
  if (typeof source !== "string") return undefined;

  const packageHeaderPattern = /^[ \t]*\[package\][ \t]*(?:#.*)?\r?$/gm;
  const packageHeader = packageHeaderPattern.exec(source);
  if (!packageHeader) return undefined;

  const remaining = source.slice(packageHeaderPattern.lastIndex);
  const nextSectionOffset = remaining.search(
    /^[ \t]*\[{1,2}[^\]\r\n]+\]{1,2}[ \t]*(?:#.*)?\r?$/m,
  );
  const packageSection =
    nextSectionOffset === -1
      ? remaining
      : remaining.slice(0, nextSectionOffset);
  const versionMatch = packageSection.match(
    /^[ \t]*version[ \t]*=[ \t]*(?:"([^"\r\n]+)"|'([^'\r\n]+)')[ \t]*(?:#.*)?\r?$/m,
  );
  return versionMatch?.[1] ?? versionMatch?.[2];
}

export function readChangelogReleaseDate(path, source, version) {
  if (typeof source !== "string") {
    throw new Error(`${path} is not text`);
  }

  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = source.match(
    new RegExp(`^## \\[${escapedVersion}\\] - (\\d{4}-\\d{2}-\\d{2})$`, "m"),
  );
  if (!heading) {
    throw new Error(
      `${path} must contain a dated "## [${version}] - YYYY-MM-DD" release heading`,
    );
  }

  const releaseDate = heading[1];
  const parsedDate = new Date(`${releaseDate}T00:00:00Z`);
  if (
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== releaseDate
  ) {
    throw new Error(`${path} has an invalid release date: ${releaseDate}`);
  }
  return releaseDate;
}

export function verifyReleaseVersionSources({
  rawTag,
  packageJsonSource,
  cargoTomlSource,
  tauriConfigSource,
  changelogSource,
  chineseChangelogSource,
}) {
  const expectedVersion = validateReleaseTag(rawTag);
  const versions = {
    "package.json": readJsonVersion("package.json", packageJsonSource),
    "src-tauri/Cargo.toml": readCargoPackageVersion(cargoTomlSource),
    "src-tauri/tauri.conf.json": readJsonVersion(
      "src-tauri/tauri.conf.json",
      tauriConfigSource,
    ),
  };

  for (const [path, version] of Object.entries(versions)) {
    if (!isSemanticVersion(version)) {
      throw new Error(`${path} has an invalid or missing semantic version`);
    }
  }

  if (Object.values(versions).some((version) => version !== expectedVersion)) {
    const details = Object.entries(versions)
      .map(([path, version]) => `  ${path}: ${version}`)
      .join("\n");
    throw new Error(
      `release tag ${rawTag} does not match every application version:\n${details}`,
    );
  }

  const releaseDates = {
    "CHANGELOG.md": readChangelogReleaseDate(
      "CHANGELOG.md",
      changelogSource,
      expectedVersion,
    ),
    "CHANGELOG.zh-CN.md": readChangelogReleaseDate(
      "CHANGELOG.zh-CN.md",
      chineseChangelogSource,
      expectedVersion,
    ),
  };
  if (new Set(Object.values(releaseDates)).size !== 1) {
    const details = Object.entries(releaseDates)
      .map(([path, date]) => `  ${path}: ${date}`)
      .join("\n");
    throw new Error(`bilingual changelog release dates disagree:\n${details}`);
  }

  return {
    expectedVersion,
    versions,
    releaseDate: releaseDates["CHANGELOG.md"],
  };
}

export async function verifyReleaseVersionFiles({
  projectRoot,
  rawTag,
  readFileImpl = readFile,
}) {
  const [
    packageJsonSource,
    cargoTomlSource,
    tauriConfigSource,
    changelogSource,
    chineseChangelogSource,
  ] = await Promise.all([
    readFileImpl(join(projectRoot, "package.json"), "utf8"),
    readFileImpl(join(projectRoot, "src-tauri", "Cargo.toml"), "utf8"),
    readFileImpl(join(projectRoot, "src-tauri", "tauri.conf.json"), "utf8"),
    readFileImpl(join(projectRoot, "CHANGELOG.md"), "utf8"),
    readFileImpl(join(projectRoot, "CHANGELOG.zh-CN.md"), "utf8"),
  ]);

  return verifyReleaseVersionSources({
    rawTag,
    packageJsonSource,
    cargoTomlSource,
    tauriConfigSource,
    changelogSource,
    chineseChangelogSource,
  });
}

function readJsonVersion(path, source) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`, {
      cause: error,
    });
  }
  return parsed?.version;
}
