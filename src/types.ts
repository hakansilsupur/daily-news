/** Countries the app can treat as "home". Türkiye is the default. */
export type CountryCode =
  | 'tr'
  | 'us'
  | 'gb'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'nl'
  | 'az'
  | 'il'
  | 'cn'
  | 'in'
  | 'jp';

/**
 * Where a source belongs: a specific country, or the international bucket for
 * outlets that report globally rather than for one country's readers.
 */
export type SourceOrigin = CountryCode | 'world';

/** Language a source publishes in. */
export type SourceLanguage =
  | 'tr'
  | 'en'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'nl'
  | 'az'
  | 'he'
  | 'zh'
  | 'hi'
  | 'ja';

/**
 * What previews can be translated into. Independent of the interface language:
 * someone reading an English UI may still want their headlines in Turkish.
 */
export type TranslationLanguage = SourceLanguage;

/** Languages the interface itself is translated into. */
export type UiLanguage = 'tr' | 'en';

/** What the user picked; `system` follows the device locale. */
export type UiLanguagePreference = UiLanguage | 'system';

export type SourceCategory =
  | 'general'
  | 'agency'
  | 'business'
  | 'technology'
  | 'science'
  | 'sports';

export interface NewsSource {
  /** Stable identifier — persisted in preferences, so never rename an existing one. */
  id: string;
  name: string;
  /** The country this source serves, or `world`. */
  region: SourceOrigin;
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
  region: SourceOrigin;
  /** The source's language — decides whether a preview needs translating. */
  language?: SourceLanguage;
  /** Home page of the newsroom that published it, when a feed names one. */
  publisherUrl?: string;
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

/**
 * The feed's coarse filter. `local` means "the country I picked", so the same
 * stored preference keeps working when the user changes countries.
 */
export type RegionFilter = 'all' | 'local' | 'world';

export type LanguageFilter = SourceLanguage | 'all';
