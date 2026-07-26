import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultLanguage,
  isLanguagePreference,
  normalizeLanguageTag,
  resolveLanguagePreference,
  resolveSystemLanguage,
} from "../src/i18n/language.ts";

test("normalizes supported regional language tags", () => {
  assert.equal(normalizeLanguageTag("en-US"), "en");
  assert.equal(normalizeLanguageTag("zh-Hans-CN"), "zh-CN");
  assert.equal(normalizeLanguageTag("zh_TW"), "zh-CN");
  assert.equal(normalizeLanguageTag("ru-RU"), "ru");
  assert.equal(normalizeLanguageTag("ko-KR"), "ko");
  assert.equal(normalizeLanguageTag("es-419"), "es");
  assert.equal(normalizeLanguageTag("fr-CA"), "fr");
  assert.equal(normalizeLanguageTag("de-AT"), "de");
  assert.equal(normalizeLanguageTag("ja-JP"), "ja");
});

test("falls through the user's ordered language list", () => {
  assert.equal(resolveSystemLanguage(["pt-BR", "fr-CA", "en-US"]), "fr");
  assert.equal(resolveSystemLanguage(["ar", "pt-BR"]), defaultLanguage);
});

test("accepts only persisted language preferences", () => {
  assert.equal(isLanguagePreference("system"), true);
  assert.equal(isLanguagePreference("zh-CN"), true);
  assert.equal(isLanguagePreference("pt"), false);
  assert.equal(isLanguagePreference(null), false);
});

test("follows the system by default but honors an explicit override", () => {
  assert.equal(resolveLanguagePreference("system", "ko"), "ko");
  assert.equal(resolveLanguagePreference("fr", "ko"), "fr");
});
