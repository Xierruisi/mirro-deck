import assert from "node:assert/strict";
import test from "node:test";

import {
  i18nCatalogs,
  translateCatalogMessage,
  translateLocalizedMessage,
  type Translate,
  type TranslationKey,
  type TranslationValues,
} from "../src/i18n/catalogs.ts";

const english: Translate = (key, values) =>
  translateCatalogMessage("en", key, values);

test("catalog translation interpolates own values and leaves missing values visible", () => {
  assert.equal(
    translateCatalogMessage("en", "common.version", { version: "1.2.3" }),
    "Version 1.2.3",
  );
  assert.equal(
    translateCatalogMessage("en", "common.version"),
    "Version {{version}}",
  );

  const inherited = Object.create({ version: "untrusted" }) as TranslationValues;
  assert.equal(
    translateCatalogMessage("en", "common.version", inherited),
    "Version {{version}}",
  );
});

test("every catalog can translate every English key", () => {
  const englishKeys = Object.keys(i18nCatalogs.en) as TranslationKey[];
  for (const [language, catalog] of Object.entries(i18nCatalogs)) {
    assert.deepEqual(
      Object.keys(catalog).sort(),
      [...englishKeys].sort(),
      `${language} catalog should have exactly the English keys`,
    );
    for (const key of englishKeys) {
      assert.equal(typeof catalog[key], "string");
      assert.notEqual(catalog[key].length, 0);
    }
  }
});

test("localized backend messages use known keys and interpolate sanitized values", () => {
  assert.equal(
    translateLocalizedMessage(
      { key: "common.version", values: { version: "4.1" } },
      english,
    ),
    "Version 4.1",
  );

  let receivedValues: TranslationValues | undefined;
  const capture: Translate = (_key, values) => {
    receivedValues = values;
    return "translated";
  };
  assert.equal(
    translateLocalizedMessage(
      {
        key: "settings.updates.downloadingProgress",
        values: {
          progress: 42,
          label: "safe",
          nested: { unsafe: true },
          infinite: Number.POSITIVE_INFINITY,
          missing: null,
        },
      },
      capture,
    ),
    "translated",
  );
  assert.deepEqual(receivedValues, { progress: 42, label: "safe" });
});

test("localized backend messages reject malformed and unknown payloads", () => {
  for (const message of [
    undefined,
    null,
    "",
    1,
    [],
    {},
    { key: 42 },
    { key: "unknown.translation.key" },
  ]) {
    assert.equal(translateLocalizedMessage(message, english), undefined);
  }

  const inheritedKey = Object.create({ key: "common.version" });
  assert.equal(translateLocalizedMessage(inheritedKey, english), undefined);
});

test("non-record values collections are ignored safely", () => {
  assert.equal(
    translateLocalizedMessage(
      { key: "common.version", values: ["not", "a", "record"] },
      english,
    ),
    "Version {{version}}",
  );
  assert.equal(
    translateLocalizedMessage(
      { key: "common.version", values: { version: 0 } },
      english,
    ),
    "Version 0",
  );
});
