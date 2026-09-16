import { parseFeed } from './rss';
import type { Article, CountryCode, NewsSource, SourceLanguage, SourceOrigin } from '../types';

/**
 * Top stories, independent of the user's own sources.
 *
 * The trending tab built from the user's feeds can only reflect what those
 * feeds carry. This asks Google News for the stories it ranks top in a country
 * — or worldwide — which is a view from outside the user's selection entirely.
 *
 * It is a plain RSS endpoint: no API key, no account, nothing to sign up for,
 * and it parses with the same reader as every other feed. X/Twitter trends were
 * the obvious alternative and are not usable — they sit behind a paid API tier.
 */
const ENDPOINT = 'https://news.google.com/rss';
const TIMEOUT_MS = 12000;

interface Locale {
  hl: string;
  gl: string;
  ceid: string;
}

/** Google News locale per country, so each reads in its own language. */
const LOCALES: Record<CountryCode, Locale> = {
  tr: { hl: 'tr', gl: 'TR', ceid: 'TR:tr' },
  az: { hl: 'az', gl: 'AZ', ceid: 'AZ:az' },
  cn: { hl: 'zh-CN', gl: 'CN', ceid: 'CN:zh-Hans' },
  fr: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  de: { hl: 'de', gl: 'DE', ceid: 'DE:de' },
  in: { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },
  il: { hl: 'he', gl: 'IL', ceid: 'IL:he' },
  it: { hl: 'it', gl: 'IT', ceid: 'IT:it' },
  jp: { hl: 'ja', gl: 'JP', ceid: 'JP:ja' },
  nl: { hl: 'nl', gl: 'NL', ceid: 'NL:nl' },
  es: { hl: 'es', gl: 'ES', ceid: 'ES:es' },
  gb: { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  us: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
};

/**
 * The international desk, used for the world scope.
 *
 * Asking the World section in the reader's own locale returns their own
 * country's papers writing about abroad — Türkiye's world page is still TRT and
 * Hürriyet. Picking Türkiye should give Turkish news and picking Dünya should
 * give news from outside it, so the world scope asks an international locale
 * instead. Those headlines arrive in English and the translation setting turns
 * them back into the reader's language.
 */
const WORLD_LOCALE: Locale = { hl: 'en-US', gl: 'US', ceid: 'US:en' };

/**
 * The feed for a scope: the chosen country's own front page, or the world desk.
 */
export function topStoriesUrl(country: CountryCode, scope: 'local' | 'world'): string {
  const locale = scope === 'world' ? WORLD_LOCALE : LOCALES[country];
  const query = `hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;

  return scope === 'world'
    ? `${ENDPOINT}/headlines/section/topic/WORLD?${query}`
    : `${ENDPOINT}?${query}`;
}

/**
 * Google News titles read "Headline - Publisher". Splitting on the last dash
 * recovers the publisher, so a card credits the newsroom rather than the
 * aggregator. Headlines containing their own dash keep it: only the final
 * segment is treated as a name, and only when it is short enough to be one.
 */
export function splitGoogleNewsTitle(raw: string): { title: string; sourceName?: string } {
  const cut = raw.lastIndexOf(' - ');
  if (cut === -1) return { title: raw.trim() };

  const title = raw.slice(0, cut).trim();
  const source = raw.slice(cut + 3).trim();

  if (!title || !source || source.length > 40) return { title: raw.trim() };
  return { title, sourceName: source };
}

function feedSource(country: CountryCode, scope: 'local' | 'world'): NewsSource {
  return {
    id: `topstories:${scope === 'world' ? 'world' : country}`,
    name: 'Google News',
    region: (scope === 'world' ? 'world' : country) as SourceOrigin,
    category: 'general',
    feedUrl: topStoriesUrl(country, scope),
    language: LOCALES[country].hl.split('-')[0] as SourceLanguage,
  };
}

/**
 * Fetches the ranked top stories. Order is the ranking — the endpoint returns
 * them strongest first — so nothing is re-sorted by date here.
 */
export async function fetchTopStories(
  country: CountryCode,
  scope: 'local' | 'world',
  signal?: AbortSignal,
): Promise<Article[]> {
  const source = feedSource(country, scope);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(source.feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'DailyNews/1.0 (+https://github.com/hakansilsupur/daily-news)',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return parseFeed(await response.text(), source).map((article) => {
      const { title, sourceName } = splitGoogleNewsTitle(article.title);
      return { ...article, title, sourceName: sourceName ?? article.sourceName };
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
