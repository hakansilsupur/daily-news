import { XMLParser } from 'fast-xml-parser';

import type { ChartEpisode, CountryCode, Podcast, PodcastEpisode } from '../types';

/**
 * Popular podcasts, per country.
 *
 * Apple publishes its charts as plain JSON with no API key — the same shape the
 * App Store's own "Top Podcasts" list uses — and every podcast is, underneath,
 * an RSS feed this app can already read. So the chart gives the ranking, a
 * lookup turns each entry into its feed address, and episodes parse like any
 * other feed.
 */
const CHART_ENDPOINT = 'https://rss.applemarketingtools.com/api/v2';
const LOOKUP_ENDPOINT = 'https://itunes.apple.com/lookup';
const TIMEOUT_MS = 12000;
const DEFAULT_LIMIT = 25;

/**
 * "Recent" means released within this window. The episode chart is mostly this
 * week already; the window is what keeps a years-old episode that still gets
 * played from reading as news, and what drops a big show that has gone quiet.
 */
export const RECENT_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An unknown date is kept rather than dropped: a missing field is a gap in
 * Apple's data, not evidence the episode is old. A date slightly in the future
 * is clock skew between time zones, not a reason to hide anything.
 */
export function isRecent(publishedAt: number | undefined, now: number, days = RECENT_DAYS): boolean {
  if (!publishedAt) return true;
  return now - publishedAt <= days * DAY_MS;
}

/**
 * Apple's storefronts, which happen to match the app's country codes. The world
 * scope has no global chart to ask for, so it borrows the largest catalogue —
 * the same choice the world news desk makes.
 */
export function storefrontFor(country: CountryCode, scope: 'local' | 'world'): string {
  return scope === 'world' ? 'us' : country;
}

export function topPodcastsUrl(
  country: CountryCode,
  scope: 'local' | 'world',
  limit = DEFAULT_LIMIT,
): string {
  return `${CHART_ENDPOINT}/${storefrontFor(country, scope)}/podcasts/top/${limit}/podcasts.json`;
}

/** Chart artwork comes back at 100px; the same URL serves larger sizes. */
export function upscaleArtwork(url: string, size = 300): string {
  return url.replace(/\/\d+x\d+((bb)?\.(png|jpg|jpeg|webp))$/i, `/${size}x${size}$1`);
}

export function parseTopPodcasts(body: string): Podcast[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }

  const results = (parsed as { feed?: { results?: unknown[] } })?.feed?.results;
  if (!Array.isArray(results)) return [];

  return results
    .map((entry) => entry as Record<string, unknown>)
    .filter((entry) => typeof entry.id === 'string' && typeof entry.name === 'string')
    .map((entry) => ({
      id: entry.id as string,
      name: entry.name as string,
      artist: typeof entry.artistName === 'string' ? entry.artistName : '',
      artworkUrl:
        typeof entry.artworkUrl100 === 'string' ? upscaleArtwork(entry.artworkUrl100) : undefined,
      appleUrl: typeof entry.url === 'string' ? entry.url : undefined,
    }));
}

/** One lookup carries the whole chart, so the feed addresses cost one request. */
export function lookupUrl(ids: string[]): string {
  return `${LOOKUP_ENDPOINT}?id=${ids.join(',')}&entity=podcast`;
}

export interface ShowDetails {
  feedUrl?: string;
  artworkUrl?: string;
  /** A show's `releaseDate` in the lookup is its most recent episode's. */
  latestEpisodeAt?: number;
}

function parseDate(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** The chart says what is popular; the lookup says where to actually read it. */
export function parseLookup(body: string): Map<string, ShowDetails> {
  const found = new Map<string, ShowDetails>();

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return found;
  }

  const results = (parsed as { results?: unknown[] })?.results;
  if (!Array.isArray(results)) return found;

  for (const entry of results as Record<string, unknown>[]) {
    const id = entry.collectionId ?? entry.trackId;
    if (id === undefined) continue;

    found.set(String(id), {
      feedUrl: typeof entry.feedUrl === 'string' ? entry.feedUrl : undefined,
      artworkUrl:
        typeof entry.artworkUrl600 === 'string'
          ? entry.artworkUrl600
          : typeof entry.artworkUrl100 === 'string'
            ? upscaleArtwork(entry.artworkUrl100)
            : undefined,
      latestEpisodeAt: parseDate(entry.releaseDate),
    });
  }

  return found;
}

/**
 * Pulls the ids out of an Apple Podcasts link:
 * `…/podcast/some-show/id1200361736?i=1000657123456` names the show after `id`
 * and the episode after `i=`.
 */
