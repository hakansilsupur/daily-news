import { fetchFeed } from './rss';
import { foldForSearch } from './text';
import type { Article, FeedResult, NewsSource } from '../types';

/**
 * Fetches every requested feed in parallel. A feed that fails does not sink the
 * batch — its error is reported alongside the articles that did arrive, so the
 * UI can show partial results and name the sources that are down.
 */
export async function fetchAllFeeds(
  sources: NewsSource[],
  signal?: AbortSignal,
): Promise<FeedResult[]> {
  return Promise.all(
    sources.map(async (source): Promise<FeedResult> => {
      try {
        return { sourceId: source.id, articles: await fetchFeed(source, signal) };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { sourceId: source.id, articles: [], error: message };
      }
    }),
  );
}

/** Newest first, with undated items pushed to the bottom. */
export function mergeAndSort(results: FeedResult[]): Article[] {
  const seen = new Set<string>();
  const merged: Article[] = [];

  for (const result of results) {
    for (const article of result.articles) {
      const key = article.link.replace(/[#?].*$/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(article);
    }
  }

  return merged.sort((a, b) => b.publishedAt - a.publishedAt);
}

export function searchArticles(articles: Article[], query: string): Article[] {
  const needle = foldForSearch(query.trim());
  if (!needle) return articles;

  return articles.filter(
    (article) =>
      foldForSearch(article.title).includes(needle) ||
      foldForSearch(article.summary).includes(needle) ||
      foldForSearch(article.sourceName).includes(needle),
  );
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  if (!timestamp) return '';

  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
