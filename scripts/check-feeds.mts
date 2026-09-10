/**
 * Feed health check.
 *
 *   npm run check-feeds
 *
 * Fetches every built-in source and reports how many articles it yielded, so a
 * publisher that has moved or retired its RSS endpoint is easy to spot. Run it
 * from a machine with unrestricted outbound network access.
 */
import { SOURCE_CATALOG } from '../src/data/catalog';
import { BUILT_IN_SOURCES } from '../src/data/sources';
import { parseFeed } from '../src/services/rss';
import type { NewsSource } from '../src/types';

const TIMEOUT_MS = 20_000;

async function check(source: NewsSource): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const label = `${source.region === 'turkey' ? 'TR' : 'WW'} ${source.id.padEnd(18)}`;

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

// The directory shown in the Add source sheet needs checking just as much as
// the built-in list — a dead entry there is a source the user cannot add.
const everything: NewsSource[] = [
  ...BUILT_IN_SOURCES,
  ...SOURCE_CATALOG.map((entry) => ({ ...entry, id: entry.id.replace(/^cat:/, '') })),
];

console.log('--- built-in sources ---');
const builtInLines = await Promise.all(BUILT_IN_SOURCES.map(check));
for (const line of builtInLines) console.log(line);

console.log('\n--- source directory ---');
const catalogLines = await Promise.all(
  everything.slice(BUILT_IN_SOURCES.length).map(check),
);
for (const line of catalogLines) console.log(line);

const lines = [...builtInLines, ...catalogLines];
const failures = lines.filter((line) => !line.includes(' OK    ')).length;
console.log(`\n${lines.length - failures}/${lines.length} feeds healthy.`);
process.exitCode = failures > 0 ? 1 : 0;