export function idsFromAppleUrl(url: string): { showId?: string; episodeId?: string } {
  return {
    showId: /\/id(\d+)/.exec(url)?.[1],
    episodeId: /[?&]i=(\d+)/.exec(url)?.[1],
  };
}

/** The same chart as the shows, one level down: the episodes being played now. */
export function topEpisodesUrl(
  country: CountryCode,
  scope: 'local' | 'world',
  limit = 50,
): string {
  return `${CHART_ENDPOINT}/${storefrontFor(country, scope)}/podcasts/top/${limit}/podcast-episodes.json`;
}

export function parseTopEpisodes(body: string): ChartEpisode[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }

  const results = (parsed as { feed?: { results?: unknown[] } })?.feed?.results;
  if (!Array.isArray(results)) return [];

  return results
    .map((entry) => entry as Record<string, unknown>)
    .filter((entry) => typeof entry.name === 'string' && (entry.name as string).trim() !== '')
    .map((entry): ChartEpisode | null => {
      const appleUrl = typeof entry.url === 'string' ? entry.url : undefined;
      const fromUrl = appleUrl ? idsFromAppleUrl(appleUrl) : {};
      // The link is the more reliable source of the episode id; `id` is the
      // fallback when the link is missing or shaped differently.
      const id = fromUrl.episodeId ?? (typeof entry.id === 'string' ? entry.id : undefined);
      if (!id) return null;

      return {
        id,
        title: (entry.name as string).trim(),
        showName: typeof entry.artistName === 'string' ? entry.artistName : '',
        showId: fromUrl.showId,
        artworkUrl:
          typeof entry.artworkUrl100 === 'string' ? upscaleArtwork(entry.artworkUrl100) : undefined,
        appleUrl,
        publishedAt: parseDate(entry.releaseDate) ?? 0,
      };
    })
    .filter((episode): episode is ChartEpisode => episode !== null);
}

/**
 * Lookup by episode id returns the episode itself: its audio, length, exact
 * release time, and the show it belongs to. The storefront matters here — an
 * episode charted in one country may not resolve in another's catalogue.
 */
export function episodeLookupUrl(ids: string[], storefront: string): string {
  return `${LOOKUP_ENDPOINT}?id=${ids.join(',')}&country=${storefront}&entity=podcastEpisode`;
}

export interface EpisodeDetails {
  audioUrl?: string;
  durationSeconds?: number;
  publishedAt?: number;
  showName?: string;
  showId?: string;
  feedUrl?: string;
  artworkUrl?: string;
}

export function parseEpisodeLookup(body: string): Map<string, EpisodeDetails> {
  const found = new Map<string, EpisodeDetails>();

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return found;
  }

  const results = (parsed as { results?: unknown[] })?.results;
  if (!Array.isArray(results)) return found;

  for (const entry of results as Record<string, unknown>[]) {
    // Asking with `entity` also returns the shows themselves; only episodes count.
    if (entry.wrapperType !== 'podcastEpisode' && entry.kind !== 'podcast-episode') continue;
    if (entry.trackId === undefined) continue;

    found.set(String(entry.trackId), {
      audioUrl: typeof entry.episodeUrl === 'string' ? entry.episodeUrl : undefined,
      durationSeconds:
        typeof entry.trackTimeMillis === 'number' && entry.trackTimeMillis > 0
          ? Math.round(entry.trackTimeMillis / 1000)
          : undefined,
      publishedAt: parseDate(entry.releaseDate),
      showName: typeof entry.collectionName === 'string' ? entry.collectionName : undefined,
      showId: entry.collectionId !== undefined ? String(entry.collectionId) : undefined,
      feedUrl: typeof entry.feedUrl === 'string' ? entry.feedUrl : undefined,
      artworkUrl: typeof entry.artworkUrl600 === 'string' ? entry.artworkUrl600 : undefined,
    });
  }

  return found;
}

