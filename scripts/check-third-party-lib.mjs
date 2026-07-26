export const approvedNpmLicenses = Object.freeze([
  "0BSD",
  "Apache-2.0",
  "Apache-2.0 OR MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "ISC",
  "MIT",
  "MIT OR Apache-2.0",
  "MPL-2.0",
]);

export function reviewNpmLicenses(
  lockfile,
  approvedLicenses = approvedNpmLicenses,
) {
  if (
    lockfile === null ||
    typeof lockfile !== "object" ||
    lockfile.packages === null ||
    typeof lockfile.packages !== "object"
  ) {
    throw new Error("package-lock.json does not contain a packages object");
  }

  const approved = new Set(approvedLicenses);
  const missing = [];
  const unreviewed = [];
  const counts = new Map();
  let packageCount = 0;

  for (const [path, metadata] of Object.entries(lockfile.packages)) {
    if (path === "") continue;
    packageCount += 1;
    const license = metadata?.license;
    if (typeof license !== "string" || license.trim() === "") {
      missing.push(path);
      continue;
    }
    counts.set(license, (counts.get(license) ?? 0) + 1);
    if (!approved.has(license)) unreviewed.push(`${path}: ${license}`);
  }

  if (missing.length > 0) {
    throw new Error(
      `npm packages with missing license metadata:\n- ${missing.join("\n- ")}`,
    );
  }
  if (unreviewed.length > 0) {
    throw new Error(
      `npm packages with licenses requiring review:\n- ${unreviewed.join("\n- ")}`,
    );
  }

  return {
    packageCount,
    licenses: Object.fromEntries(
      [...counts].sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

export function findUnreviewedCargoSources(cargoLockSource) {
  if (typeof cargoLockSource !== "string") {
    throw new Error("src-tauri/Cargo.lock is not text");
  }

  return [...cargoLockSource.matchAll(/^source = "([^"]+)"$/gm)]
    .map((match) => match[1])
    .filter(
      (source) =>
        source !== "registry+https://github.com/rust-lang/crates.io-index",
    );
}

export function verifyRequiredNotices({
  noticeSource,
  englishNoticesSource,
  chineseNoticesSource,
}) {
  const requirements = [
    ["NOTICE", noticeSource, "Copyright (c) 2023 shadcn"],
    ["NOTICE", noticeSource, "MIT License"],
    [
      "THIRD_PARTY_NOTICES.md",
      englishNoticesSource,
      "Files under `src/components/ui/`",
    ],
    [
      "THIRD_PARTY_NOTICES.zh-CN.md",
      chineseNoticesSource,
      "`src/components/ui/`",
    ],
  ];

  const missing = requirements
    .filter(([, source, fragment]) => !source?.includes(fragment))
    .map(([path, , fragment]) => `${path}: ${fragment}`);
  if (missing.length > 0) {
    throw new Error(
      `required third-party notices are missing:\n- ${missing.join("\n- ")}`,
    );
  }
}
