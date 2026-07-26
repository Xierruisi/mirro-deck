import { createHash } from "node:crypto";
import {
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { join } from "node:path";

export const targetAliases = Object.freeze({
  "aarch64-apple-darwin": "macos-aarch64",
  "x86_64-apple-darwin": "macos-x86_64",
  "aarch64-pc-windows-msvc": "windows-aarch64",
  "x86_64-pc-windows-msvc": "windows-x86_64",
  "x86_64-unknown-linux-gnu": "linux-x86_64",
});

const platformNames = Object.freeze({
  darwin: "macos",
  win32: "windows",
  linux: "linux",
});
const architectureNames = Object.freeze({
  arm64: "aarch64",
  x64: "x86_64",
});

export function requestedTargetFromEnvironment(environment = {}) {
  return environment.SCRCPY_TARGET || environment.TAURI_ENV_TARGET_TRIPLE;
}

export function resolveTargetKey({
  requested,
  platform,
  architecture,
} = {}) {
  if (requested) return targetAliases[requested] || requested;

  const platformName = platformNames[platform];
  const architectureName = architectureNames[architecture];
  if (!platformName || !architectureName) {
    throw new Error(`unsupported host ${platform}-${architecture}`);
  }
  return `${platformName}-${architectureName}`;
}

export function manifestTarget(manifest, targetKey) {
  const targets = manifest?.targets;
  if (
    targets === null ||
    typeof targets !== "object" ||
    !Object.hasOwn(targets, targetKey) ||
    targets[targetKey] === null ||
    typeof targets[targetKey] !== "object"
  ) {
    throw new Error(
      `scrcpy ${manifest?.version ?? "(unknown version)"} does not provide target ${targetKey}`,
    );
  }
  return targets[targetKey];
}

export function requiredToolchainFiles(targetKey) {
  return targetKey.startsWith("windows-")
    ? ["scrcpy.exe", "adb.exe", "scrcpy-server"]
    : ["scrcpy", "adb", "scrcpy-server"];
}

export function buildPreparedMarker({ manifestVersion, targetKey, target }) {
  return {
    version: manifestVersion,
    target: targetKey,
    sha256: target.sha256,
    source: target.url,
    emulated: target.emulated ?? false,
    note: target.note,
  };
}

export function preparedMarkerMatches({
  marker,
  manifestVersion,
  targetKey,
  target,
}) {
  return (
    marker !== null &&
    typeof marker === "object" &&
    marker.version === manifestVersion &&
    marker.target === targetKey &&
    marker.sha256 === target.sha256
  );
}

export async function isPrepared({
  markerPath,
  destination,
  manifestVersion,
  targetKey,
  target,
  readFileImpl = readFile,
  statImpl = stat,
}) {
  try {
    const marker = JSON.parse(await readFileImpl(markerPath, "utf8"));
    if (
      !preparedMarkerMatches({
        marker,
        manifestVersion,
        targetKey,
        target,
      })
    ) {
      return false;
    }

    const fileStats = await Promise.all(
      requiredToolchainFiles(targetKey).map((file) =>
        statImpl(join(destination, file)),
      ),
    );
    return fileStats.every((fileStat) => fileStat.isFile());
  } catch {
    return false;
  }
}

export async function sha256(path, readFileImpl = readFile) {
  return createHash("sha256")
    .update(await readFileImpl(path))
    .digest("hex");
}

export async function archiveMatches({
  archivePath,
  expectedSha256,
  readFileImpl = readFile,
}) {
  try {
    return (await sha256(archivePath, readFileImpl)) === expectedSha256;
  } catch {
    return false;
  }
}

export async function removeOtherTargets({
  toolchainsDirectory,
  targetKey,
  readdirImpl = readdir,
  rmImpl = rm,
}) {
  for (const entry of await readdirImpl(toolchainsDirectory, {
    withFileTypes: true,
  })) {
    if (entry.name !== targetKey && entry.name !== ".gitkeep") {
      await rmImpl(join(toolchainsDirectory, entry.name), {
        recursive: true,
        force: true,
      });
    }
  }
}

export function extractedRoot(extractionDirectory, extractedEntries) {
  return extractedEntries.length === 1 && extractedEntries[0].isDirectory()
    ? join(extractionDirectory, extractedEntries[0].name)
    : extractionDirectory;
}
