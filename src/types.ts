export type Region = 'turkey' | 'world';

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
  region: Region;
}

export interface FeedResult {
  sourceId: string;
  articles: Article[];
  error?: string;
}

export type RegionFilter = Region | 'all';
