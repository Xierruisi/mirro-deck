import { execFile } from "node:child_process";
import {
  chmod,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import extractZip from "extract-zip";
import { x as extractTar } from "tar";
import {
  archiveMatches,
  buildPreparedMarker,
  extractedRoot,
  isPrepared,
  manifestTarget,
  removeOtherTargets,
  requestedTargetFromEnvironment,
  resolveTargetKey,
  sha256,
} from "./prepare-scrcpy-lib.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const projectRoot = resolve(scriptDirectory, "..");
const manifestPath = join(projectRoot, "vendor", "scrcpy.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const targetKey = resolveTargetKey({
  requested: requestedTargetFromEnvironment(process.env),
  platform: process.platform,
  architecture: process.arch,
});
const target = manifestTarget(manifest, targetKey);

const cacheDirectory = join(projectRoot, ".cache", "scrcpy");
const archivePath = join(cacheDirectory, target.archive);
const toolchainsDirectory = join(
  projectRoot,
  "src-tauri",
  "resources",
  "toolchains",
);
const destination = join(toolchainsDirectory, targetKey);
const markerPath = join(destination, ".prepared.json");

await mkdir(cacheDirectory, { recursive: true });
await mkdir(toolchainsDirectory, { recursive: true });
await removeOtherTargets({ toolchainsDirectory, targetKey });

if (
  await isPrepared({
    markerPath,
    destination,
    manifestVersion: manifest.version,
    targetKey,
    target,
  })
) {
  console.log(`scrcpy ${manifest.version} for ${targetKey} is ready`);
} else {
  if (
    !(await archiveMatches({
      archivePath,
      expectedSha256: target.sha256,
    }))
  ) {
    await rm(archivePath, { force: true });
    console.log(`Downloading ${target.url}`);
    await download(target.url, archivePath);
  }

  const actualHash = await sha256(archivePath);
  if (actualHash !== target.sha256) {
    await rm(archivePath, { force: true });
    throw new Error(
      `SHA-256 mismatch for ${basename(archivePath)}: expected ${target.sha256}, got ${actualHash}`,
    );
  }

  const extractionDirectory = join(
    toolchainsDirectory,
    `.${targetKey}-extract`,
  );
  await rm(extractionDirectory, { recursive: true, force: true });
  await mkdir(extractionDirectory, { recursive: true });

  if (target.format === "zip") {
    await extractZip(archivePath, { dir: extractionDirectory });
  } else if (target.format === "tar.gz") {
    await extractTar({
      file: archivePath,
      cwd: extractionDirectory,
      gzip: true,
    });
  } else {
    throw new Error(`unsupported archive format: ${target.format}`);
  }

  const extractedEntries = await readdir(extractionDirectory, {
    withFileTypes: true,
  });
  const root = extractedRoot(extractionDirectory, extractedEntries);

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(root, destination, { recursive: true });
  await rm(extractionDirectory, { recursive: true, force: true });

  if (!targetKey.startsWith("windows-")) {
    await chmod(join(destination, "scrcpy"), 0o755);
    await chmod(join(destination, "adb"), 0o755);
  }

  await writeFile(
    markerPath,
    `${JSON.stringify(
      buildPreparedMarker({
        manifestVersion: manifest.version,
        targetKey,
        target,
      }),
      null,
      2,
    )}\n`,
  );
  console.log(`Prepared scrcpy ${manifest.version} for ${targetKey}`);
}

async function download(url, outputPath) {
  try {
    await execFileAsync(
      "curl",
      [
        "--fail",
        "--location",
        "--retry",
        "3",
        "--retry-all-errors",
        "--connect-timeout",
        "30",
        "--user-agent",
        "mirro-deck-build",
        "--output",
        outputPath,
        url,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  // Windows 10+, macOS and Linux builders normally provide curl. This
  // fallback keeps the script usable in minimal Node-only environments.
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "mirro-deck-build" },
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await writeFile(outputPath, new Uint8Array(await response.arrayBuffer()));
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1000));
    }
  }
  throw new Error(`download failed after 3 attempts: ${lastError}`);
}
