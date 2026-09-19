import { useCallback, useEffect, useState } from 'react';

import { fetchEpisodes, fetchTopPodcasts } from '../services/podcasts';
import type { CountryCode, Podcast, PodcastEpisode, RegionFilter } from '../types';

export interface PodcastsState {
  podcasts: Podcast[];
  loading: boolean;
  failed: boolean;
  refresh: () => void;
  /** Episodes of the show currently opened, keyed by podcast id. */
  episodes: PodcastEpisode[];
  episodesLoading: boolean;
  openPodcast: (podcast: Podcast) => void;
  closePodcast: () => void;
  selected: Podcast | null;
}

/**
 * The popular-podcast chart for the chosen country, and the episodes of
 * whichever show is open. Both are fetched on demand: the chart when the tab is
 * first shown, a show's episodes when it is opened, so a tab nobody visits
 * costs nothing.
 */
export function usePodcasts(
  country: CountryCode,
  region: RegionFilter,
  active: boolean,
): PodcastsState {
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
      try {
        const chart = await fetchTopPodcasts(country, scope, controller.signal);
        if (controller.signal.aborted) return;
        setPodcasts(chart);
        setFailed(chart.length === 0);
      } catch {
        if (!controller.signal.aborted) {
          setPodcasts([]);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

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
