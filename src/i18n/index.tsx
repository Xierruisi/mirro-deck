import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";

import {
  translateCatalogMessage,
  type Translate,
  type TranslationKey,
} from "./catalogs";
import {
  isLanguagePreference,
  languageStorageKey,
  resolveLanguagePreference,
  resolveSystemLanguage,
  type LanguagePreference,
  type SupportedLanguage,
} from "./language";

export {
  supportedLanguages,
  type LanguagePreference,
  type SupportedLanguage,
} from "./language";
export {
  i18nCatalogs,
  translateLocalizedMessage,
  type LocalizedMessage,
  type Translate,
  type TranslationKey,
  type TranslationValues,
} from "./catalogs";

type I18nContextValue = {
  language: SupportedLanguage;
  languageName: (language: SupportedLanguage, native?: boolean) => string;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  systemLanguage: SupportedLanguage;
  t: Translate;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(
    loadLanguagePreference,
  );
  const [systemLanguage, setSystemLanguage] = useState<SupportedLanguage>(
    detectSystemLanguage,
  );
  const language = resolveLanguagePreference(preference, systemLanguage);

  const t = useCallback<Translate>(
    (key, values) => translateCatalogMessage(language, key, values),
    [language],
  );

  const languageName = useCallback(
    (targetLanguage: SupportedLanguage, native = false) => {
      const prefix = native ? "language.native." : "language.";
      return t(`${prefix}${targetLanguage}` as TranslationKey);
    },
    [t],
  );

  const setPreference = useCallback((nextPreference: LanguagePreference) => {
    setPreferenceState(nextPreference);
    try {
      window.localStorage.setItem(languageStorageKey, nextPreference);
    } catch {
      // The in-memory choice still works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const syncSystemLanguage = () => setSystemLanguage(detectSystemLanguage());
    window.addEventListener("languagechange", syncSystemLanguage);
    return () => window.removeEventListener("languagechange", syncSystemLanguage);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
  }, [language]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    void invoke("set_app_language", { language }).catch(() => undefined);
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      languageName,
      preference,
      setPreference,
      systemLanguage,
      t,
    }),
    [language, languageName, preference, setPreference, systemLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

function detectSystemLanguage() {
  const languageTags =
    navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  return resolveSystemLanguage(languageTags);
}

function loadLanguagePreference(): LanguagePreference {
  try {
    const stored = window.localStorage.getItem(languageStorageKey);
    return isLanguagePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}
