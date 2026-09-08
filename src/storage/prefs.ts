import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Article, NewsSource, RegionFilter } from '../types';

const KEYS = {
  region: 'prefs:region',
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
