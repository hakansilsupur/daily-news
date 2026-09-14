import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAlreadyAdded, searchCatalog, type CatalogEntry } from '../src/data/catalog';
import { COUNTRIES, DEFAULT_COUNTRY, languageForOrigin } from '../src/data/countries';
import { filterSources, languagesIn } from '../src/data/sources';
import { pruneTab, sourcesForTab } from '../src/data/tabs';
import {
  candidateUrls,
  COMMON_FEED_PATHS,
  extractFeedLinks,
  looksLikeUrl,
  normalizeSiteUrl,
} from '../src/services/discovery';
import { resolveLanguage, STRINGS } from '../src/i18n';
import {
  formatRelativeTime,
  mergeAndSort,
  searchArticles,
} from '../src/services/newsService';
import { parseFeed, parseFeedTitle, stripHtml } from '../src/services/rss';
import {
  buildFallbackUrl,
  buildTranslateUrl,
  cacheKey,
  needsTranslation,
  parseFallbackResponse,
  parseTranslateResponse,
} from '../src/services/translate';
import type { NewsSource, SourceOrigin } from '../src/types';

const source = (id: string, region: SourceOrigin): NewsSource => ({
  id,
  name: id,
  region,
  category: 'general',
  feedUrl: `https://example.test/${id}`,
  language: 'tr',
});

