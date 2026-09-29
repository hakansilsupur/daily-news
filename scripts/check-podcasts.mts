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
  episodeLookupUrl,
  fetchRecentPodcasts,
  isRecent,
  mergeEpisodeDetails,
  parseEpisodeLookup,
  parseTopEpisodes,
  storefrontFor,
  topEpisodesUrl,
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

async function checkCountry(country: CountryCode, scope: 'local' | 'world') {
  const label = `${storefrontFor(country, scope)} (${scope})`;
  console.log(`\n== ${label} ==`);
  const now = Date.now();

  const chartUrl = topEpisodesUrl(country, scope);
  const chart = await get(chartUrl);
  console.log(`episode chart: HTTP ${chart.status} ${chartUrl}`);

  let rawResults: unknown[] = [];
  try {
    rawResults = (JSON.parse(chart.body) as { feed?: { results?: unknown[] } }).feed?.results ?? [];
  } catch {
    console.log(`  not JSON: ${chart.body.slice(0, 200)}`);
  }
  console.log(`  raw results: ${rawResults.length}`);
  if (rawResults[0]) console.log(`  raw[0]: ${sample(rawResults[0])}`);

  const episodes = parseTopEpisodes(chart.body);
  console.log(`  parsed: ${episodes.length}, dated: ${episodes.filter((e) => e.publishedAt).length}`);

  if (episodes.length > 0) {
    const lookupAddress = episodeLookupUrl(
      episodes.map((episode) => episode.id),
      storefrontFor(country, scope),
    );
    const lookup = await get(lookupAddress);
    let rawLookup: unknown[] = [];
    try {
      rawLookup = (JSON.parse(lookup.body) as { results?: unknown[] }).results ?? [];
    } catch {
      console.log(`  lookup not JSON: ${lookup.body.slice(0, 200)}`);
    }
    console.log(`episode lookup: HTTP ${lookup.status}, raw results: ${rawLookup.length}`);
    if (rawLookup[0]) console.log(`  raw[0]: ${sample(rawLookup[0])}`);

    const merged = mergeEpisodeDetails(episodes, parseEpisodeLookup(lookup.body));
    const recent = merged.filter((episode) => isRecent(episode.publishedAt, now));
    console.log(
      `  resolved: ${merged.filter((e) => e.audioUrl).length} with audio, ` +
        `${merged.filter((e) => e.feedUrl).length} with a show feed; ` +
        `${recent.length} of ${merged.length} released in the recent window`,
    );
    for (const episode of recent.slice(0, 3)) {
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
