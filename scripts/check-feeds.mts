/**
 * Feed health check.
 *
 *   npm run check-feeds
 *
 * Fetches every built-in source and reports how many articles it yielded, so a
 * publisher that has moved or retired its RSS endpoint is easy to spot. Run it
 * from a machine with unrestricted outbound network access.
 */
import { BUILT_IN_SOURCES } from '../src/data/sources';
import { parseFeed } from '../src/services/rss';
import type { NewsSource } from '../src/types';

const TIMEOUT_MS = 20_000;

async function check(source: NewsSource): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const label = `${(source.scope === 'world' ? 'ww' : source.scope).toUpperCase()} ${source.id.padEnd(18)}`;

  try {
    const response = await fetch(source.feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'User-Agent': 'DailyNews/1.0',
      },
    });

    if (!response.ok) return `${label} FAIL  HTTP ${response.status}`;

    const articles = parseFeed(await response.text(), source);
    if (articles.length === 0) return `${label} EMPTY parsed 0 articles`;

    const withImages = articles.filter((article) => article.imageUrl).length;
    const dated = articles.filter((article) => article.publishedAt).length;
    return `${label} OK    ${String(articles.length).padStart(3)} articles (${dated} dated, ${withImages} with images) — ${articles[0].title.slice(0, 48)}`;
  } catch (error) {
    return `${label} FAIL  ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    clearTimeout(timer);
  }
}

const lines = await Promise.all(BUILT_IN_SOURCES.map(check));
for (const line of lines) console.log(line);

const failures = lines.filter((line) => !line.includes(' OK    ')).length;
console.log(`\n${BUILT_IN_SOURCES.length - failures}/${BUILT_IN_SOURCES.length} feeds healthy.`);
process.exitCode = failures > 0 ? 1 : 0;
