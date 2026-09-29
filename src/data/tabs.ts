import { filterSources } from './sources';
import type { CountryCode, FeedTab, LanguageFilter, NewsSource, RegionFilter } from '../types';

/** The always-present first tab: everything, narrowed by the ad-hoc filters. */
export const ALL_TAB_ID = 'all';

/**
 * The leftmost tab: the same sources as `all`, grouped into the stories several
 * of them are carrying at once. It draws on the region filter, so it shows what
 * is big in the chosen country or worldwide.
 */
export const TRENDING_TAB_ID = 'trending';

/** Neither built-in tab is a pinned tab, so neither narrows the source set. */
export function isBuiltInTab(id: string): boolean {
  return id === ALL_TAB_ID || id === TRENDING_TAB_ID;
}

/**
 * Every tab in the order they are laid out, left to right. The tab strip and
 * the swipeable pages read this same list, so a chip and the page it scrolls
 * to cannot drift apart.
 */
export function feedPageIds(tabs: FeedTab[]): string[] {
  return [TRENDING_TAB_ID, ALL_TAB_ID, ...tabs.map((tab) => tab.id)];
}

/**
 * Where a tab sits among the pages. A tab that no longer exists — deleted while
 * it was open — resolves to `all` rather than to nothing, which would scroll the
 * pager off its own content.
 */
export function pageIndexOf(pageIds: string[], id: string): number {
  const index = pageIds.indexOf(id);
  if (index >= 0) return index;
  const fallback = pageIds.indexOf(ALL_TAB_ID);
  return fallback >= 0 ? fallback : 0;
}

export interface AdHocFilters {
  region: RegionFilter;
  language: LanguageFilter;
  country: CountryCode;
  isEnabled: (id: string) => boolean;
}

/**
 * The sources a tab shows.
 *
 * The `all` tab (a null tab) answers to the region and language filters and the
 * per-source switches. A pinned tab is the opposite: it is an explicit list, so
 * it ignores those filters entirely — that is the point of pinning one. Ids
 * that no longer resolve (a custom feed the user later deleted) are dropped
 * rather than left as holes, and the tab's own order is preserved.
 */
export function sourcesForTab(
  allSources: NewsSource[],
  tab: FeedTab | null,
  filters: AdHocFilters,
): NewsSource[] {
  if (!tab) {
    return filterSources(allSources, {
      region: filters.region,
      language: filters.language,
      country: filters.country,
    }).filter((source) => filters.isEnabled(source.id));
  }

  const byId = new Map(allSources.map((source) => [source.id, source]));
  return tab.sourceIds
    .map((id) => byId.get(id))
    .filter((source): source is NewsSource => source !== undefined);
}

/** Drops ids that no longer exist, so a tab cannot rot into a dead selection. */
export function pruneTab(tab: FeedTab, allSources: NewsSource[]): FeedTab {
  const known = new Set(allSources.map((source) => source.id));
  return { ...tab, sourceIds: tab.sourceIds.filter((id) => known.has(id)) };
}
