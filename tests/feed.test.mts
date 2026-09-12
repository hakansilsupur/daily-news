import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatRelativeTime,
  mergeAndSort,
  searchArticles,
} from '../src/services/newsService';
import { parseFeed, stripHtml } from '../src/services/rss';
import type { NewsSource, SourceScope } from '../src/types';

const source = (id: string, scope: SourceScope): NewsSource => ({
  id,
  name: id,
  scope,
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
  assert.equal(articles[0].scope, 'tr');
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

test('search reconciles the Turkish dotted and dotless i', () => {
  const [first] = parseFeed(RSS_2, source('rss2', 'tr'));
  const articles = [{ ...first, title: 'İstanbul’da yeni metro hattı' }];

  // A caps-lock query types ASCII I, which Turkish casing alone folds to ı.
  assert.equal(searchArticles(articles, 'ISTANBUL').length, 1, 'ASCII I matches İ');
  assert.equal(searchArticles(articles, 'İSTANBUL').length, 1);
  assert.equal(searchArticles(articles, 'istanbul').length, 1);
  assert.equal(searchArticles(articles, 'ıstanbul').length, 1, 'dotless ı matches too');
  assert.equal(searchArticles(articles, 'hattı').length, 1);
  assert.equal(searchArticles(articles, 'HATTI').length, 1);
});

test('relative timestamps', () => {
  const now = Date.parse('2026-09-08T12:00:00Z');

  assert.equal(formatRelativeTime(now - 30_000, now), 'just now');
  assert.equal(formatRelativeTime(now - 5 * 60_000, now), '5m ago');
  assert.equal(formatRelativeTime(now - 3 * 3_600_000, now), '3h ago');
  assert.equal(formatRelativeTime(now - 2 * 86_400_000, now), '2d ago');
  assert.equal(formatRelativeTime(0, now), '', 'undated articles show nothing');
});

test('stripHtml removes scripts and decodes entities', () => {
  assert.equal(stripHtml('<script>bad()</script><p>ok &amp; fine</p>'), 'ok & fine');
});
