import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_COUNTRY, isCountryCode } from '../data/countries';
import { ALL_TAB_ID } from '../data/tabs';
import type {
  Article,
  CountryCode,
  FeedTab,
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
  feedTabs: 'prefs:feedTabs',
  selectedTab: 'prefs:selectedTab',
  country: 'prefs:country',
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

export const loadFeedTabs = () => readJson<FeedTab[]>(KEYS.feedTabs, []);
export const saveFeedTabs = (tabs: FeedTab[]) => writeJson(KEYS.feedTabs, tabs);

export const loadSelectedTab = () => readJson<string>(KEYS.selectedTab, ALL_TAB_ID);
export const saveSelectedTab = (id: string) => writeJson(KEYS.selectedTab, id);
