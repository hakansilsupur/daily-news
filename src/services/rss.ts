import { XMLParser } from 'fast-xml-parser';

import type { Article, NewsSource } from '../types';

const REQUEST_TIMEOUT_MS = 12000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  // Feeds frequently wrap text in CDATA; keep it as a plain string.
  processEntities: true,
  parseTagValue: false,
});

/** fast-xml-parser gives back a scalar, an object, an array, or nothing. */
type XmlNode = unknown;

function asArray(node: XmlNode): Record<string, unknown>[] {
  if (node == null) return [];
  return (Array.isArray(node) ? node : [node]).filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
  );
}

/**
 * Reads a node's text whether the parser produced a bare string or an object
 * with attributes (in which case the text lives under `#text`).
 */
function text(node: XmlNode): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if ('#text' in record) return text(record['#text']);
  }
  return '';
}

function attr(node: XmlNode, name: string): string {
  if (node == null || typeof node !== 'object') return '';
  if (Array.isArray(node)) return attr(node[0], name);
  const value = (node as Record<string, unknown>)[`@_${name}`];
  return typeof value === 'string' ? value : '';
}

export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(value: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function firstImageInHtml(html: string): string | undefined {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match?.[1];
}

function extractImage(entry: Record<string, unknown>, description: string): string | undefined {
  // RSS enclosures, Media RSS, then whatever is embedded in the description.
  const enclosure = entry.enclosure;
  const enclosureUrl = attr(enclosure, 'url');
  if (enclosureUrl && attr(enclosure, 'type').startsWith('image')) return enclosureUrl;
  if (enclosureUrl && /\.(jpe?g|png|webp|gif)/i.test(enclosureUrl)) return enclosureUrl;

  for (const key of ['media:content', 'media:thumbnail', 'image']) {
    const candidate = entry[key];
    const url = attr(candidate, 'url') || text((candidate as Record<string, unknown>)?.url);
    if (url) return url;
  }

  const contentEncoded = text(entry['content:encoded']);
  return firstImageInHtml(contentEncoded) ?? firstImageInHtml(description);
}

function extractLink(entry: Record<string, unknown>): string {
  const link = entry.link;
  const direct = text(link);
  if (direct) return direct;

  // Atom: <link rel="alternate" href="..."/>, possibly several of them.
  const links = Array.isArray(link) ? link : [link];
  for (const candidate of links) {
    const rel = attr(candidate, 'rel');
    const href = attr(candidate, 'href');
    if (href && (rel === '' || rel === 'alternate')) return href;
  }
  return text(entry.guid) || text(entry.id);
}

function toArticle(entry: Record<string, unknown>, source: NewsSource): Article | null {
  const title = stripHtml(text(entry.title));
  const link = extractLink(entry).trim();
  if (!title || !link) return null;

  const rawSummary =
    text(entry.description) || text(entry.summary) || text(entry['content:encoded']) || text(entry.content);

  const published =
    parseDate(text(entry.pubDate)) ||
    parseDate(text(entry.published)) ||
    parseDate(text(entry.updated)) ||
    parseDate(text(entry['dc:date']));

  return {
    id: `${source.id}:${link}`,
    title,
    summary: stripHtml(rawSummary).slice(0, 400),
    link,
    imageUrl: extractImage(entry, rawSummary),
    publishedAt: published,
    sourceId: source.id,
    sourceName: source.name,
    region: source.region,
    language: source.language,
  };
}

/** Handles RSS 2.0, RSS 1.0 (RDF) and Atom in one pass. */
export function parseFeed(xml: string, source: NewsSource): Article[] {
  const doc = parser.parse(xml) as Record<string, unknown>;

  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = (rss?.channel ?? doc.channel) as Record<string, unknown> | undefined;
  const rdf = (doc['rdf:RDF'] ?? doc.RDF) as Record<string, unknown> | undefined;
  const feed = doc.feed as Record<string, unknown> | undefined;

  const entries = [
    ...asArray(channel?.item),
    ...asArray(rdf?.item),
    ...asArray(feed?.entry),
  ];

  return entries
    .map((entry) => toArticle(entry, source))
    .filter((article): article is Article => article !== null);
}

/** The feed's own title, used to name a source discovered from a site address. */
export function parseFeedTitle(xml: string): string {
  const doc = parser.parse(xml) as Record<string, unknown>;

  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = (rss?.channel ?? doc.channel) as Record<string, unknown> | undefined;
  const rdf = (doc['rdf:RDF'] ?? doc.RDF) as Record<string, unknown> | undefined;
  const feed = doc.feed as Record<string, unknown> | undefined;

  const title =
    text(channel?.title) ||
    text((rdf?.channel as Record<string, unknown>)?.title) ||
    text(feed?.title);

  return stripHtml(title).slice(0, 60);
}

export async function fetchFeed(source: NewsSource, signal?: AbortSignal): Promise<Article[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort);

  try {
    const response = await fetch(source.feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        // Some publishers reject requests without a recognisable agent string.
        'User-Agent': 'DailyNews/1.0 (+https://github.com/hakansilsupur/daily-news)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return parseFeed(await response.text(), source);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}
