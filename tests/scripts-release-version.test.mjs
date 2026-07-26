import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  isSemanticVersion,
  readCargoPackageVersion,
  readChangelogReleaseDate,
  validateReleaseTag,
  verifyReleaseVersionFiles,
  verifyReleaseVersionSources,
} from "../scripts/check-release-version-lib.mjs";

test("accepts SemVer 2.0 release tags", () => {
  for (const tag of [
    "v0.0.0",
    "v1.2.3",
    "v1.0.0-alpha",
    "v1.0.0-alpha.1",
    "v1.0.0-0.3.7",
    "v1.0.0-x.7.z.92",
    "v1.0.0-rc.1+build.5",
    "v1.0.0+20130313144700",
  ]) {
    assert.equal(validateReleaseTag(tag), tag.slice(1), tag);
    assert.equal(isSemanticVersion(tag.slice(1)), true, tag);
  }
});

test("rejects malformed release tags and non-compliant SemVer", () => {
  const cases = [
    [undefined, /missing release tag/],
    ["", /missing release tag/],
    ["  v1.2.3", /leading or trailing whitespace/],
    ["v1.2.3\n", /leading or trailing whitespace/],
    ["1.2.3", /invalid release tag/],
    ["v1.2", /invalid release tag/],
    ["v01.2.3", /invalid release tag/],
    ["v1.02.3", /invalid release tag/],
    ["v1.2.03", /invalid release tag/],
    ["v1.2.3-01", /invalid release tag/],
    ["v1.2.3-alpha..1", /invalid release tag/],
    ["v1.2.3-", /invalid release tag/],
    ["v1.2.3+", /invalid release tag/],
    ["v1.2.3_build", /invalid release tag/],
  ];

  for (const [tag, expectedError] of cases) {
    assert.throws(() => validateReleaseTag(tag), expectedError);
  }
});

test("reads only version from Cargo's package table", () => {
  const cargoToml = `
[workspace.package]
version = "9.9.9"

[package] # application metadata
name = "mirro-deck"
version = '1.2.3' # release version
edition = "2021"

[dependencies]
example = { version = "8.8.8" }
`;

  assert.equal(readCargoPackageVersion(cargoToml), "1.2.3");
  assert.equal(
    readCargoPackageVersion('[dependencies]\nthing = "1.0.0"\n'),
    undefined,
  );
  assert.equal(
    readCargoPackageVersion(
      '[package]\nname = "missing-version"\n\n[dependencies]\nversion = "7.0.0"\n',
    ),
    undefined,
  );
  assert.equal(
    readCargoPackageVersion(
      '[package]\r\nname = "mirro-deck"\r\nversion = "3.2.1"\r\n',
    ),
    "3.2.1",
  );
});

test("verifies matching versions in all manifest sources", () => {
  const result = verifyReleaseVersionSources(
    manifestSources("1.2.3-rc.1+build.5"),
  );

  assert.equal(result.expectedVersion, "1.2.3-rc.1+build.5");
  assert.deepEqual(result.versions, {
    "package.json": "1.2.3-rc.1+build.5",
    "src-tauri/Cargo.toml": "1.2.3-rc.1+build.5",
    "src-tauri/tauri.conf.json": "1.2.3-rc.1+build.5",
  });
  assert.equal(result.releaseDate, "2026-07-26");
});

test("reports every manifest value when versions disagree", () => {
  assert.throws(
    () =>
      verifyReleaseVersionSources({
        rawTag: "v1.2.3",
        packageJsonSource: JSON.stringify({ version: "1.2.3" }),
        cargoTomlSource: '[package]\nversion = "1.2.4"\n',
        tauriConfigSource: JSON.stringify({ version: "1.2.5" }),
        changelogSource: "## [1.2.3] - 2026-07-26\n",
        chineseChangelogSource: "## [1.2.3] - 2026-07-26\n",
      }),
    (error) => {
      assert.match(
        error.message,
        /release tag v1\.2\.3 does not match every application version/,
      );
      assert.match(error.message, /package\.json: 1\.2\.3/);
      assert.match(error.message, /Cargo\.toml: 1\.2\.4/);
      assert.match(error.message, /tauri\.conf\.json: 1\.2\.5/);
      return true;
    },
  );
});