const RSS_2 = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test</title>
    <item>
      <title><![CDATA[Ankara'da &quot;önemli&quot; gelişme]]></title>
      <link>https://example.com/a?utm=1</link>
      <description><![CDATA[<p>Detaylar <b>burada</b>.</p><img src="https://img/a.jpg"/>]]></description>
      <pubDate>Tue, 08 Sep 2026 09:00:00 +0300</pubDate>
      <enclosure url="https://cdn/a.jpg" type="image/jpeg"/>
    </item>
    <item>
      <title>Second story</title>
      <link>https://example.com/b</link>
      <media:content url="https://cdn/b.jpg"/>
      <pubDate>Mon, 07 Sep 2026 09:00:00 +0300</pubDate>
    </item>
    <item>
      <title>No link at all</title>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom entry</title>
    <link rel="alternate" href="https://example.org/atom-1"/>
    <link rel="edit" href="https://example.org/edit"/>
    <summary>Atom summary text</summary>
    <updated>2026-09-08T06:00:00Z</updated>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <item>
    <title>RDF item</title>
    <link>https://dw.example/1</link>
    <description>Body</description>
    <dc:date>2026-09-07T10:00:00Z</dc:date>
  </item>
</rdf:RDF>`;

test('parses RSS 2.0, decoding entities and stripping markup', () => {
  const articles = parseFeed(RSS_2, source('rss2', 'tr'));

  assert.equal(articles.length, 2, 'items without a link are dropped');
  assert.equal(articles[0].title, 'Ankara\'da "önemli" gelişme');
  assert.equal(articles[0].summary, 'Detaylar burada .');
  assert.equal(articles[0].imageUrl, 'https://cdn/a.jpg', 'enclosure wins over inline img');
  assert.equal(articles[1].imageUrl, 'https://cdn/b.jpg', 'media:content is the fallback');
  assert.ok(articles[0].publishedAt > 0);
  assert.equal(articles[0].region, 'tr');
});

test('parses Atom and prefers the alternate link', () => {
  const articles = parseFeed(ATOM, source('atom', 'world'));

  assert.equal(articles.length, 1);
  assert.equal(articles[0].link, 'https://example.org/atom-1');
  assert.equal(articles[0].summary, 'Atom summary text');
  assert.ok(articles[0].publishedAt > 0);
});

test('parses RSS 1.0 (RDF) including dc:date', () => {
  const articles = parseFeed(RDF, source('rdf', 'world'));

  assert.equal(articles.length, 1);
  assert.equal(articles[0].link, 'https://dw.example/1');
  assert.ok(articles[0].publishedAt > 0);
});

test('non-feed input yields no articles instead of throwing', () => {
  assert.deepEqual(parseFeed('<html><body>not a feed</body></html>', source('x', 'world')), []);
  assert.deepEqual(parseFeed('', source('x', 'world')), []);
});

test('merging dedupes by link and sorts newest first', () => {
  const turkish = parseFeed(RSS_2, source('rss2', 'tr'));
  const world = parseFeed(ATOM, source('atom', 'world'));

  const merged = mergeAndSort([
    { sourceId: 'rss2', articles: turkish },
    { sourceId: 'atom', articles: world },
    { sourceId: 'mirror', articles: [{ ...turkish[0], id: 'mirror:1', sourceId: 'mirror' }] },
    { sourceId: 'broken', articles: [], error: 'HTTP 500' },
  ]);

  assert.equal(merged.length, 3, 'the same link from two feeds appears once');
  for (let i = 1; i < merged.length; i += 1) {
    assert.ok(merged[i - 1].publishedAt >= merged[i].publishedAt);
  }
});

test('search is case-insensitive for Turkish text', () => {
  const articles = parseFeed(RSS_2, source('rss2', 'tr'));

  assert.equal(searchArticles(articles, 'ANKARA').length, 1);
  assert.equal(searchArticles(articles, 'gelişme').length, 1);
  assert.equal(searchArticles(articles, '   ').length, articles.length, 'blank query is a no-op');
  assert.equal(searchArticles(articles, 'zzz').length, 0);
});

test('relative timestamps', () => {
  const now = Date.parse('2026-09-08T12:00:00Z');

  assert.equal(formatRelativeTime(now - 30_000, now), 'just now');
  assert.equal(formatRelativeTime(now - 5 * 60_000, now), '5m ago');
  assert.equal(formatRelativeTime(now - 3 * 3_600_000, now), '3h ago');
  assert.equal(formatRelativeTime(now - 2 * 86_400_000, now), '2d ago');
  assert.equal(formatRelativeTime(0, now), '', 'undated articles show nothing');
});

test('relative timestamps follow the interface language', () => {
  const now = Date.parse('2026-09-08T12:00:00Z');

  assert.equal(formatRelativeTime(now - 30_000, now, 'tr'), 'az önce');
  assert.equal(formatRelativeTime(now - 5 * 60_000, now, 'tr'), '5 dk önce');
  assert.equal(formatRelativeTime(now - 3 * 3_600_000, now, 'tr'), '3 saat önce');
  assert.equal(formatRelativeTime(now - 2 * 86_400_000, now, 'tr'), '2 gün önce');
  assert.equal(formatRelativeTime(0, now, 'tr'), '');
});

test('every string is translated into both languages', () => {
  const keys = Object.keys(STRINGS.en) as (keyof typeof STRINGS.en)[];

  for (const key of keys) {
    const english = STRINGS.en[key];
    const turkish = STRINGS.tr[key];

    assert.equal(typeof turkish, typeof english, `${key} has a different shape in Turkish`);
    if (typeof english === 'string') {
      assert.ok(turkish, `${key} is empty in Turkish`);
    } else if (typeof english === 'object') {
      assert.deepEqual(
        Object.keys(turkish as object).sort(),
        Object.keys(english as object).sort(),
        `${key} is missing options in Turkish`,
      );
    }
  }
});

test('resolveLanguage honours an explicit choice over the device locale', () => {
  assert.equal(resolveLanguage('tr'), 'tr');
  assert.equal(resolveLanguage('en'), 'en');
  assert.ok(['tr', 'en'].includes(resolveLanguage('system')), 'system resolves to a supported language');
});

test('filterSources narrows by region and language together', () => {
  const sources: NewsSource[] = [
    { ...source('trt', 'tr'), language: 'tr' },
    { ...source('bbc-turkce', 'tr'), language: 'tr' },
    { ...source('bbc-world', 'world'), language: 'en' },
    { ...source('dw-turkce', 'world'), language: 'tr' },
  ];

  const tr = { country: 'tr' } as const;

  assert.equal(filterSources(sources, { region: 'all', language: 'all', ...tr }).length, 4);
  assert.equal(filterSources(sources, { region: 'local', language: 'all', ...tr }).length, 2);
  assert.equal(filterSources(sources, { region: 'all', language: 'tr', ...tr }).length, 3);
  assert.equal(filterSources(sources, { region: 'world', language: 'tr', ...tr })[0].id, 'dw-turkce');
  assert.deepEqual(
    filterSources(sources, { region: 'local', language: 'en', ...tr }),
    [],
    'a combination nothing matches yields an empty list rather than falling back',
  );
});

test('the All tab answers to the ad-hoc filters', () => {
  const sources: NewsSource[] = [
    { ...source('trt', 'tr'), language: 'tr' },
    { ...source('bbc', 'world'), language: 'en' },
    { ...source('dw-tr', 'world'), language: 'tr' },
  ];
  const allOn = () => true;

  assert.equal(
    sourcesForTab(sources, null, { region: 'all', language: 'all', country: 'tr', isEnabled: allOn }).length,
    3,
  );
  assert.equal(
    sourcesForTab(sources, null, { region: 'world', language: 'tr', country: 'tr', isEnabled: allOn })[0].id,
    'dw-tr',
  );
  assert.deepEqual(
    sourcesForTab(sources, null, {
      region: 'all',
      language: 'all',
      country: 'tr',
      isEnabled: (id) => id !== 'bbc',
    }).map((s) => s.id),
    ['trt', 'dw-tr'],
    'switched-off sources stay out of the All tab',
  );
});

test('a pinned tab is an explicit list, immune to the ad-hoc filters', () => {
  const sources: NewsSource[] = [
    { ...source('trt', 'tr'), language: 'tr' },
    { ...source('bbc', 'world'), language: 'en' },
    { ...source('dw-tr', 'world'), language: 'tr' },
  ];
  const tab = { id: 'tab:1', name: 'Karışık', sourceIds: ['bbc', 'trt'] };

  const picked = sourcesForTab(sources, tab, {
    region: 'local',
    language: 'tr',
    country: 'tr',
    isEnabled: () => false,
  });

  assert.deepEqual(
    picked.map((s) => s.id),
    ['bbc', 'trt'],
    'neither the region/language filters nor the source switches narrow a pinned tab',
  );
});

test('a pinned tab drops sources that no longer exist', () => {
  const sources: NewsSource[] = [{ ...source('trt', 'tr'), language: 'tr' }];
  const tab = { id: 'tab:1', name: 'Eski', sourceIds: ['trt', 'custom:999'] };

  assert.deepEqual(
    sourcesForTab(sources, tab, { region: 'all', language: 'all', country: 'tr', isEnabled: () => true }).map(
      (s) => s.id,
    ),
    ['trt'],
    'a deleted feed leaves no hole in the tab',
  );
  assert.deepEqual(pruneTab(tab, sources).sourceIds, ['trt']);
});

test('directory search ranks name matches above keyword matches', () => {
  const entries: CatalogEntry[] = [
    { id: 'a', name: 'BBC Sport', region: 'world', category: 'sports', language: 'en', feedUrl: 'https://a.test/rss' },
    { id: 'b', name: 'Sky Sports', region: 'world', category: 'sports', language: 'en', feedUrl: 'https://b.test/rss', keywords: ['bbc rival'] },
    { id: 'c', name: 'NTV Spor', region: 'tr', category: 'sports', language: 'tr', feedUrl: 'https://c.test/rss', keywords: ['spor'] },
  ];

  assert.deepEqual(searchCatalog(entries, 'bbc').map((e) => e.id), ['a', 'b']);
  assert.deepEqual(searchCatalog(entries, 'sports', { region: 'world' }).map((e) => e.id), ['b', 'a']);
  assert.deepEqual(searchCatalog(entries, 'SPOR', { region: 'local', country: 'tr' }).map((e) => e.id), ['c']);
  assert.equal(searchCatalog(entries, '', { region: 'all' }).length, 3, 'a blank query lists everything');
  assert.equal(searchCatalog(entries, 'zzz').length, 0);
});

test('the local filter follows the chosen country', () => {
  const sources: NewsSource[] = [
    { ...source('trt', 'tr'), language: 'tr' },
    { ...source('tagesschau', 'de'), language: 'de' },
    { ...source('bbc-world', 'world'), language: 'en' },
  ];

  assert.deepEqual(
    filterSources(sources, { region: 'local', language: 'all', country: 'tr' }).map((s) => s.id),
    ['trt'],
  );
  assert.deepEqual(
    filterSources(sources, { region: 'local', language: 'all', country: 'de' }).map((s) => s.id),
    ['tagesschau'],
    'the same stored filter means Germany once Germany is home',
  );
  assert.deepEqual(
    filterSources(sources, { region: 'world', language: 'all', country: 'de' }).map((s) => s.id),
    ['bbc-world'],
    'worldwide is the same bucket whatever the country',
  );
  assert.equal(
    filterSources(sources, { region: 'local', language: 'all', country: 'nl' }).length,
    0,
    'a country with no sources yet is empty, not silently widened',
  );
});

test('the language filter offers only languages actually present', () => {
  const sources: NewsSource[] = [
    { ...source('trt', 'tr'), language: 'tr' },
    { ...source('tagesschau', 'de'), language: 'de' },
    { ...source('bbc', 'world'), language: 'en' },
    { ...source('ntv', 'tr'), language: 'tr' },
  ];

  assert.deepEqual(languagesIn(sources), ['de', 'en', 'tr']);
  assert.deepEqual(languagesIn([]), []);
});

test('every country has a name in both languages and a flag', () => {
  for (const { code, flag } of COUNTRIES) {
    assert.ok(STRINGS.en.countryName[code], `${code} has no English name`);
    assert.ok(STRINGS.tr.countryName[code], `${code} has no Turkish name`);
    assert.ok(flag.length > 0, `${code} has no flag`);
    assert.ok(STRINGS.tr.languageName[languageForOrigin(code)], `${code}'s language is unnamed`);
  }

  assert.equal(DEFAULT_COUNTRY, 'tr', 'Türkiye stays the default');
  assert.equal(COUNTRIES[0].code, 'tr', 'and leads the picker');
});

