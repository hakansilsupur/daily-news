import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_COUNTRY,
  DEFAULT_TRANSLATION_LANGUAGE,
  languageForOrigin,
} from '../data/countries';
import { BUILT_IN_SOURCES, filterSources, languagesIn } from '../data/sources';
import { ALL_TAB_ID, isBuiltInTab, pruneTab, sourcesForTab, TRENDING_TAB_ID } from '../data/tabs';
import {
  resolveLanguage,
  stringsFor,
  type AddSourceError,
  type FeedTabError,
  type Strings,
} from '../i18n';
import { hydratePreviewImageCache } from './usePreviewImage';
import { hydrateTranslationCache } from './useTranslatedPreview';
import {
  fetchAllFeeds,
  mergeAndSort,
  mergeSearchResults,
  searchArticles,
} from '../services/newsService';
import { findTrendingTopics, type TrendingTopic } from '../services/trending';
import { fetchTopStories, searchNews } from '../services/topStories';
import * as prefs from '../storage/prefs';
import type {
  Article,
  CountryCode,
  FeedTab,
  LanguageFilter,
  NewsSource,
  RegionFilter,
  SourceCategory,
  SourceLanguage,
  SourceOrigin,
  TranslationLanguage,
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

  /** The user's home country — what the `local` region filter resolves to. */
  country: CountryCode;
  setCountry: (country: CountryCode) => void;

  /** Language of the sources to show — independent of the interface language. */
  languageFilter: LanguageFilter;
  setLanguageFilter: (filter: LanguageFilter) => void;
  /** Languages actually present in the source list, for the filter's options. */
  availableLanguages: SourceLanguage[];

  /** What the user chose, including `system`. */
  uiLanguagePreference: UiLanguagePreference;
  /** The language that choice resolves to right now. */
  uiLanguage: UiLanguage;
  setUiLanguagePreference: (preference: UiLanguagePreference) => void;
  /** Translated strings for `uiLanguage`. */
  t: Strings;

  /** Machine-translate headlines and summaries into `translationLanguage`. */
  translatePreviews: boolean;
  setTranslatePreviews: (enabled: boolean) => void;

  /** What previews are translated into — Türkçe by default, not tied to the UI. */
  translationLanguage: TranslationLanguage;
  setTranslationLanguage: (language: TranslationLanguage) => void;

  query: string;
  setQuery: (query: string) => void;

  articles: Article[];
  savedArticles: Article[];
  /**
   * What the search box shows: the user's own matching articles, followed by
   * anything the web search turned up that they were not already carrying.
   */
  searchResults: Article[];
  /** How many of those came from beyond the user's sources. */
  webResultCount: number;
  searchingWeb: boolean;
  /** Stories several of the user's sources are carrying; the offline fallback. */
  trendingTopics: TrendingTopic[];
  /** Ranked top stories from outside the user's sources; empty if unreachable. */
  topStories: Article[];
  topStoriesLoading: boolean;

  isSourceEnabled: (id: string) => boolean;
  toggleSource: (id: string) => void;
  setAllSourcesEnabled: (enabled: boolean) => void;

  /** Returns an error code for the caller to translate, or null on success. */
  addCustomSource: (input: {
    name: string;
    feedUrl: string;
    region: SourceOrigin;
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
  const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [translatePreviews, setTranslatePreviewsState] = useState(true);
  const [topStories, setTopStories] = useState<Article[]>([]);
  const [webResults, setWebResults] = useState<Article[]>([]);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [topStoriesLoading, setTopStoriesLoading] = useState(false);
  const [translationLanguage, setTranslationLanguageState] = useState<TranslationLanguage>(
    DEFAULT_TRANSLATION_LANGUAGE,
  );
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

    // Translations are read once here so a cached card renders without a flash
    // of the untranslated headline.
    void hydrateTranslationCache();
    void hydratePreviewImageCache();

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
        storedCountry,
        storedTranslate,
        storedTranslationLanguage,
      ] = await Promise.all([
        prefs.loadRegion(),
        prefs.loadEnabledSourceIds(),
        prefs.loadCustomSources(),
        prefs.loadSavedArticles(),
        prefs.loadUiLanguage(),
        prefs.loadLanguageFilter(),
        prefs.loadFeedTabs(),
        prefs.loadSelectedTab(),
        prefs.loadCountry(),
        prefs.loadTranslatePreviews(),
        prefs.loadTranslationLanguage(),
      ]);

      if (cancelled) return;
      setRegionState(storedRegion);
      setEnabledIds(storedEnabled);
      setCustomSources(storedCustom);
      setSavedArticles(storedSaved);
      setUiLanguagePreferenceState(storedUiLanguage);
      setLanguageFilterState(storedLanguageFilter);
      setCountryState(storedCountry);
      setTranslatePreviewsState(storedTranslate);
      setTranslationLanguageState(storedTranslationLanguage);
      setFeedTabs(storedTabs);
      // A tab deleted on a previous run must not leave the feed pointing at nothing.
      setSelectedTabId(
        isBuiltInTab(storedSelectedTab) || storedTabs.some((tab) => tab.id === storedSelectedTab)
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
    () => filterSources(allSources, { region, language: languageFilter, country }),
    [allSources, region, languageFilter, country],
  );

  const availableLanguages = useMemo(() => languagesIn(allSources), [allSources]);

  const selectedTab = useMemo(
    () => feedTabs.find((tab) => tab.id === selectedTabId) ?? null,
    [feedTabs, selectedTabId],
  );

  const activeSources = useMemo(
    () =>
      sourcesForTab(allSources, selectedTab, {
        region,
        language: languageFilter,
        country,
        isEnabled: isSourceEnabled,
      }),
    [allSources, selectedTab, region, languageFilter, country, isSourceEnabled],
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

  const setTranslatePreviews = useCallback((enabled: boolean) => {
    setTranslatePreviewsState(enabled);
    void prefs.saveTranslatePreviews(enabled);
  }, []);

  const setTranslationLanguage = useCallback((next: TranslationLanguage) => {
    setTranslationLanguageState(next);
    void prefs.saveTranslationLanguage(next);
  }, []);

  const setCountry = useCallback((next: CountryCode) => {
    setCountryState(next);
    void prefs.saveCountry(next);
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
          language: language ?? languageForOrigin(sourceRegion),
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

  // --- Topic search, beyond the user's own sources --------------------------
  useEffect(() => {
    const trimmed = query.trim();
    // Two characters is not a topic, and asking on every keystroke would be a
    // request per letter, so the search waits for a pause in typing.
    if (!ready || trimmed.length < 3) {
      setWebResults([]);
      setSearchingWeb(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearchingWeb(true);

      (async () => {
        try {
          const found = await searchNews(
            trimmed,
            country,
            region === 'world' ? 'world' : 'local',
            controller.signal,
          );
          if (!controller.signal.aborted) setWebResults(found);
        } catch {
          // Unreachable: the user still has their own matches below.
          if (!controller.signal.aborted) setWebResults([]);
        } finally {
          if (!controller.signal.aborted) setSearchingWeb(false);
        }
      })();
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ready, query, country, region]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    // On the trending tab the visible list is the top stories, not the feed.
    const own = selectedTabId === TRENDING_TAB_ID ? searchArticles(topStories, query) : articles;
    return mergeSearchResults(own, webResults);
  }, [query, selectedTabId, topStories, articles, webResults]);

  const webResultCount = useMemo(() => {
    if (!query.trim()) return 0;
    const own = selectedTabId === TRENDING_TAB_ID ? searchArticles(topStories, query) : articles;
    return Math.max(0, searchResults.length - own.length);
  }, [query, selectedTabId, topStories, articles, searchResults]);

  // --- Top stories, from outside the user's source list ---------------------
  useEffect(() => {
    if (!ready || selectedTabId !== TRENDING_TAB_ID) return;

    const controller = new AbortController();
    setTopStoriesLoading(true);

    (async () => {
      try {
        const stories = await fetchTopStories(country, region === 'world' ? 'world' : 'local', controller.signal);
        if (controller.signal.aborted) return;
        setTopStories(stories);
      } catch {
        // Unreachable or blocked: the tab falls back to grouping the user's own
        // feed, which is worth more than an error message.
        if (!controller.signal.aborted) setTopStories([]);
      } finally {
        if (!controller.signal.aborted) setTopStoriesLoading(false);
      }
    })();

    return () => controller.abort();
  }, [ready, selectedTabId, country, region, reloadToken]);

  const trendingTopics = useMemo(
    () =>
      selectedTabId === TRENDING_TAB_ID
        ? findTrendingTopics(articles, { excludeTerms: allSources.map((source) => source.name) })
        : [],
    [selectedTabId, articles, allSources],
  );

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
    country,
    setCountry,
    languageFilter,
    setLanguageFilter,
    availableLanguages,
    uiLanguagePreference,
    uiLanguage,
    setUiLanguagePreference,
    t,
    translatePreviews,
    setTranslatePreviews,
    translationLanguage,
    setTranslationLanguage,
    query,
    setQuery,
    articles,
    savedArticles,
    searchResults,
    webResultCount,
    searchingWeb,
    trendingTopics,
    topStories,
    topStoriesLoading,
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
