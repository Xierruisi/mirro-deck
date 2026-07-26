import de from "./locales/de.json" with { type: "json" };
import en from "./locales/en.json" with { type: "json" };
import es from "./locales/es.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import ja from "./locales/ja.json" with { type: "json" };
import ko from "./locales/ko.json" with { type: "json" };
import ru from "./locales/ru.json" with { type: "json" };
import zhCN from "./locales/zh-CN.json" with { type: "json" };

import type { SupportedLanguage } from "./language.ts";

export type TranslationKey = keyof typeof en;
export type TranslationValues = Record<string, number | string>;
export type Translate = (
  key: TranslationKey,
  values?: TranslationValues,
) => string;
export type LocalizedMessage = {
  key: string;
  values?: Record<string, number | string>;
};

type TranslationCatalog = Record<TranslationKey, string>;

export const i18nCatalogs = {
  de: de satisfies TranslationCatalog,
  en: en satisfies TranslationCatalog,
  es: es satisfies TranslationCatalog,
  fr: fr satisfies TranslationCatalog,
  ja: ja satisfies TranslationCatalog,
  ko: ko satisfies TranslationCatalog,
  ru: ru satisfies TranslationCatalog,
  "zh-CN": zhCN satisfies TranslationCatalog,
} satisfies Record<SupportedLanguage, TranslationCatalog>;

const interpolationPattern = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function translateCatalogMessage(
  language: SupportedLanguage,
  key: TranslationKey,
  values?: TranslationValues,
): string {
  const template = i18nCatalogs[language][key] ?? i18nCatalogs.en[key];
  if (!values) return template;
  return template.replace(interpolationPattern, (match: string, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

export function translateLocalizedMessage(
  message: unknown,
  t: Translate,
): string | undefined {
  if (
    !isRecord(message) ||
    !Object.prototype.hasOwnProperty.call(message, "key") ||
    typeof message.key !== "string"
  ) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(i18nCatalogs.en, message.key)) {
    return undefined;
  }

  return t(
    message.key as TranslationKey,
    normalizeTranslationValues(message.values),
  );
}

function normalizeTranslationValues(
  values: unknown,
): TranslationValues | undefined {
  if (!isRecord(values)) return undefined;

  const normalized: TranslationValues = {};
  for (const [name, value] of Object.entries(values)) {
    if (
      typeof value === "string" ||
      (typeof value === "number" && Number.isFinite(value))
    ) {
      normalized[name] = value;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
