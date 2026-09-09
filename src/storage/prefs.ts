import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  Article,
  LanguageFilter,
  NewsSource,
  RegionFilter,
  UiLanguagePreference,
} from '../types';

const KEYS = {
  region: 'prefs:region',
  enabledSources: 'prefs:enabledSources',
  customSources: 'prefs:customSources',
  saved: 'prefs:savedArticles',
  uiLanguage: 'prefs:uiLanguage',
  languageFilter: 'prefs:languageFilter',
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    // Corrupt or unreadable storage should never block app start.
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persisting preferences is best-effort; the in-memory state still applies.
  }
}

export const loadRegion = () => readJson<RegionFilter>(KEYS.region, 'all');
export const saveRegion = (region: RegionFilter) => writeJson(KEYS.region, region);

/**
 * `null` means "the user has never chosen", which the app reads as
 * "every source is on" — different from an explicit empty selection.
 */
export const loadEnabledSourceIds = () => readJson<string[] | null>(KEYS.enabledSources, null);
export const saveEnabledSourceIds = (ids: string[]) => writeJson(KEYS.enabledSources, ids);

export const loadCustomSources = () => readJson<NewsSource[]>(KEYS.customSources, []);
export const saveCustomSources = (sources: NewsSource[]) => writeJson(KEYS.customSources, sources);

export const loadSavedArticles = () => readJson<Article[]>(KEYS.saved, []);
export const saveSavedArticles = (articles: Article[]) => writeJson(KEYS.saved, articles);

/** Defaults to `system`, so a fresh install follows the device language. */
export const loadUiLanguage = () => readJson<UiLanguagePreference>(KEYS.uiLanguage, 'system');
export const saveUiLanguage = (preference: UiLanguagePreference) =>
  writeJson(KEYS.uiLanguage, preference);

export const loadLanguageFilter = () => readJson<LanguageFilter>(KEYS.languageFilter, 'all');
export const saveLanguageFilter = (filter: LanguageFilter) => writeJson(KEYS.languageFilter, filter);
