import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterSources } from '../src/data/sources';
import { pruneTab, sourcesForTab } from '../src/data/tabs';
import { resolveLanguage, STRINGS } from '../src/i18n';
import {
  formatRelativeTime,
  mergeAndSort,
  searchArticles,
} from '../src/services/newsService';
import { parseFeed, stripHtml } from '../src/services/rss';
import type { NewsSource, Region } from '../src/types';

const source = (id: string, region: Region): NewsSource => ({
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
  const articles = parseFeed(RSS_2, source('rss2', 'turkey'));

  assert.equal(articles.length, 2, 'items without a link are dropped');
  assert.equal(articles[0].title, 'Ankara\'da "önemli" gelişme');
  assert.equal(articles[0].summary, 'Detaylar burada .');
  assert.equal(articles[0].imageUrl, 'https://cdn/a.jpg', 'enclosure wins over inline img');
  assert.equal(articles[1].imageUrl, 'https://cdn/b.jpg', 'media:content is the fallback');
  assert.ok(articles[0].publishedAt > 0);
  assert.equal(articles[0].region, 'turkey');
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
  const turkish = parseFeed(RSS_2, source('rss2', 'turkey'));
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
  const articles = parseFeed(RSS_2, source('rss2', 'turkey'));

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
    { ...source('trt', 'turkey'), language: 'tr' },
    { ...source('bbc-turkce', 'turkey'), language: 'tr' },
    { ...source('bbc-world', 'world'), language: 'en' },
    { ...source('dw-turkce', 'world'), language: 'tr' },
  ];

  assert.equal(filterSources(sources, { region: 'all', language: 'all' }).length, 4);
  assert.equal(filterSources(sources, { region: 'turkey', language: 'all' }).length, 2);
  assert.equal(filterSources(sources, { region: 'all', language: 'tr' }).length, 3);
  assert.equal(filterSources(sources, { region: 'world', language: 'tr' })[0].id, 'dw-turkce');
  assert.deepEqual(
    filterSources(sources, { region: 'turkey', language: 'en' }),
    [],
    'a combination nothing matches yields an empty list rather than falling back',
  );
});

test('the All tab answers to the ad-hoc filters', () => {
  const sources: NewsSource[] = [
    { ...source('trt', 'turkey'), language: 'tr' },
    { ...source('bbc', 'world'), language: 'en' },
    { ...source('dw-tr', 'world'), language: 'tr' },
  ];
  const allOn = () => true;

  assert.equal(
    sourcesForTab(sources, null, { region: 'all', language: 'all', isEnabled: allOn }).length,
    3,
  );
  assert.equal(
    sourcesForTab(sources, null, { region: 'world', language: 'tr', isEnabled: allOn })[0].id,
    'dw-tr',
  );
  assert.deepEqual(
    sourcesForTab(sources, null, {
      region: 'all',
      language: 'all',
      isEnabled: (id) => id !== 'bbc',
    }).map((s) => s.id),
    ['trt', 'dw-tr'],
    'switched-off sources stay out of the All tab',
  );
});

test('a pinned tab is an explicit list, immune to the ad-hoc filters', () => {
  const sources: NewsSource[] = [
    { ...source('trt', 'turkey'), language: 'tr' },
    { ...source('bbc', 'world'), language: 'en' },
    { ...source('dw-tr', 'world'), language: 'tr' },
  ];
  const tab = { id: 'tab:1', name: 'Karışık', sourceIds: ['bbc', 'trt'] };

  const picked = sourcesForTab(sources, tab, {
    region: 'turkey',
    language: 'tr',
    isEnabled: () => false,
  });

  assert.deepEqual(
    picked.map((s) => s.id),
    ['bbc', 'trt'],
    'neither the region/language filters nor the source switches narrow a pinned tab',
  );
});

test('a pinned tab drops sources that no longer exist', () => {
  const sources: NewsSource[] = [{ ...source('trt', 'turkey'), language: 'tr' }];
  const tab = { id: 'tab:1', name: 'Eski', sourceIds: ['trt', 'custom:999'] };

  assert.deepEqual(
    sourcesForTab(sources, tab, { region: 'all', language: 'all', isEnabled: () => true }).map(
      (s) => s.id,
    ),
    ['trt'],
    'a deleted feed leaves no hole in the tab',
  );
  assert.deepEqual(pruneTab(tab, sources).sourceIds, ['trt']);
});

test('stripHtml removes scripts and decodes entities', () => {
  assert.equal(stripHtml('<script>bad()</script><p>ok &amp; fine</p>'), 'ok & fine');
});
