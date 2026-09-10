import { parseFeed, parseFeedTitle } from './rss';
import type { NewsSource } from '../types';

const TIMEOUT_MS = 10_000;
const MAX_RESULTS = 8;

export interface DiscoveredFeed {
  url: string;
  title: string;
  articleCount: number;
}

/** Paths to try when a site advertises no feed in its HTML. */
export const COMMON_FEED_PATHS = [
  '/rss',
  '/feed',
  '/rss.xml',
  '/feed.xml',
  '/index.xml',
  '/atom.xml',
  '/en/rss',
];

/**
 * True for anything that could plausibly be an address rather than a name —
 * "bbc.co.uk", "https://x.com/feed". Used to decide whether typing something
 * should offer a site search alongside the directory results.
 */
export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  // A bare domain: at least one dot, and a 2+ letter TLD.
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed) && /\.[a-z]{2,}(\/|$)/i.test(trimmed);
}

/** Adds a scheme when the user typed a bare domain. Returns null if unusable. */
export function normalizeSiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/**
 * Pulls `<link rel="alternate" type="application/rss+xml">` tags out of a page.
 * Attribute order varies wildly in the wild, so each tag is matched whole and
 * its attributes read individually rather than in one positional pattern.
 */
export function extractFeedLinks(html: string, baseUrl: string): { url: string; title?: string }[] {
  const results: { url: string; title?: string }[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/rel\s*=\s*["']?[^"'>]*alternate/i.test(tag)) continue;
    if (!/type\s*=\s*["']?(application\/(rss|atom)\+xml|text\/xml)/i.test(tag)) continue;

    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;

    const url = resolveUrl(href, baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const title = /title\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    results.push({ url, title: title?.trim() || undefined });
  }

  return results;
}

/** The URLs worth probing for a site that advertised nothing. */
export function candidateUrls(siteUrl: string): string[] {
  const urls: string[] = [];
  for (const path of COMMON_FEED_PATHS) {
    const url = resolveUrl(path, siteUrl);
    if (url) urls.push(url);
  }
  return urls;
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
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*',
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

const probeSource = (url: string): NewsSource => ({
  id: 'probe',
  name: 'probe',
  region: 'world',
  category: 'general',
  feedUrl: url,
  language: 'en',
});

/** Fetches a candidate and keeps it only if it actually parses into articles. */
async function validate(url: string, signal?: AbortSignal): Promise<DiscoveredFeed | null> {
  try {
    const body = await fetchText(url, signal);
    const articles = parseFeed(body, probeSource(url));
    if (articles.length === 0) return null;

    return {
      url,
      title: parseFeedTitle(body) || new URL(url).hostname.replace(/^www\./, ''),
      articleCount: articles.length,
    };
  } catch {
    return null;
  }
}

/**
 * Finds the feeds behind a site address.
 *
 * The address itself may already be a feed, so that is tried first. Otherwise
 * the page's own `<link rel="alternate">` tags are followed, and only if the
 * site advertises nothing do we fall back to guessing the usual paths. Every
 * candidate is fetched and parsed before being offered — a URL that 200s with
 * an HTML error page is not a feed, and the user should never have to find that
 * out by adding it to their list.
 */
export async function discoverFeeds(input: string, signal?: AbortSignal): Promise<DiscoveredFeed[]> {
  const siteUrl = normalizeSiteUrl(input);
  if (!siteUrl) return [];

  let body: string;
  try {
    body = await fetchText(siteUrl, signal);
  } catch {
    // The address itself is unreachable; guessing paths under it is still worth a try.
    const guesses = await Promise.all(candidateUrls(siteUrl).map((url) => validate(url, signal)));
    return dedupe(guesses);
  }

  const direct = parseFeed(body, probeSource(siteUrl));
  if (direct.length > 0) {
    return [
      {
        url: siteUrl,
        title: parseFeedTitle(body) || new URL(siteUrl).hostname.replace(/^www\./, ''),
        articleCount: direct.length,
      },
    ];
  }

  const advertised = extractFeedLinks(body, siteUrl);
  const toProbe = advertised.length > 0 ? advertised.map((link) => link.url) : candidateUrls(siteUrl);
  const found = await Promise.all(toProbe.slice(0, MAX_RESULTS).map((url) => validate(url, signal)));

  // Prefer the title the page gave the feed over the one inside it.
  return dedupe(found).map((feed) => ({
    ...feed,
    title: advertised.find((link) => link.url === feed.url)?.title ?? feed.title,
  }));
}

function dedupe(feeds: (DiscoveredFeed | null)[]): DiscoveredFeed[] {
  const seen = new Set<string>();
  const result: DiscoveredFeed[] = [];

  for (const feed of feeds) {
    if (!feed || seen.has(feed.url)) continue;
    seen.add(feed.url);
    result.push(feed);
  }

  return result.slice(0, MAX_RESULTS);
}
