/**
 * Podcast chart health check.
 *
 *   npm run check-podcasts
 *
 * Asks Apple's live charts and lookup what the Podcasts tab asks them, prints
 * the raw shape of what came back beside what the app made of it, and says how
 * many entries survive the recency filter. Parsers are unit-tested against
 * fixtures; this is what says the fixtures still match the real thing. Run it
 * from a machine with unrestricted outbound network access — CI runs it on
 * every build.
 */
import {
  fetchRecentPodcasts,
  isRecentChartEpisode,
  lookupChartEpisodes,
  mergeEpisodeDetails,
  parseTopEpisodes,
  showPages,
  storefrontFor,
  topEpisodesUrl,
  type EpisodeDetails,
} from '../src/services/podcasts';
import type { CountryCode } from '../src/types';

const TIMEOUT_MS = 20_000;

async function get(url: string): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'DailyNews/1.0' },
    });
    return { status: response.status, body: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

/** One raw entry, long values clipped, so the real field names are visible. */
function sample(entry: unknown): string {
  return JSON.stringify(entry, (_key, value) =>
    typeof value === 'string' && value.length > 90 ? `${value.slice(0, 90)}…` : value,
  );
}

/**
 * The recency inference assumes the lookup lists each show newest-first. This
 * says whether it does, rather than trusting it.
 */
function newestFirst(details: Map<string, EpisodeDetails>): string {
  const byShow = new Map<string, number[]>();
  for (const episode of details.values()) {
    if (!episode.showId || !episode.publishedAt) continue;
    byShow.set(episode.showId, [...(byShow.get(episode.showId) ?? []), episode.publishedAt]);
  }
  const ordered = [...byShow.values()].filter((dates) =>
    dates.every((date, index) => index === 0 || dates[index - 1] >= date),
  ).length;
  return `${ordered}/${byShow.size} shows newest-first`;
}

async function checkCountry(country: CountryCode, scope: 'local' | 'world') {
  const storefront = storefrontFor(country, scope);
  console.log(`\n== ${storefront} (${scope}) ==`);
  const now = Date.now();

  const chartUrl = topEpisodesUrl(country, scope);
  let chartBody = '';
  try {
    const chart = await get(chartUrl);
    chartBody = chart.body;
    console.log(`episode chart: HTTP ${chart.status} ${chartUrl}`);
  } catch (error) {
    console.log(`episode chart: FAIL ${(error as Error).message}`);
  }

  const episodes = parseTopEpisodes(chartBody);
  const withShow = episodes.filter((episode) => episode.showId).length;
  console.log(`  parsed: ${episodes.length}, with a show id: ${withShow}`);
  if (episodes[0]) console.log(`  parsed[0]: ${sample(episodes[0])}`);

  if (episodes.length > 0) {
    const started = Date.now();
    const details = await lookupChartEpisodes(episodes, storefront);
    const pages = showPages(details);
    console.log(
      `show lookups: ${details.size} episodes across ${pages.size} shows in ${Date.now() - started}ms; ${newestFirst(details)}`,
    );
    const first = details.values().next().value;
    if (first) console.log(`  details[0]: ${sample(first)}`);

    const merged = mergeEpisodeDetails(episodes, details);
    const kept = merged.filter((episode) => isRecentChartEpisode(episode, pages, now));
    const dated = merged.filter((episode) => episode.publishedAt).length;
    console.log(
      `  matched: ${dated} dated, ${merged.filter((e) => e.audioUrl).length} with audio, ` +
        `${merged.filter((e) => e.feedUrl).length} with a show feed`,
    );
    console.log(
      `  kept ${kept.length} of ${merged.length}; ${kept.filter((e) => !e.publishedAt).length} of those undated`,
    );
    for (const episode of kept.slice(0, 3)) {
      const when = episode.publishedAt ? new Date(episode.publishedAt).toISOString().slice(0, 10) : '????-??-??';
      console.log(`    ${when}  ${episode.showName} — ${episode.title.slice(0, 60)}`);
    }
  }

  try {
    const shows = await fetchRecentPodcasts(country, scope);
    console.log(`fallback, recent shows: ${shows.length}`);
  } catch (error) {
    console.log(`fallback, recent shows: FAIL ${(error as Error).message}`);
  }
}

for (const [country, scope] of [
  ['tr', 'local'],
  ['tr', 'world'],
  ['jp', 'local'],
] as const) {
  try {
    await checkCountry(country, scope);
  } catch (error) {
    console.log(`  FAIL ${(error as Error).message}`);
  }
}
