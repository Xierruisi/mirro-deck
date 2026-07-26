export const supportedLanguages = [
  "en",
  "zh-CN",
  "ru",
  "ko",
  "es",
  "fr",
  "de",
  "ja",
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type LanguagePreference = "system" | SupportedLanguage;

export const defaultLanguage: SupportedLanguage = "en";
export const languageStorageKey = "mirrodeck-language";

const supportedLanguageSet = new Set<string>(supportedLanguages);

export function normalizeLanguageTag(tag: string): SupportedLanguage | undefined {
  const normalized = tag.trim().replace(/_/g, "-").toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN";

  const baseLanguage = normalized.split("-")[0];
  return supportedLanguageSet.has(baseLanguage)
    ? (baseLanguage as SupportedLanguage)
    : undefined;
}

export function resolveSystemLanguage(
  languageTags: readonly string[],
): SupportedLanguage {
  for (const languageTag of languageTags) {
    const supportedLanguage = normalizeLanguageTag(languageTag);
    if (supportedLanguage) return supportedLanguage;
  }
  return defaultLanguage;
}

export function isLanguagePreference(
  value: string | null,
): value is LanguagePreference {
  return value === "system" || (value !== null && supportedLanguageSet.has(value));
}

export function resolveLanguagePreference(
  preference: LanguagePreference,
  systemLanguage: SupportedLanguage,
): SupportedLanguage {
  return preference === "system" ? systemLanguage : preference;
}
