import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_COUNTRY,
  DEFAULT_TRANSLATION_LANGUAGE,
  isCountryCode,
  isTranslationLanguage,
} from '../data/countries';
import { ALL_TAB_ID } from '../data/tabs';
import type {
  Article,
  CountryCode,
  FeedTab,
  LanguageFilter,
  NewsSource,
  RegionFilter,
  TranslationLanguage,
  UiLanguagePreference,
} from '../types';

const KEYS = {
  region: 'prefs:region',
  enabledSources: 'prefs:enabledSources',
  customSources: 'prefs:customSources',
  saved: 'prefs:savedArticles',
  uiLanguage: 'prefs:uiLanguage',
  languageFilter: 'prefs:languageFilter',
  feedTabs: 'prefs:feedTabs',
  selectedTab: 'prefs:selectedTab',
  country: 'prefs:country',
  translatePreviews: 'prefs:translatePreviews',
  translationLanguage: 'prefs:translationLanguage',
  translations: 'prefs:translations',
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

/**
 * Before countries were selectable the local bucket was stored as `turkey`.
 * Upgrading installs read that as `local`, which now resolves against whichever
 * country the user has chosen.
 */
export async function loadRegion(): Promise<RegionFilter> {
  const stored = await readJson<string>(KEYS.region, 'all');
  if (stored === 'turkey') return 'local';
  return stored === 'local' || stored === 'world' ? stored : 'all';
}

export const saveRegion = (region: RegionFilter) => writeJson(KEYS.region, region);

export async function loadCountry(): Promise<CountryCode> {
  const stored = await readJson<string>(KEYS.country, DEFAULT_COUNTRY);
  return isCountryCode(stored) ? stored : DEFAULT_COUNTRY;
}

export const saveCountry = (country: CountryCode) => writeJson(KEYS.country, country);

/**
 * `null` means "the user has never chosen", which the app reads as
 * "every source is on" — different from an explicit empty selection.
 */
export const loadEnabledSourceIds = () => readJson<string[] | null>(KEYS.enabledSources, null);
export const saveEnabledSourceIds = (ids: string[]) => writeJson(KEYS.enabledSources, ids);

/** Custom feeds saved before countries existed carry `region: 'turkey'`. */
export async function loadCustomSources(): Promise<NewsSource[]> {
  const stored = await readJson<NewsSource[]>(KEYS.customSources, []);
  return stored.map((source) =>
    (source.region as string) === 'turkey' ? { ...source, region: 'tr' } : source,
  );
}
export const saveCustomSources = (sources: NewsSource[]) => writeJson(KEYS.customSources, sources);

export const loadSavedArticles = () => readJson<Article[]>(KEYS.saved, []);
export const saveSavedArticles = (articles: Article[]) => writeJson(KEYS.saved, articles);

/** Defaults to `system`, so a fresh install follows the device language. */
export const loadUiLanguage = () => readJson<UiLanguagePreference>(KEYS.uiLanguage, 'system');
export const saveUiLanguage = (preference: UiLanguagePreference) =>
  writeJson(KEYS.uiLanguage, preference);

export const loadLanguageFilter = () => readJson<LanguageFilter>(KEYS.languageFilter, 'all');
export const saveLanguageFilter = (filter: LanguageFilter) => writeJson(KEYS.languageFilter, filter);

/** Türkçe is the default target; any supported language can replace it. */
export async function loadTranslationLanguage(): Promise<TranslationLanguage> {
  const stored = await readJson<string>(KEYS.translationLanguage, DEFAULT_TRANSLATION_LANGUAGE);
  return isTranslationLanguage(stored) ? stored : DEFAULT_TRANSLATION_LANGUAGE;
}

export const saveTranslationLanguage = (language: TranslationLanguage) =>
  writeJson(KEYS.translationLanguage, language);

export const loadTranslatePreviews = () => readJson<boolean>(KEYS.translatePreviews, true);
export const saveTranslatePreviews = (enabled: boolean) =>
  writeJson(KEYS.translatePreviews, enabled);

/**
 * Translated previews, keyed by `<language>:<articleId>`. Cached on the device
 * so a headline is translated once rather than on every scroll back, and capped
 * so the store cannot grow without bound.
 */
export const TRANSLATION_CACHE_LIMIT = 500;

export const loadTranslations = () =>
  readJson<Record<string, { title: string; summary: string }>>(KEYS.translations, {});

export const saveTranslations = (entries: Record<string, { title: string; summary: string }>) => {
  const keys = Object.keys(entries);
  const trimmed =
    keys.length <= TRANSLATION_CACHE_LIMIT
      ? entries
      : Object.fromEntries(keys.slice(keys.length - TRANSLATION_CACHE_LIMIT).map((key) => [key, entries[key]]));

  return writeJson(KEYS.translations, trimmed);
};

export const loadFeedTabs = () => readJson<FeedTab[]>(KEYS.feedTabs, []);
export const saveFeedTabs = (tabs: FeedTab[]) => writeJson(KEYS.feedTabs, tabs);

export const loadSelectedTab = () => readJson<string>(KEYS.selectedTab, ALL_TAB_ID);
export const saveSelectedTab = (id: string) => writeJson(KEYS.selectedTab, id);