/** Fills each chart entry from its lookup, preferring the lookup where both speak. */
export function mergeEpisodeDetails(
  chart: ChartEpisode[],
  details: Map<string, EpisodeDetails>,
): ChartEpisode[] {
  return chart.map((episode) => {
    const extra = details.get(episode.id);
    if (!extra) return episode;
    return {
      ...episode,
      showName: extra.showName || episode.showName,
      showId: extra.showId ?? episode.showId,
      artworkUrl: extra.artworkUrl ?? episode.artworkUrl,
      // The lookup carries the exact time; the chart only a calendar day.
      publishedAt: extra.publishedAt ?? episode.publishedAt,
      audioUrl: extra.audioUrl,
      durationSeconds: extra.durationSeconds,
      feedUrl: extra.feedUrl,
    };
  });
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'DailyNews/1.0 (+https://github.com/hakansilsupur/daily-news)',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * The chart, with each show's feed address attached. A show whose feed cannot
 * be resolved is still listed — it can be opened in Apple Podcasts — but it
 * will have no episodes to show inside the app.
 */
export async function fetchTopPodcasts(
  country: CountryCode,
  scope: 'local' | 'world',
  signal?: AbortSignal,
): Promise<Podcast[]> {
  const chart = parseTopPodcasts(await fetchText(topPodcastsUrl(country, scope), signal));
  if (chart.length === 0) return [];

  try {
    const details = parseLookup(await fetchText(lookupUrl(chart.map((show) => show.id)), signal));
    return chart.map((show) => ({
      ...show,
      feedUrl: details.get(show.id)?.feedUrl,
      artworkUrl: details.get(show.id)?.artworkUrl ?? show.artworkUrl,
      latestEpisodeAt: details.get(show.id)?.latestEpisodeAt,
    }));
  } catch {
    // The ranking is still worth showing without the feed addresses.
    return chart;
  }
}

/**
 * The shows chart, narrowed to shows that have published recently. It is the
 * fallback for a storefront with no episode chart: a popular show that has not
 * released anything in weeks is not what anyone means by "hot right now".
 */
export async function fetchRecentPodcasts(
  country: CountryCode,
  scope: 'local' | 'world',
  signal?: AbortSignal,
  now = Date.now(),
): Promise<Podcast[]> {
  const shows = await fetchTopPodcasts(country, scope, signal);
  return shows.filter((show) => isRecent(show.latestEpisodeAt, now));
}

const MAX_EPISODES = 25;

/**
 * The episodes people are playing now, released within the recent window, in
 * chart order. The lookup that supplies audio and exact dates is best-effort:
 * without it an episode still lists and opens on Apple Podcasts.
 */
export async function fetchTrendingEpisodes(
  country: CountryCode,
  scope: 'local' | 'world',
  signal?: AbortSignal,
  now = Date.now(),
): Promise<ChartEpisode[]> {
  const chart = parseTopEpisodes(await fetchText(topEpisodesUrl(country, scope), signal));
  if (chart.length === 0) return [];

  let merged = chart;
  try {
    const details = parseEpisodeLookup(
      await fetchText(episodeLookupUrl(chart.map((episode) => episode.id), storefrontFor(country, scope)), signal),
    );
    merged = mergeEpisodeDetails(chart, details);
  } catch {
    // Keep the chart's own fields.
  }

  return merged.filter((episode) => isRecent(episode.publishedAt, now)).slice(0, MAX_EPISODES);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  processEntities: true,
  parseTagValue: false,
});

function text(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return text((node as Record<string, unknown>)['#text']);
  }
  return '';
}

function attr(node: unknown, name: string): string {
  if (node == null || typeof node !== 'object') return '';
  if (Array.isArray(node)) return attr(node[0], name);
  const value = (node as Record<string, unknown>)[`@_${name}`];
  return typeof value === 'string' ? value : '';
}

/** `itunes:duration` is either seconds, or mm:ss, or hh:mm:ss. */
export function parseDuration(value: string): number | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  if (/^\d+$/.test(raw)) return Number(raw);

  const parts = raw.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return undefined;

  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours} sa ${minutes} dk` : `${minutes} dk`;
}

/**
 * Episodes from a show's own feed. An item with no audio enclosure is dropped:
 * a podcast episode that cannot be played is not worth a row.
 */
export function parseEpisodes(xml: string, podcastId: string): PodcastEpisode[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const channel = ((doc.rss as Record<string, unknown>)?.channel ?? doc.channel) as
    | Record<string, unknown>
    | undefined;

  const raw = channel?.item;
  const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Record<string, unknown>[];

  return items
    .map((item): PodcastEpisode | null => {
      const audioUrl = attr(item.enclosure, 'url');
      const title = text(item.title).trim();
      if (!audioUrl || !title) return null;

      const published = Date.parse(text(item.pubDate));

      return {
        id: `${podcastId}:${text(item.guid) || audioUrl}`,
        title,
        summary: text(item.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
        audioUrl,
        publishedAt: Number.isNaN(published) ? 0 : published,
        durationSeconds: parseDuration(text(item['itunes:duration'])),
        imageUrl: attr(item['itunes:image'], 'href') || undefined,
      };
    })
    .filter((episode): episode is PodcastEpisode => episode !== null);
}

export async function fetchEpisodes(
  podcast: Podcast,
  signal?: AbortSignal,
): Promise<PodcastEpisode[]> {
  if (!podcast.feedUrl) return [];
  return parseEpisodes(await fetchText(podcast.feedUrl, signal), podcast.id);
}
