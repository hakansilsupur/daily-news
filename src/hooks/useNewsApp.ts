import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BUILT_IN_SOURCES } from '../data/sources';
import { fetchAllFeeds, mergeAndSort, searchArticles } from '../services/newsService';
import * as prefs from '../storage/prefs';
import type { Article, NewsSource, RegionFilter } from '../types';

export interface NewsApp {
  ready: boolean;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: number | null;
  /** Source id -> error message, for feeds that failed on the last fetch. */
  errors: Record<string, string>;

  allSources: NewsSource[];
  /** Sources in the current region, whether enabled or not. */
  regionSources: NewsSource[];
  /** Sources actually fetched: in the current region and switched on. */
  activeSources: NewsSource[];
  enabledIds: string[] | null;

  region: RegionFilter;
  setRegion: (region: RegionFilter) => void;

  query: string;
  setQuery: (query: string) => void;

  articles: Article[];
  savedArticles: Article[];

  isSourceEnabled: (id: string) => boolean;
  toggleSource: (id: string) => void;
  setAllSourcesEnabled: (enabled: boolean) => void;

  addCustomSource: (input: { name: string; feedUrl: string; region: 'turkey' | 'world' }) => string | null;
  removeCustomSource: (id: string) => void;

  isSaved: (id: string) => boolean;
  toggleSaved: (article: Article) => void;

  refresh: () => void;
}

function inRegion(source: NewsSource, region: RegionFilter): boolean {
  return region === 'all' || source.region === region;
}

export function useNewsApp(): NewsApp {
  const [ready, setReady] = useState(false);
  const [region, setRegionState] = useState<RegionFilter>('all');
  const [enabledIds, setEnabledIds] = useState<string[] | null>(null);
  const [customSources, setCustomSources] = useState<NewsSource[]>([]);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);

  const [rawArticles, setRawArticles] = useState<Article[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const inFlight = useRef<AbortController | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // --- Hydrate persisted preferences once ---------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedRegion, storedEnabled, storedCustom, storedSaved] = await Promise.all([
        prefs.loadRegion(),
        prefs.loadEnabledSourceIds(),
        prefs.loadCustomSources(),
        prefs.loadSavedArticles(),
      ]);

      if (cancelled) return;
      setRegionState(storedRegion);
      setEnabledIds(storedEnabled);
      setCustomSources(storedCustom);
      setSavedArticles(storedSaved);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const allSources = useMemo(
    () => [...BUILT_IN_SOURCES, ...customSources],
    [customSources],
  );

  const isSourceEnabled = useCallback(
    (id: string) => enabledIds === null || enabledIds.includes(id),
    [enabledIds],
  );

  const regionSources = useMemo(
    () => allSources.filter((source) => inRegion(source, region)),
    [allSources, region],
  );

  const activeSources = useMemo(
    () => regionSources.filter((source) => isSourceEnabled(source.id)),
    [regionSources, isSourceEnabled],
  );

  // Refetch whenever the effective source set changes, keyed on ids so that a
  // re-render with an equivalent array does not trigger a new network round.
  const activeKey = activeSources.map((source) => source.id).sort().join('|');

  useEffect(() => {
    if (!ready) return;

    if (activeSources.length === 0) {
      inFlight.current?.abort();
      setRawArticles([]);
      setErrors({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const controller = new AbortController();
    inFlight.current?.abort();
    inFlight.current = controller;
    setLoading(true);

    (async () => {
      const results = await fetchAllFeeds(activeSources, controller.signal);
      if (controller.signal.aborted) return;

      const failures: Record<string, string> = {};
      for (const result of results) {
        if (result.error) failures[result.sourceId] = result.error;
      }

      setRawArticles(mergeAndSort(results));
      setErrors(failures);
      setLastUpdated(Date.now());
      setLoading(false);
      setRefreshing(false);
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeKey, reloadToken]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const setRegion = useCallback((next: RegionFilter) => {
    setRegionState(next);
    void prefs.saveRegion(next);
  }, []);

  const commitEnabled = useCallback((ids: string[]) => {
    setEnabledIds(ids);
    void prefs.saveEnabledSourceIds(ids);
  }, []);

  const toggleSource = useCallback(
    (id: string) => {
      // The first toggle materialises the implicit "everything is on" state.
      const current = enabledIds ?? allSources.map((source) => source.id);
      commitEnabled(
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    },
    [enabledIds, allSources, commitEnabled],
  );

  const setAllSourcesEnabled = useCallback(
    (enabled: boolean) => {
      const current = new Set(enabledIds ?? allSources.map((source) => source.id));
      for (const source of regionSources) {
        if (enabled) current.add(source.id);
        else current.delete(source.id);
      }
      commitEnabled([...current]);
    },
    [enabledIds, allSources, regionSources, commitEnabled],
  );

  const commitCustom = useCallback((sources: NewsSource[]) => {
    setCustomSources(sources);
    void prefs.saveCustomSources(sources);
  }, []);

  const addCustomSource = useCallback<NewsApp['addCustomSource']>(
    ({ name, feedUrl, region: sourceRegion }) => {
      const trimmedName = name.trim();
      const trimmedUrl = feedUrl.trim();

      if (!trimmedName) return 'Give the source a name.';
      if (!/^https?:\/\/.+/i.test(trimmedUrl)) return 'Enter a full feed URL starting with http(s)://.';
      if (allSources.some((source) => source.feedUrl === trimmedUrl)) return 'That feed is already in your list.';

      commitCustom([
        ...customSources,
        {
          id: `custom:${Date.now()}`,
          name: trimmedName,
          feedUrl: trimmedUrl,
          region: sourceRegion,
          category: 'general',
          language: sourceRegion === 'turkey' ? 'tr' : 'en',
          custom: true,
        },
      ]);
      return null;
    },
    [allSources, customSources, commitCustom],
  );

  const removeCustomSource = useCallback(
    (id: string) => {
      commitCustom(customSources.filter((source) => source.id !== id));
      if (enabledIds) commitEnabled(enabledIds.filter((item) => item !== id));
    },
    [customSources, commitCustom, enabledIds, commitEnabled],
  );

  const savedIds = useMemo(
    () => new Set(savedArticles.map((article) => article.id)),
    [savedArticles],
  );

  const toggleSaved = useCallback(
    (article: Article) => {
      setSavedArticles((current) => {
        const next = current.some((item) => item.id === article.id)
          ? current.filter((item) => item.id !== article.id)
          : [article, ...current];
        void prefs.saveSavedArticles(next);
        return next;
      });
    },
    [],
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  }, []);

  const articles = useMemo(() => searchArticles(rawArticles, query), [rawArticles, query]);

  return {
    ready,
    loading,
    refreshing,
    lastUpdated,
    errors,
    allSources,
    regionSources,
    activeSources,
    enabledIds,
    region,
    setRegion,
    query,
    setQuery,
    articles,
    savedArticles,
    isSourceEnabled,
    toggleSource,
    setAllSourcesEnabled,
    addCustomSource,
    removeCustomSource,
    isSaved: useCallback((id: string) => savedIds.has(id), [savedIds]),
    toggleSaved,
    refresh,
  };
}
