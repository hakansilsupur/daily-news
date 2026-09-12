/** ISO 3166-1 alpha-2, lowercase. Extend alongside `COUNTRIES`. */
export type CountryCode =
  | 'tr'
  | 'us'
  | 'gb'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'nl'
  | 'in'
  | 'jp'
  | 'br'
  | 'ca'
  | 'au';

/** Where a source reports from: one country, or international coverage. */
export type SourceScope = CountryCode | 'world';

/**
 * What the feed is currently showing.
 * - `country` — only the selected country's sources (Türkiye by default)
 * - `world`   — only international sources
 * - `all`     — the selected country plus international
 */
export type ScopeMode = 'country' | 'world' | 'all';

export interface Country {
  code: CountryCode;
  /** English name, used for the picker list and its search. */
  name: string;
  /** Endonym shown as a subtitle, e.g. "Türkiye", "Deutschland". */
  nativeName: string;
  flag: string;
}

export type SourceCategory =
  | 'general'
  | 'agency'
  | 'business'
  | 'technology'
  | 'sports';

export interface NewsSource {
  /** Stable identifier — persisted in preferences, so never rename an existing one. */
  id: string;
  name: string;
  scope: SourceScope;
  category: SourceCategory;
  feedUrl: string;
  /** Two-letter language tag, used only for display. */
  language: string;
  /** True for feeds the user added themselves. */
  custom?: boolean;
}

export interface Article {
  /** Derived from the article link, so the same story from one feed dedupes. */
  id: string;
  title: string;
  summary: string;
  link: string;
  imageUrl?: string;
  /** Epoch milliseconds. 0 when the feed gave us nothing parseable. */
  publishedAt: number;
  sourceId: string;
  sourceName: string;
  scope: SourceScope;
}

export interface FeedResult {
  sourceId: string;
  articles: Article[];
  error?: string;
}
