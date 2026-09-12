import { filterSources } from './sources';
import type { CountryCode, FeedTab, LanguageFilter, NewsSource, RegionFilter } from '../types';

/** The always-present first tab: everything, narrowed by the ad-hoc filters. */
export const ALL_TAB_ID = 'all';

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
