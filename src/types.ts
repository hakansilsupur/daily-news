export type Region = 'turkey' | 'world';

/** Language a source publishes in. */
export type SourceLanguage = 'tr' | 'en';

/** Languages the interface itself is translated into. */
export type UiLanguage = 'tr' | 'en';

/** What the user picked; `system` follows the device locale. */
export type UiLanguagePreference = UiLanguage | 'system';

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
  region: Region;
  category: SourceCategory;
  feedUrl: string;
  /** Publishing language — shown in the sources sheet and driving the language filter. */
  language: SourceLanguage;
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
  region: Region;
}

/**
 * A pinned tab across the top of the feed: a named, fixed set of sources the
 * user assembled, in the spirit of a pinned list on X. The built-in `all` tab
 * is not stored as one of these — it is the ad-hoc view driven by the region,
 * language and per-source toggles.
 */
export interface FeedTab {
  id: string;
  name: string;
  sourceIds: string[];
}

export interface FeedResult {
  sourceId: string;
  articles: Article[];
  error?: string;
}

export type RegionFilter = Region | 'all';

export type LanguageFilter = SourceLanguage | 'all';
