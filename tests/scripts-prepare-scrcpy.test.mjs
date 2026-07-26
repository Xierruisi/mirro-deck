import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  archiveMatches,
  buildPreparedMarker,
  extractedRoot,
  isPrepared,
  manifestTarget,
  preparedMarkerMatches,
  removeOtherTargets,
  requestedTargetFromEnvironment,
  requiredToolchainFiles,
  resolveTargetKey,
  sha256,
} from "../scripts/prepare-scrcpy-lib.mjs";

const manifestVersion = "4.1";
const target = {
  archive: "scrcpy-test.tar.gz",
  url: "https://example.invalid/scrcpy-test.tar.gz",
  sha256: "abc123",
  format: "tar.gz",
};

test("maps supported host platform and architecture pairs", () => {
  const cases = [
    ["darwin", "arm64", "macos-aarch64"],
    ["darwin", "x64", "macos-x86_64"],
    ["win32", "arm64", "windows-aarch64"],
    ["win32", "x64", "windows-x86_64"],
    ["linux", "arm64", "linux-aarch64"],
    ["linux", "x64", "linux-x86_64"],
  ];

  for (const [platform, architecture, expected] of cases) {
    assert.equal(resolveTargetKey({ platform, architecture }), expected);
  }
});

test("maps Rust target triples and preserves explicit manifest target keys", () => {
  const aliases = [
    ["aarch64-apple-darwin", "macos-aarch64"],
    ["x86_64-apple-darwin", "macos-x86_64"],
    ["aarch64-pc-windows-msvc", "windows-aarch64"],
    ["x86_64-pc-windows-msvc", "windows-x86_64"],
    ["x86_64-unknown-linux-gnu", "linux-x86_64"],
  ];

  for (const [requested, expected] of aliases) {
    assert.equal(resolveTargetKey({ requested }), expected);
  }
  assert.equal(
    resolveTargetKey({ requested: "custom-platform-architecture" }),
    "custom-platform-architecture",
  );
});

test("prefers SCRCPY_TARGET over Tauri's target triple", () => {
  assert.equal(
    requestedTargetFromEnvironment({
      SCRCPY_TARGET: "windows-x86_64",
      TAURI_ENV_TARGET_TRIPLE: "aarch64-apple-darwin",
    }),
    "windows-x86_64",
  );
  assert.equal(
    requestedTargetFromEnvironment({
      SCRCPY_TARGET: "",
      TAURI_ENV_TARGET_TRIPLE: "aarch64-apple-darwin",
    }),
    "aarch64-apple-darwin",
  );
  assert.equal(requestedTargetFromEnvironment({}), undefined);
  assert.equal(requestedTargetFromEnvironment(), undefined);
});

test("rejects unsupported host values", () => {
  assert.throws(
    () => resolveTargetKey({ platform: "freebsd", architecture: "x64" }),
    /unsupported host freebsd-x64/,
  );
  assert.throws(
    () => resolveTargetKey({ platform: "linux", architecture: "riscv64" }),
    /unsupported host linux-riscv64/,
  );
});

test("selects a target from the vendor manifest", () => {
  const manifest = {
    version: manifestVersion,
    targets: { "linux-x86_64": target },
  };
  assert.equal(manifestTarget(manifest, "linux-x86_64"), target);
  assert.throws(
    () => manifestTarget(manifest, "linux-aarch64"),
    /scrcpy 4\.1 does not provide target linux-aarch64/,
  );
  assert.throws(
    () => manifestTarget(undefined, "linux-x86_64"),
    /scrcpy \(unknown version\) does not provide target linux-x86_64/,
  );
  assert.throws(
    () =>
      manifestTarget(
        { version: manifestVersion, targets: { "linux-x86_64": null } },
        "linux-x86_64",
      ),
    /scrcpy 4\.1 does not provide target linux-x86_64/,
  );
});

test("uses platform-specific required executable names", () => {
  assert.deepEqual(requiredToolchainFiles("windows-x86_64"), [
    "scrcpy.exe",
    "adb.exe",
    "scrcpy-server",
  ]);
  assert.deepEqual(requiredToolchainFiles("macos-aarch64"), [
    "scrcpy",
    "adb",
    "scrcpy-server",
  ]);
});

test("builds and compares prepared markers using content identity fields", () => {
  const emulatedTarget = {
    ...target,
    emulated: true,
    note: "runs through emulation",
  };
  const marker = buildPreparedMarker({
    manifestVersion,
    targetKey: "windows-aarch64",
    target: emulatedTarget,
  });

  assert.deepEqual(marker, {
    version: manifestVersion,
    target: "windows-aarch64",
    sha256: target.sha256,
    source: target.url,
    emulated: true,
    note: "runs through emulation",
  });
  assert.equal(
    preparedMarkerMatches({
      marker,
      manifestVersion,
      targetKey: "windows-aarch64",
      target: emulatedTarget,
    }),
    true,
  );

  for (const staleMarker of [
    { ...marker, version: "4.0" },
    { ...marker, target: "windows-x86_64" },
    { ...marker, sha256: "different" },
    null,
    [],
  ]) {
    assert.equal(
      preparedMarkerMatches({
        marker: staleMarker,
        manifestVersion,
        targetKey: "windows-aarch64",
        target: emulatedTarget,
      }),
      false,
    );
  }
});

