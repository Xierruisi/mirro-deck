import assert from "node:assert/strict";
import { test } from "node:test";
import { isEnglishDefaultReadme } from "../scripts/check-docs-lib.mjs";

test("accepts the English README entry point with LF line endings", () => {
  assert.equal(
    isEnglishDefaultReadme("# MirroDeck\n\n**English** | [简体中文](README.zh-CN.md)\n"),
    true,
  );
});

test("accepts the English README entry point with Windows CRLF line endings", () => {
  assert.equal(
    isEnglishDefaultReadme(
      "# MirroDeck\r\n\r\n**English** | [简体中文](README.zh-CN.md)\r\n",
    ),
    true,
  );
});

test("rejects a non-English default README entry point", () => {
  assert.equal(
    isEnglishDefaultReadme("# MirroDeck\n\n**简体中文** | [English](README.md)\n"),
    false,
  );
});