test('a source already in the list is flagged as added', () => {
  const entry: CatalogEntry = {
    id: 'a',
    name: 'BBC Sport',
    region: 'world',
    category: 'sports',
    language: 'en',
    feedUrl: 'https://a.test/rss',
  };
  const mine: NewsSource[] = [{ ...source('mine', 'world'), feedUrl: 'https://a.test/rss' }];

  assert.equal(isAlreadyAdded(entry, mine), true);
  assert.equal(isAlreadyAdded(entry, []), false);
});

test('site addresses are told apart from search terms', () => {
  assert.equal(looksLikeUrl('bbc.co.uk'), true);
  assert.equal(looksLikeUrl('https://www.nature.com/nature.rss'), true);
  assert.equal(looksLikeUrl('bbc sport'), false, 'a phrase is a search, not an address');
  assert.equal(looksLikeUrl('Milliyet'), false, 'a bare word has no dot');
  assert.equal(looksLikeUrl(''), false);

  assert.equal(normalizeSiteUrl('bbc.co.uk'), 'https://bbc.co.uk/', 'a bare domain gets a scheme');
  assert.equal(normalizeSiteUrl('http://x.test/feed'), 'http://x.test/feed');
  assert.equal(normalizeSiteUrl('localhost'), null, 'no dot, no host');
});