test("recognizes complete prepared Unix and Windows toolchains", async (t) => {
  for (const targetKey of ["macos-aarch64", "windows-x86_64"]) {
    await t.test(targetKey, async (t) => {
      const fixture = await preparedFixture(t, targetKey);
      assert.equal(await isPrepared(fixture), true);
    });
  }
});

test("rejects stale, malformed, or absent prepared markers", async (t) => {
  const cases = [
    ["malformed JSON", "{"],
    [
      "wrong version",
      JSON.stringify({
        version: "4.0",
        target: "linux-x86_64",
        sha256: target.sha256,
      }),
    ],
    [
      "wrong target",
      JSON.stringify({
        version: manifestVersion,
        target: "macos-x86_64",
        sha256: target.sha256,
      }),
    ],
    [
      "wrong hash",
      JSON.stringify({
        version: manifestVersion,
        target: "linux-x86_64",
        sha256: "stale",
      }),
    ],
  ];

  for (const [name, markerSource] of cases) {
    await t.test(name, async (t) => {
      const fixture = await preparedFixture(t, "linux-x86_64");
      await writeFile(fixture.markerPath, markerSource);
      assert.equal(await isPrepared(fixture), false);
    });
  }

  await t.test("missing marker", async (t) => {
    const fixture = await preparedFixture(t, "linux-x86_64");
    await rm(fixture.markerPath);
    assert.equal(await isPrepared(fixture), false);
  });
});

test("requires every prepared toolchain entry to be a file", async (t) => {
  for (const missingFile of requiredToolchainFiles("linux-x86_64")) {
    await t.test(`missing ${missingFile}`, async (t) => {
      const fixture = await preparedFixture(t, "linux-x86_64");
      await rm(join(fixture.destination, missingFile));
      assert.equal(await isPrepared(fixture), false);
    });
  }

  await t.test("directory in place of executable", async (t) => {
    const fixture = await preparedFixture(t, "linux-x86_64");
    const executable = join(fixture.destination, "scrcpy");
    await rm(executable);
    await mkdir(executable);
    assert.equal(await isPrepared(fixture), false);
  });
});

test("computes and verifies archive SHA-256 without network access", async (t) => {
  const directory = await temporaryDirectory(t, "mirro-archive-test-");
  const archivePath = join(directory, "archive");
  await writeFile(archivePath, "abc");
  const expected =
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

  assert.equal(await sha256(archivePath), expected);
  assert.equal(
    await archiveMatches({ archivePath, expectedSha256: expected }),
    true,
  );
  assert.equal(
    await archiveMatches({ archivePath, expectedSha256: "different" }),
    false,
  );
  assert.equal(
    await archiveMatches({
      archivePath: join(directory, "missing"),
      expectedSha256: expected,
    }),
    false,
  );
});

test("removes only stale toolchain targets", async (t) => {
  const toolchainsDirectory = await temporaryDirectory(
    t,
    "mirro-toolchains-test-",
  );
  await Promise.all([
    mkdir(join(toolchainsDirectory, "linux-x86_64")),
    mkdir(join(toolchainsDirectory, "macos-aarch64", "nested"), {
      recursive: true,
    }),
    writeFile(join(toolchainsDirectory, ".gitkeep"), ""),
    writeFile(join(toolchainsDirectory, "stale-file"), ""),
  ]);

  await removeOtherTargets({
    toolchainsDirectory,
    targetKey: "linux-x86_64",
  });

  assert.deepEqual((await readdir(toolchainsDirectory)).sort(), [
    ".gitkeep",
    "linux-x86_64",
  ]);
  assert.equal(
    (await stat(join(toolchainsDirectory, "linux-x86_64"))).isDirectory(),
    true,
  );
});

test("uses a sole extracted directory as archive root", async (t) => {
  const extractionDirectory = await temporaryDirectory(
    t,
    "mirro-extraction-test-",
  );
  await mkdir(join(extractionDirectory, "scrcpy-v4.1"));
  let entries = await readdir(extractionDirectory, { withFileTypes: true });
  assert.equal(
    extractedRoot(extractionDirectory, entries),
    join(extractionDirectory, "scrcpy-v4.1"),
  );

  await writeFile(join(extractionDirectory, "LICENSE"), "");
  entries = await readdir(extractionDirectory, { withFileTypes: true });
  assert.equal(extractedRoot(extractionDirectory, entries), extractionDirectory);
  assert.equal(extractedRoot(extractionDirectory, []), extractionDirectory);
});

async function preparedFixture(t, targetKey) {
  const directory = await temporaryDirectory(t, "mirro-prepared-test-");
  const destination = join(directory, targetKey);
  const markerPath = join(destination, ".prepared.json");
  await mkdir(destination, { recursive: true });
  await Promise.all(
    requiredToolchainFiles(targetKey).map((file) =>
      writeFile(join(destination, file), file),
    ),
  );
  await writeFile(
    markerPath,
    JSON.stringify(
      buildPreparedMarker({ manifestVersion, targetKey, target }),
    ),
  );
  return {
    markerPath,
    destination,
    manifestVersion,
    targetKey,
    target,
  };
}

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
