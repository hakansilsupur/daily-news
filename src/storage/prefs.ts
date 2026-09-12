import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_COUNTRY, isCountryCode } from '../data/countries';
import type { Article, CountryCode, NewsSource, ScopeMode } from '../types';

const KEYS = {
  scopeMode: 'prefs:scopeMode',
  country: 'prefs:country',
  enabledSources: 'prefs:enabledSources',
  customSources: 'prefs:customSources',
  saved: 'prefs:savedArticles',
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

/** Defaults to the selected country, which itself defaults to Türkiye. */
export const loadScopeMode = () => readJson<ScopeMode>(KEYS.scopeMode, 'country');
export const saveScopeMode = (mode: ScopeMode) => writeJson(KEYS.scopeMode, mode);

/**
 * Falls back to the default country if storage holds a code the app no longer
 * ships — otherwise a removed country would leave the feed permanently empty.
 */
export async function loadCountry(): Promise<CountryCode> {
  const stored = await readJson<unknown>(KEYS.country, DEFAULT_COUNTRY);
  return isCountryCode(stored) ? stored : DEFAULT_COUNTRY;
}

export const saveCountry = (country: CountryCode) => writeJson(KEYS.country, country);

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