test('feed links are read out of a page however the attributes are ordered', () => {
  const html = `
    <html><head>
      <link rel="alternate" type="application/rss+xml" title="Main" href="/rss.xml">
      <link type="application/atom+xml" rel="alternate" href="https://cdn.test/atom">
      <link rel="alternate" type="text/html" href="/not-a-feed">
      <link rel="stylesheet" href="/style.css">
      <link rel="alternate" type="application/rss+xml" href="/rss.xml">
    </head></html>`;

  const links = extractFeedLinks(html, 'https://site.test/news');

  assert.deepEqual(links, [
    { url: 'https://site.test/rss.xml', title: 'Main' },
    { url: 'https://cdn.test/atom', title: undefined },
  ], 'relative hrefs resolve, non-feeds are skipped, duplicates collapse');
});

test('common feed paths are probed against the site root', () => {
  const urls = candidateUrls('https://site.test/section/');

  assert.ok(urls.includes('https://site.test/rss'));
  assert.ok(urls.includes('https://site.test/feed.xml'));
  assert.equal(urls.length, COMMON_FEED_PATHS.length);
});

test('parseFeedTitle names a discovered feed', () => {
  assert.equal(parseFeedTitle(RSS_2), 'Test');
  assert.equal(parseFeedTitle('<html><body>not a feed</body></html>'), '');
});