test("rejects invalid or missing versions in each manifest", async (t) => {
  const cases = [
    {
      name: "package.json",
      sources: {
        ...manifestSources("1.2.3"),
        packageJsonSource: JSON.stringify({ version: "01.2.3" }),
      },
      expected: /package\.json has an invalid or missing semantic version/,
    },
    {
      name: "package.json valid JSON without an object version",
      sources: {
        ...manifestSources("1.2.3"),
        packageJsonSource: "null",
      },
      expected: /package\.json has an invalid or missing semantic version/,
    },
    {
      name: "Cargo.toml",
      sources: {
        ...manifestSources("1.2.3"),
        cargoTomlSource: '[package]\nname = "mirro-deck"\n',
      },
      expected:
        /src-tauri\/Cargo\.toml has an invalid or missing semantic version/,
    },
    {
      name: "tauri.conf.json",
      sources: {
        ...manifestSources("1.2.3"),
        tauriConfigSource: JSON.stringify({ version: 123 }),
      },
      expected:
        /src-tauri\/tauri\.conf\.json has an invalid or missing semantic version/,
    },
  ];

  for (const { name, sources, expected } of cases) {
    await t.test(name, () => {
      assert.throws(() => verifyReleaseVersionSources(sources), expected);
    });
  }
});

test("identifies malformed JSON manifest files", () => {
  assert.throws(
    () =>
      verifyReleaseVersionSources({
        ...manifestSources("1.2.3"),
        packageJsonSource: "{",
      }),
    /package\.json is not valid JSON/,
  );
  assert.throws(
    () =>
      verifyReleaseVersionSources({
        ...manifestSources("1.2.3"),
        tauriConfigSource: "{",
      }),
    /src-tauri\/tauri\.conf\.json is not valid JSON/,
  );
});

test("requires valid and matching bilingual changelog dates", () => {
  assert.equal(
    readChangelogReleaseDate(
      "CHANGELOG.md",
      "## [1.2.3] - 2026-07-26\n",
      "1.2.3",
    ),
    "2026-07-26",
  );
  assert.throws(
    () =>
      verifyReleaseVersionSources({
        ...manifestSources("1.2.3"),
        changelogSource: "## [1.2.3] - Unreleased\n",
      }),
    /must contain a dated/,
  );
  assert.throws(
    () =>
      verifyReleaseVersionSources({
        ...manifestSources("1.2.3"),
        chineseChangelogSource: "## [1.2.3] - 2026-07-25\n",
      }),
    /bilingual changelog release dates disagree/,
  );
  assert.throws(
    () =>
      readChangelogReleaseDate(
        "CHANGELOG.md",
        "## [1.2.3] - 2026-02-30\n",
        "1.2.3",
      ),
    /invalid release date/,
  );
});

test("loads and verifies manifests from an isolated project directory", async (t) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "mirro-release-test-"));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  await mkdir(join(projectRoot, "src-tauri"), { recursive: true });
  await Promise.all([
    writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify({ version: "2.0.0" }),
    ),
    writeFile(
      join(projectRoot, "src-tauri", "Cargo.toml"),
      '[package]\nversion = "2.0.0"\n',
    ),
    writeFile(
      join(projectRoot, "src-tauri", "tauri.conf.json"),
      JSON.stringify({ version: "2.0.0" }),
    ),
    writeFile(join(projectRoot, "CHANGELOG.md"), "## [2.0.0] - 2026-07-26\n"),
    writeFile(
      join(projectRoot, "CHANGELOG.zh-CN.md"),
      "## [2.0.0] - 2026-07-26\n",
    ),
  ]);

  const result = await verifyReleaseVersionFiles({
    projectRoot,
    rawTag: "v2.0.0",
  });
  assert.equal(result.expectedVersion, "2.0.0");
  assert.equal(result.releaseDate, "2026-07-26");
});

function manifestSources(version) {
  return {
    rawTag: `v${version}`,
    packageJsonSource: JSON.stringify({ version }),
    cargoTomlSource: `[package]\nversion = "${version}"\n`,
    tauriConfigSource: JSON.stringify({ version }),
    changelogSource: `## [${version}] - 2026-07-26\n`,
    chineseChangelogSource: `## [${version}] - 2026-07-26\n`,
  };
}
