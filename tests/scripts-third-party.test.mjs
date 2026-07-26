import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findUnreviewedCargoSources,
  reviewNpmLicenses,
  verifyRequiredNotices,
} from "../scripts/check-third-party-lib.mjs";

test("reviews every npm package license and reports a stable summary", () => {
  const result = reviewNpmLicenses({
    packages: {
      "": { name: "application" },
      "node_modules/a": { license: "MIT" },
      "node_modules/b": { license: "Apache-2.0" },
      "node_modules/c": { license: "MIT" },
    },
  });

  assert.deepEqual(result, {
    packageCount: 3,
    licenses: {
      "Apache-2.0": 1,
      MIT: 2,
    },
  });
});

test("blocks missing and previously unreviewed npm licenses", () => {
  assert.throws(
    () =>
      reviewNpmLicenses({
        packages: {
          "": {},
          "node_modules/missing": {},
        },
      }),
    /missing license metadata.*node_modules\/missing/s,
  );
  assert.throws(
    () =>
      reviewNpmLicenses({
        packages: {
          "": {},
          "node_modules/new-license": { license: "Example-1.0" },
        },
      }),
    /licenses requiring review.*Example-1\.0/s,
  );
});

test("accepts crates.io and identifies other Cargo dependency sources", () => {
  const source = [
    'source = "registry+https://github.com/rust-lang/crates.io-index"',
    'source = "git+https://example.invalid/project#deadbeef"',
  ].join("\n");

  assert.deepEqual(findUnreviewedCargoSources(source), [
    "git+https://example.invalid/project#deadbeef",
  ]);
});

test("requires copied-code attribution in the legal documents", () => {
  assert.doesNotThrow(() =>
    verifyRequiredNotices({
      noticeSource: "Copyright (c) 2023 shadcn\nMIT License",
      englishNoticesSource: "Files under `src/components/ui/`",
      chineseNoticesSource: "`src/components/ui/`",
    }),
  );
  assert.throws(
    () =>
      verifyRequiredNotices({
        noticeSource: "MIT License",
        englishNoticesSource: "",
        chineseNoticesSource: "",
      }),
    /required third-party notices are missing/,
  );
});
