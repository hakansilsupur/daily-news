import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BUILT_IN_SOURCES, filterSources } from '../data/sources';
import { ALL_TAB_ID, pruneTab, sourcesForTab } from '../data/tabs';
import {
  resolveLanguage,
  stringsFor,
  type AddSourceError,
  type FeedTabError,
  type Strings,
} from '../i18n';
import { fetchAllFeeds, mergeAndSort, searchArticles } from '../services/newsService';
import * as prefs from '../storage/prefs';
import type {
  Article,
  FeedTab,
  LanguageFilter,
  NewsSource,
  RegionFilter,
  SourceCategory,
  SourceLanguage,
  UiLanguage,
  UiLanguagePreference,
} from '../types';

export interface NewsApp {
  ready: boolean;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: number | null;
  /** Source id -> error message, for feeds that failed on the last fetch. */
  errors: Record<string, string>;

  allSources: NewsSource[];
  /** Sources matching the region and language filters, whether enabled or not. */
  regionSources: NewsSource[];
  /** Sources actually fetched: matching the filters and switched on. */
  activeSources: NewsSource[];
  enabledIds: string[] | null;

  /** Pinned tabs the user created; the built-in "all" tab is not in here. */
  feedTabs: FeedTab[];
  selectedTabId: string;
  /** The pinned tab in view, or null while the built-in "all" tab is selected. */
  selectedTab: FeedTab | null;
  selectTab: (id: string) => void;
  /** Returns an error code for the caller to translate, or null on success. */
  saveFeedTab: (input: { id?: string; name: string; sourceIds: string[] }) => FeedTabError | null;
  removeFeedTab: (id: string) => void;

  region: RegionFilter;
  setRegion: (region: RegionFilter) => void;

  /** Language of the sources to show — independent of the interface language. */
  languageFilter: LanguageFilter;
  setLanguageFilter: (filter: LanguageFilter) => void;

  /** What the user chose, including `system`. */
  uiLanguagePreference: UiLanguagePreference;
  /** The language that choice resolves to right now. */
  uiLanguage: UiLanguage;
  setUiLanguagePreference: (preference: UiLanguagePreference) => void;
  /** Translated strings for `uiLanguage`. */
  t: Strings;

  query: string;
  setQuery: (query: string) => void;

  articles: Article[];
  savedArticles: Article[];

  isSourceEnabled: (id: string) => boolean;
  toggleSource: (id: string) => void;
  setAllSourcesEnabled: (enabled: boolean) => void;

  /** Returns an error code for the caller to translate, or null on success. */
  addCustomSource: (input: {
    name: string;
    feedUrl: string;
    region: 'turkey' | 'world';
    /** Carried over when the source came from the directory; guessed otherwise. */
    language?: SourceLanguage;
    category?: SourceCategory;
  }) => AddSourceError | null;
  removeCustomSource: (id: string) => void;

  isSaved: (id: string) => boolean;
  toggleSaved: (article: Article) => void;

  refresh: () => void;
}

