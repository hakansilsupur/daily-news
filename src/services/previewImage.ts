/**
 * Card images for articles whose feed carries none.
 *
 * Google News' RSS has no enclosure, no media:content and no image in the
 * description — its items are a headline, a link and a timestamp. So the
 * Gündem tab had nothing to put in the thumbnail. Publishers do advertise a
 * picture, in the `og:image` tag of the article page itself, which is what this
 * goes and reads.
 *
 * That means an HTTP request per card, so the cost is kept down hard: only
 * articles with no image of their own ask for one, only cards that actually
 * render ask, the response is range-limited to the head of the document, and
 * every answer is cached on the device.
 */
/**
 * Aggregators whose links never reach the publisher.
 *
 * A Google News link opens an interstitial that redirects in JavaScript, so a
 * plain fetch stops there and reads that page's own `og:image` — the Google
 * News logo, on every card. Asking is worse than not asking: it spends a
 * request to fetch a picture that says nothing about the story.
 */
const AGGREGATOR_HOSTS = ['news.google.com', 'news.yahoo.com'];

export function isAggregatorLink(url: string): boolean {
  try {
    return AGGREGATOR_HOSTS.includes(new URL(url).hostname.replace(/^www\./, ''));
  } catch {
    return false;
  }
}

/**
 * The publisher's own mark, from the site a feed names for them. Not a picture
 * of the story, but it identifies the newsroom at a glance — which is what a
 * thumbnail is for on a headline with no photograph of its own.
 */
export function faviconUrl(siteUrl: string, size = 128): string | null {
  try {
    const host = new URL(siteUrl).hostname;
    if (!host.includes('.')) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
  } catch {
    return null;
  }
}

const TIMEOUT_MS = 8000;
const MAX_CONCURRENT = 2;
/** Enough for the <head> of any sane page. */
const HEAD_BYTES = 65_535;
/** If a server ignores the range request, give up rather than pull megabytes. */
const MAX_FULL_BYTES = 400_000;

/**
 * Reads the image a page advertises to social cards. `og:image` is the
 * standard; Twitter's variant is the common fallback. Attribute order varies,
 * so each meta tag is matched whole and read on its own.
 */
export function extractOgImage(html: string, baseUrl: string): string | null {
  for (const pattern of [/og:image(?::secure_url)?/i, /twitter:image(?::src)?/i]) {
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
      const tag = match[0];
      if (!pattern.test(tag)) continue;

      const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      if (!content) continue;

      try {
        const url = new URL(content.trim(), baseUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
        return url.toString();
      } catch {
        continue;
      }
    }
  }

  return null;
}

let active = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(run: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active += 1;

  try {
    return await run();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

/**
 * Fetches the article page and returns the image it advertises, or null.
 *
 * A Google News link redirects to the publisher, which `fetch` follows, so the
 * HTML read here is the real article's. Anything that goes wrong — a redirect
 * to a consent wall, a page with no tags, a server that refuses the range and
 * would cost a megabyte — returns null and leaves the placeholder in place.
 */
export async function fetchPreviewImage(
  articleUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (isAggregatorLink(articleUrl)) return null;

  return withSlot(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const response = await fetch(articleUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          // Most servers honour this and send only the head of the document.
          Range: `bytes=0-${HEAD_BYTES}`,
          'User-Agent': 'DailyNews/1.0 (+https://github.com/hakansilsupur/daily-news)',
        },
      });

      if (!response.ok && response.status !== 206) return null;

      const length = Number(response.headers.get('content-length') ?? 0);
      // 206 means the range was honoured; a full 200 of unknown or huge size is
      // not worth a reader's mobile data for one thumbnail.
      if (response.status === 200 && length > MAX_FULL_BYTES) return null;

      return extractOgImage(await response.text(), response.url || articleUrl);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }
  });
}
