import { useCallback, useEffect, useState } from 'react';

import { fetchEpisodes, fetchRecentPodcasts, fetchTrendingEpisodes } from '../services/podcasts';
import type { ChartEpisode, CountryCode, Podcast, PodcastEpisode, RegionFilter } from '../types';

export interface PodcastsState {
  /** The episodes being played now, released recently. The tab's main list. */
  trending: ChartEpisode[];
  /**
   * Popular shows with a recent episode — only filled when there is no episode
   * chart to show, as a fallback rather than a second list.
   */
  podcasts: Podcast[];
  loading: boolean;
  /** Nothing could be fetched at all, as opposed to nothing recent enough. */
  failed: boolean;
  refresh: () => void;
  /** Episodes of the show currently opened. */
  episodes: PodcastEpisode[];
  episodesLoading: boolean;
  openPodcast: (podcast: Podcast) => void;
  closePodcast: () => void;
  selected: Podcast | null;
}

/**
 * What is hot in podcasts for the chosen country, and the episodes of whichever
 * show is open. Both are fetched on demand: the chart when the tab is first
 * shown, a show's episodes when it is opened, so a tab nobody visits costs
 * nothing.
 */
export function usePodcasts(
  country: CountryCode,
  region: RegionFilter,
  active: boolean,
): PodcastsState {
  const [trending, setTrending] = useState<ChartEpisode[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [selected, setSelected] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  const scope = region === 'world' ? 'world' : 'local';

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    setLoading(true);
    setFailed(false);

    (async () => {
      let reached = false;

      try {
        const hot = await fetchTrendingEpisodes(country, scope, controller.signal);
        if (controller.signal.aborted) return;
        reached = true;

        if (hot.length > 0) {
          setTrending(hot);
          setPodcasts([]);
          return;
        }
      } catch {
        // Not every storefront has an episode chart; the shows chart may.
      }

      try {
        const shows = await fetchRecentPodcasts(country, scope, controller.signal);
        if (controller.signal.aborted) return;
        setTrending([]);
        setPodcasts(shows);
      } catch {
        if (controller.signal.aborted) return;
        setTrending([]);
        setPodcasts([]);
        setFailed(!reached);
      }
    })().finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [active, country, scope, reloadToken]);

  useEffect(() => {
    if (!selected) {
      setEpisodes([]);
      return;
    }

    const controller = new AbortController();
    setEpisodesLoading(true);

    (async () => {
      try {
        const found = await fetchEpisodes(selected, controller.signal);
        if (!controller.signal.aborted) setEpisodes(found);
      } catch {
        if (!controller.signal.aborted) setEpisodes([]);
      } finally {
        if (!controller.signal.aborted) setEpisodesLoading(false);
      }
    })();

    return () => controller.abort();
  }, [selected]);

  return {
    trending,
    podcasts,
    loading,
    failed,
    refresh: useCallback(() => setReloadToken((token) => token + 1), []),
    episodes,
    episodesLoading,
    openPodcast: useCallback((podcast: Podcast) => setSelected(podcast), []),
    closePodcast: useCallback(() => setSelected(null), []),
    selected,
  };
}
