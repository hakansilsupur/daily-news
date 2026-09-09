import type { LanguageFilter, NewsSource, Region, RegionFilter } from '../types';

/**
 * Built-in feeds. Everything here is a public RSS/Atom endpoint, so no API keys
 * are needed. Users can add their own feeds on top of these (see storage/prefs).
 */
export const BUILT_IN_SOURCES: NewsSource[] = [
  // --- Turkey -------------------------------------------------------------
  {
    id: 'aa-guncel',
    name: 'Anadolu Ajansı',
    region: 'turkey',
    category: 'agency',
    feedUrl: 'https://www.aa.com.tr/tr/rss/default?cat=guncel',
    language: 'tr',
  },
  {
    id: 'trt-haber',
    name: 'TRT Haber',
    region: 'turkey',
    category: 'general',
    feedUrl: 'https://www.trthaber.com/sondakika.rss',
    language: 'tr',
  },
  {
    id: 'hurriyet',
    name: 'Hürriyet',
    region: 'turkey',
    category: 'general',
    feedUrl: 'https://www.hurriyet.com.tr/rss/anasayfa',
    language: 'tr',
  },
  {
    id: 'sozcu',
    name: 'Sözcü',
    region: 'turkey',
    category: 'general',
    feedUrl: 'https://www.sozcu.com.tr/feed/',
    language: 'tr',
  },
  {
    id: 'cumhuriyet',
    name: 'Cumhuriyet',
    region: 'turkey',
    category: 'general',
    feedUrl: 'https://www.cumhuriyet.com.tr/rss/son_dakika.xml',
    language: 'tr',
  },
  {
    id: 'ntv',
    name: 'NTV',
    region: 'turkey',
    category: 'general',
    feedUrl: 'https://www.ntv.com.tr/gundem.rss',
    language: 'tr',
  },
  {
    id: 'bbc-turkce',
    name: 'BBC News Türkçe',
    region: 'turkey',
    category: 'general',
    feedUrl: 'https://feeds.bbci.co.uk/turkce/rss.xml',
    language: 'tr',
  },
  {
    id: 'bianet',
    name: 'Bianet',
    region: 'turkey',
    category: 'general',
    feedUrl: 'https://bianet.org/rss/anasayfa',
    language: 'tr',
  },
  {
    id: 'dunya-ekonomi',
    name: 'Dünya Gazetesi',
    region: 'turkey',
    category: 'business',
    feedUrl: 'https://www.dunya.com/rss?dunya',
    language: 'tr',
  },
  {
    id: 'webrazzi',
    name: 'Webrazzi',
    region: 'turkey',
    category: 'technology',
    feedUrl: 'https://webrazzi.com/feed/',
    language: 'tr',
  },
  {
    id: 'fanatik',
    name: 'Fanatik',
    region: 'turkey',
    category: 'sports',
    feedUrl: 'https://www.fanatik.com.tr/rss/anasayfa',
    language: 'tr',
  },

  // --- Worldwide ----------------------------------------------------------
  {
    id: 'bbc-world',
    name: 'BBC World',
    region: 'world',
    category: 'general',
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    language: 'en',
  },
  {
    id: 'aljazeera',
    name: 'Al Jazeera',
    region: 'world',
    category: 'general',
    feedUrl: 'https://www.aljazeera.com/xml/rss/all.xml',
    language: 'en',
  },
  {
    id: 'guardian-world',
    name: 'The Guardian',
    region: 'world',
    category: 'general',
    feedUrl: 'https://www.theguardian.com/world/rss',
    language: 'en',
  },
  {
    id: 'npr-world',
    name: 'NPR World',
    region: 'world',
    category: 'general',
    feedUrl: 'https://feeds.npr.org/1004/rss.xml',
    language: 'en',
  },
  {
    id: 'dw-world',
    name: 'Deutsche Welle',
    region: 'world',
    category: 'general',
    feedUrl: 'https://rss.dw.com/rdf/rss-en-world',
    language: 'en',
  },
  {
    id: 'france24',
    name: 'France 24',
    region: 'world',
    category: 'general',
    feedUrl: 'https://www.france24.com/en/rss',
    language: 'en',
  },
  {
    id: 'euronews',
    name: 'Euronews',
    region: 'world',
    category: 'general',
    feedUrl: 'https://www.euronews.com/rss?level=theme&name=news',
    language: 'en',
  },
  {
    id: 'reuters-agency',
    name: 'Reuters Agency',
    region: 'world',
    category: 'agency',
    feedUrl: 'https://www.reutersagency.com/feed/?best-topics=business-finance',
    language: 'en',
  },
  {
    id: 'cnbc-world',
    name: 'CNBC',
    region: 'world',
    category: 'business',
    feedUrl: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362',
    language: 'en',
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    region: 'world',
    category: 'technology',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    language: 'en',
  },
  {
    id: 'espn',
    name: 'ESPN',
    region: 'world',
    category: 'sports',
    feedUrl: 'https://www.espn.com/espn/rss/news',
    language: 'en',
  },
];

export function sourcesByRegion(sources: NewsSource[], region: Region): NewsSource[] {
  return sources.filter((source) => source.region === region);
}

/**
 * The sources a given region + language filter selects. `all` on either axis
 * means "do not narrow on it", so `{ region: 'all', language: 'all' }` is
 * everything. Both filters apply together: Türkiye + English is BBC News
 * Türkçe's region-mates that publish in English, which may well be empty — the
 * feed screen reports that as "no sources selected" rather than silently
 * widening the filter.
 */
export function filterSources(
  sources: NewsSource[],
  filters: { region: RegionFilter; language: LanguageFilter },
): NewsSource[] {
  return sources.filter(
    (source) =>
      (filters.region === 'all' || source.region === filters.region) &&
      (filters.language === 'all' || source.language === filters.language),
  );
}