export function useNewsApp(): NewsApp {
  const [ready, setReady] = useState(false);
  const [region, setRegionState] = useState<RegionFilter>('all');
  const [languageFilter, setLanguageFilterState] = useState<LanguageFilter>('all');
  const [feedTabs, setFeedTabs] = useState<FeedTab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<string>(ALL_TAB_ID);
  const [uiLanguagePreference, setUiLanguagePreferenceState] = useState<UiLanguagePreference>('system');
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
      const [
        storedRegion,
        storedEnabled,
        storedCustom,
        storedSaved,
        storedUiLanguage,
        storedLanguageFilter,
        storedTabs,
        storedSelectedTab,
      ] = await Promise.all([
        prefs.loadRegion(),
        prefs.loadEnabledSourceIds(),
        prefs.loadCustomSources(),
        prefs.loadSavedArticles(),
        prefs.loadUiLanguage(),
        prefs.loadLanguageFilter(),
        prefs.loadFeedTabs(),
        prefs.loadSelectedTab(),
      ]);

      if (cancelled) return;
      setRegionState(storedRegion);
      setEnabledIds(storedEnabled);
      setCustomSources(storedCustom);
      setSavedArticles(storedSaved);
      setUiLanguagePreferenceState(storedUiLanguage);
      setLanguageFilterState(storedLanguageFilter);
      setFeedTabs(storedTabs);
      // A tab deleted on a previous run must not leave the feed pointing at nothing.
      setSelectedTabId(
        storedSelectedTab === ALL_TAB_ID || storedTabs.some((tab) => tab.id === storedSelectedTab)
          ? storedSelectedTab
          : ALL_TAB_ID,
      );
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
    () => filterSources(allSources, { region, language: languageFilter }),
    [allSources, region, languageFilter],
  );

  const selectedTab = useMemo(
    () => feedTabs.find((tab) => tab.id === selectedTabId) ?? null,
    [feedTabs, selectedTabId],
  );

  const activeSources = useMemo(
    () => sourcesForTab(allSources, selectedTab, { region, language: languageFilter, isEnabled: isSourceEnabled }),
    [allSources, selectedTab, region, languageFilter, isSourceEnabled],
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

  const setLanguageFilter = useCallback((next: LanguageFilter) => {
    setLanguageFilterState(next);
    void prefs.saveLanguageFilter(next);
  }, []);

  const setUiLanguagePreference = useCallback((next: UiLanguagePreference) => {
    setUiLanguagePreferenceState(next);
    void prefs.saveUiLanguage(next);
  }, []);

  const commitTabs = useCallback((tabs: FeedTab[]) => {
    setFeedTabs(tabs);
    void prefs.saveFeedTabs(tabs);
  }, []);

  const selectTab = useCallback((id: string) => {
    setSelectedTabId(id);
    void prefs.saveSelectedTab(id);
  }, []);

  const saveFeedTab = useCallback<NewsApp['saveFeedTab']>(
    ({ id, name, sourceIds }) => {
      const trimmedName = name.trim();
      if (!trimmedName) return 'name-required';
      if (sourceIds.length === 0) return 'no-sources';

      if (id) {
        commitTabs(
          feedTabs.map((tab) => (tab.id === id ? { ...tab, name: trimmedName, sourceIds } : tab)),
        );
        return null;
      }

      const created: FeedTab = { id: `tab:${Date.now()}`, name: trimmedName, sourceIds };
      commitTabs([...feedTabs, created]);
      selectTab(created.id);
      return null;
    },
    [feedTabs, commitTabs, selectTab],
  );

  const removeFeedTab = useCallback(
    (id: string) => {
      commitTabs(feedTabs.filter((tab) => tab.id !== id));
      if (selectedTabId === id) selectTab(ALL_TAB_ID);
    },
    [feedTabs, commitTabs, selectedTabId, selectTab],
  );

  const uiLanguage = useMemo(() => resolveLanguage(uiLanguagePreference), [uiLanguagePreference]);
  const t = useMemo(() => stringsFor(uiLanguage), [uiLanguage]);

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
    ({ name, feedUrl, region: sourceRegion, language, category }) => {
      const trimmedName = name.trim();
      const trimmedUrl = feedUrl.trim();

      if (!trimmedName) return 'name-required';
      if (!/^https?:\/\/.+/i.test(trimmedUrl)) return 'invalid-url';
      if (allSources.some((source) => source.feedUrl === trimmedUrl)) return 'duplicate';

      commitCustom([
        ...customSources,
        {
          id: `custom:${Date.now()}`,
          name: trimmedName,
          feedUrl: trimmedUrl,
          region: sourceRegion,
          category: category ?? 'general',
          language: language ?? (sourceRegion === 'turkey' ? 'tr' : 'en'),
          custom: true,
        },
      ]);
      return null;
    },
    [allSources, customSources, commitCustom],
  );

  const removeCustomSource = useCallback(
    (id: string) => {
      const remaining = customSources.filter((source) => source.id !== id);
      commitCustom(remaining);
      if (enabledIds) commitEnabled(enabledIds.filter((item) => item !== id));

      // Pinned tabs must not keep pointing at a feed that no longer exists.
      const stillAround = [...BUILT_IN_SOURCES, ...remaining];
      const pruned = feedTabs.map((tab) => pruneTab(tab, stillAround));
      if (pruned.some((tab, index) => tab.sourceIds.length !== feedTabs[index].sourceIds.length)) {
        commitTabs(pruned);
      }
    },
    [customSources, commitCustom, enabledIds, commitEnabled, feedTabs, commitTabs],
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
    feedTabs,
    selectedTabId,
    selectedTab,
    selectTab,
    saveFeedTab,
    removeFeedTab,
    region,
    setRegion,
    languageFilter,
    setLanguageFilter,
    uiLanguagePreference,
    uiLanguage,
    setUiLanguagePreference,
    t,
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