test('translation responses are read back into one string', () => {
  const body = JSON.stringify([
    [
      ['Rusya ve Ukrayna ', 'Russia and Ukraine ', null, null, 10],
      ['yeni görüşmelerde anlaştı.', 'agree new talks.', null, null, 3],
    ],
    null,
    'en',
  ]);

  assert.equal(parseTranslateResponse(body), 'Rusya ve Ukrayna yeni görüşmelerde anlaştı.');
});

test('a broken translation response yields nothing rather than garbage', () => {
  assert.equal(parseTranslateResponse('<html>429 Too Many Requests</html>'), null);
  assert.equal(parseTranslateResponse('{}'), null);
  assert.equal(parseTranslateResponse('[null,null,"en"]'), null);
  assert.equal(parseTranslateResponse(JSON.stringify([[['   ', ' ', null]]])), null);
});

test('only previews in another language are translated', () => {
  assert.equal(needsTranslation('en', 'tr', 'Hello'), true);
  assert.equal(needsTranslation('tr', 'tr', 'Merhaba'), false, 'no round trip for Turkish in Turkish');
  assert.equal(needsTranslation('en', 'tr', '   '), false, 'empty text needs nothing');
  assert.equal(needsTranslation(undefined, 'tr', 'Hello'), true, 'unknown language is worth a try');
});

test('the translate URL carries the target language and is length-capped', () => {
  const url = new URL(buildTranslateUrl('Hello world', 'tr'));

  assert.equal(url.searchParams.get('tl'), 'tr');
  assert.equal(url.searchParams.get('sl'), 'auto');
  assert.equal(url.searchParams.get('q'), 'Hello world');

  const long = new URL(buildTranslateUrl('x'.repeat(2000), 'en'));
  assert.equal(long.searchParams.get('q')?.length, 900);
});

test('the fallback engine is read carefully, quota notices included', () => {
  const ok = JSON.stringify({
    responseStatus: 200,
    responseData: { translatedText: 'Rusya ve Ukrayna anlaştı' },
  });
  assert.equal(parseFallbackResponse(ok), 'Rusya ve Ukrayna anlaştı');

  const quota = JSON.stringify({
    responseStatus: 200,
    responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS' },
  });
  assert.equal(parseFallbackResponse(quota), null, 'a quota notice is not a translation');

  assert.equal(parseFallbackResponse(JSON.stringify({ responseStatus: 403 })), null);
  assert.equal(parseFallbackResponse('not json'), null);

  const url = new URL(buildFallbackUrl('Hello', 'tr', 'en'));
  assert.equal(url.searchParams.get('langpair'), 'en|tr');
});

test('translation cache keys are per language', () => {
  assert.equal(cacheKey('bbc:1', 'tr'), 'tr:bbc:1');
  assert.notEqual(cacheKey('bbc:1', 'tr'), cacheKey('bbc:1', 'en'));
});

test('stripHtml removes scripts and decodes entities', () => {
  assert.equal(stripHtml('<script>bad()</script><p>ok &amp; fine</p>'), 'ok & fine');
});
