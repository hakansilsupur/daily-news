import { matchesRegion } from './sources';
import type {
  CountryCode,
  NewsSource,
  RegionFilter,
  SourceCategory,
  SourceLanguage,
  SourceOrigin,
} from '../types';

/**
 * A searchable directory of well-known feeds, shipped with the app so that
 * adding a source is a search rather than a hunt for an RSS URL. These are not
 * enabled by default — they are candidates the user can add from the Add source
 * sheet, at which point they become ordinary custom sources.
 *
 * Like the built-in list, these URLs are unverified against the live internet
 * from the build sandbox. `npm run check-feeds` fetches every one of them.
 */
export interface CatalogEntry {
  id: string;
  name: string;
  region: SourceOrigin;
  category: SourceCategory;
  language: SourceLanguage;
  feedUrl: string;
  /** Extra search terms — Turkish words for English-named sources, and vice versa. */
  keywords?: string[];
}

export const SOURCE_CATALOG: CatalogEntry[] = [
  // --- Türkiye ------------------------------------------------------------
  {
    id: 'cat:milliyet',
    name: 'Milliyet',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.milliyet.com.tr/rss/rssnew/gundemrss.xml',
    keywords: ['gündem', 'haber'],
  },
  {
    id: 'cat:haberturk',
    name: 'Habertürk',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.haberturk.com/rss',
    keywords: ['gündem', 'haber'],
  },
  {
    id: 'cat:sabah',
    name: 'Sabah',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.sabah.com.tr/rss/gundem.xml',
    keywords: ['gündem'],
  },
  {
    id: 'cat:milli-gazete',
    name: 'Milli Gazete',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.milligazete.com.tr/rss',
  },
  {
    id: 'cat:t24',
    name: 'T24',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://t24.com.tr/rss',
  },
  {
    id: 'cat:diken',
    name: 'Diken',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.diken.com.tr/feed/',
  },
  {
    id: 'cat:gazete-duvar',
    name: 'Gazete Duvar',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.gazeteduvar.com.tr/export/rss',
  },
  {
    id: 'cat:evrensel',
    name: 'Evrensel',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.evrensel.net/rss/haber.xml',
  },
  {
    id: 'cat:karar',
    name: 'Karar',
    region: 'tr',
    category: 'general',
    language: 'tr',
    feedUrl: 'https://www.karar.com/service/rss.php',
  },
  {
    id: 'cat:aa-ekonomi',
    name: 'Anadolu Ajansı — Ekonomi',
    region: 'tr',
    category: 'business',
    language: 'tr',
    feedUrl: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi',
    keywords: ['ekonomi', 'finans', 'borsa'],
  },
  {
    id: 'cat:bloomberg-ht',
    name: 'Bloomberg HT',
    region: 'tr',
    category: 'business',
    language: 'tr',
    feedUrl: 'https://www.bloomberght.com/rss',
    keywords: ['ekonomi', 'borsa', 'finans'],
  },
  {
    id: 'cat:patronlar-dunyasi',
    name: 'Patronlar Dünyası',
    region: 'tr',
    category: 'business',
    language: 'tr',
    feedUrl: 'https://www.patronlardunyasi.com/rss',
    keywords: ['ekonomi', 'iş dünyası'],
  },
  {
    id: 'cat:shiftdelete',
    name: 'ShiftDelete',
    region: 'tr',
    category: 'technology',
    language: 'tr',
    feedUrl: 'https://shiftdelete.net/feed',
    keywords: ['teknoloji', 'telefon', 'donanım'],
  },
  {
    id: 'cat:donanimhaber',
    name: 'DonanımHaber',
    region: 'tr',
    category: 'technology',
    language: 'tr',
    feedUrl: 'https://www.donanimhaber.com/rss/tum/',
    keywords: ['teknoloji', 'donanım', 'bilgisayar'],
  },
  {
    id: 'cat:chip-online',
    name: 'CHIP Online',
    region: 'tr',
    category: 'technology',
    language: 'tr',
    feedUrl: 'https://www.chip.com.tr/rss',
    keywords: ['teknoloji'],
  },
  {
    id: 'cat:bilim-teknik',
    name: 'TÜBİTAK Bilim Teknik',
    region: 'tr',
    category: 'science',
    language: 'tr',
    feedUrl: 'https://bilimteknik.tubitak.gov.tr/rss.xml',
    keywords: ['bilim', 'science', 'araştırma'],
  },
  {
    id: 'cat:ntv-spor',
    name: 'NTV Spor',
    region: 'tr',
    category: 'sports',
    language: 'tr',
    feedUrl: 'https://www.ntvspor.net/rss',
    keywords: ['spor', 'futbol'],
  },
  {
    id: 'cat:sporx',
    name: 'Sporx',
    region: 'tr',
    category: 'sports',
    language: 'tr',
    feedUrl: 'https://www.sporx.com/rss/spor.xml',
    keywords: ['spor', 'futbol'],
  },
  {
    id: 'cat:trt-spor',
    name: 'TRT Spor',
    region: 'tr',
    category: 'sports',
    language: 'tr',
    feedUrl: 'https://www.trtspor.com.tr/rss',
    keywords: ['spor'],
  },

  // --- Azerbaijan ---------------------------------------------------------
  {
    id: 'cat:trend-az',
    name: 'Trend.az',
    region: 'az',
    category: 'agency',
    language: 'az',
    feedUrl: 'https://az.trend.az/feeds/index.rss',
    keywords: ['azerbaycan', 'azərbaycan'],
  },
  {
    id: 'cat:apa-az',
    name: 'APA',
    region: 'az',
    category: 'agency',
    language: 'az',
    feedUrl: 'https://apa.az/rss',
    keywords: ['azerbaycan', 'azərbaycan'],
  },
  {
    id: 'cat:report-az',
    name: 'Report.az',
    region: 'az',
    category: 'general',
    language: 'az',
    feedUrl: 'https://report.az/rss/',
    keywords: ['azerbaycan', 'azərbaycan'],
  },

  // --- France -------------------------------------------------------------
  {
    id: 'cat:le-monde',
    name: 'Le Monde',
    region: 'fr',
    category: 'general',
    language: 'fr',
    feedUrl: 'https://www.lemonde.fr/rss/une.xml',
    keywords: ['fransa', 'france'],
  },
  {
    id: 'cat:le-figaro',
    name: 'Le Figaro',
    region: 'fr',
    category: 'general',
    language: 'fr',
    feedUrl: 'https://www.lefigaro.fr/rss/figaro_actualites.xml',
    keywords: ['fransa', 'france'],
  },
  {
    id: 'cat:france-info',
    name: 'France Info',
    region: 'fr',
    category: 'general',
    language: 'fr',
    feedUrl: 'https://www.francetvinfo.fr/titres.rss',
    keywords: ['fransa', 'france'],
  },
  {
    id: 'cat:les-echos',
    name: 'Les Échos',
    region: 'fr',
    category: 'business',
    language: 'fr',
    feedUrl: 'https://services.lesechos.fr/rss/les-echos-economie.xml',
    keywords: ['ekonomi', 'économie'],
  },

  // --- Germany ------------------------------------------------------------
  {
    id: 'cat:tagesschau',
    name: 'tagesschau',
    region: 'de',
    category: 'general',
    language: 'de',
    feedUrl: 'https://www.tagesschau.de/index~rss2.xml',
    keywords: ['almanya', 'deutschland'],
  },
  {
    id: 'cat:spiegel',
    name: 'DER SPIEGEL',
    region: 'de',
    category: 'general',
    language: 'de',
    feedUrl: 'https://www.spiegel.de/schlagzeilen/tops/index.rss',
    keywords: ['almanya', 'deutschland'],
  },
  {
    id: 'cat:zeit-online',
    name: 'ZEIT ONLINE',
    region: 'de',
    category: 'general',
    language: 'de',
    feedUrl: 'https://newsfeed.zeit.de/index',
    keywords: ['almanya', 'deutschland'],
  },
  {
    id: 'cat:handelsblatt',
    name: 'Handelsblatt',
    region: 'de',
    category: 'business',
    language: 'de',
    feedUrl: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen',
    keywords: ['ekonomi', 'wirtschaft'],
  },
  {
    id: 'cat:heise',
    name: 'heise online',
    region: 'de',
    category: 'technology',
    language: 'de',
    feedUrl: 'https://www.heise.de/rss/heise-atom.xml',
    keywords: ['teknoloji', 'technik'],
  },

  // --- Italy --------------------------------------------------------------
  {
    id: 'cat:ansa',
    name: 'ANSA',
    region: 'it',
    category: 'agency',
    language: 'it',
    feedUrl: 'https://www.ansa.it/sito/ansait_rss.xml',
    keywords: ['italya', 'italia'],
  },
  {
    id: 'cat:corriere',
    name: 'Corriere della Sera',
    region: 'it',
    category: 'general',
    language: 'it',
    feedUrl: 'https://xml2.corriereobjects.it/rss/homepage.xml',
    keywords: ['italya', 'italia'],
  },
  {
    id: 'cat:repubblica',
    name: 'la Repubblica',
    region: 'it',
    category: 'general',
    language: 'it',
    feedUrl: 'https://www.repubblica.it/rss/homepage/rss2.0.xml',
    keywords: ['italya', 'italia'],
  },

  // --- Netherlands --------------------------------------------------------
  {
    id: 'cat:nos',
    name: 'NOS Nieuws',
    region: 'nl',
    category: 'general',
    language: 'nl',
    feedUrl: 'https://feeds.nos.nl/nosnieuwsalgemeen',
    keywords: ['hollanda', 'nederland'],
  },
  {
    id: 'cat:nu-nl',
    name: 'NU.nl',
    region: 'nl',
    category: 'general',
    language: 'nl',
    feedUrl: 'https://www.nu.nl/rss/Algemeen',
    keywords: ['hollanda', 'nederland'],
  },
  {
    id: 'cat:volkskrant',
    name: 'de Volkskrant',
    region: 'nl',
    category: 'general',
    language: 'nl',
    feedUrl: 'https://www.volkskrant.nl/voorpagina/rss.xml',
    keywords: ['hollanda', 'nederland'],
  },

  // --- Spain --------------------------------------------------------------
  {
    id: 'cat:el-pais',
    name: 'El País',
    region: 'es',
    category: 'general',
    language: 'es',
    feedUrl: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',
    keywords: ['ispanya', 'españa'],
  },
  {
    id: 'cat:el-mundo',
    name: 'El Mundo',
    region: 'es',
    category: 'general',
    language: 'es',
    feedUrl: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml',
    keywords: ['ispanya', 'españa'],
  },
  {
    id: 'cat:rtve',
    name: 'RTVE Noticias',
    region: 'es',
    category: 'general',
    language: 'es',
    feedUrl: 'https://api2.rtve.es/rss/temas_noticias.xml',
    keywords: ['ispanya', 'españa'],
  },

  // --- United Kingdom -----------------------------------------------------
  {
    id: 'cat:bbc-uk',
    name: 'BBC News — UK',
    region: 'gb',
    category: 'general',
    language: 'en',
    feedUrl: 'https://feeds.bbci.co.uk/news/uk/rss.xml',
    keywords: ['britain', 'ingiltere'],
  },
  {
    id: 'cat:guardian-uk',
    name: 'The Guardian — UK',
    region: 'gb',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.theguardian.com/uk-news/rss',
    keywords: ['britain', 'ingiltere'],
  },
  {
    id: 'cat:sky-news-uk',
    name: 'Sky News — UK',
    region: 'gb',
    category: 'general',
    language: 'en',
    feedUrl: 'https://feeds.skynews.com/feeds/rss/uk.xml',
    keywords: ['britain', 'ingiltere'],
  },
  {
    id: 'cat:telegraph',
    name: 'The Telegraph',
    region: 'gb',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.telegraph.co.uk/news/rss.xml',
    keywords: ['britain', 'ingiltere'],
  },

  // --- United States ------------------------------------------------------
  {
    id: 'cat:npr-news',
    name: 'NPR News',
    region: 'us',
    category: 'general',
    language: 'en',
    feedUrl: 'https://feeds.npr.org/1001/rss.xml',
    keywords: ['abd', 'america', 'usa'],
  },
  {
    id: 'cat:usa-today',
    name: 'USA TODAY',
    region: 'us',
    category: 'general',
    language: 'en',
    feedUrl: 'https://rssfeeds.usatoday.com/usatoday-NewsTopStories',
    keywords: ['abd', 'america', 'usa'],
  },
  {
    id: 'cat:nyt-us',
    name: 'The New York Times — U.S.',
    region: 'us',
    category: 'general',
    language: 'en',
    feedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml',
    keywords: ['abd', 'america', 'usa'],
  },
  {
    id: 'cat:politico',
    name: 'Politico',
    region: 'us',
    category: 'general',
    language: 'en',
    feedUrl: 'https://rss.politico.com/politics-news.xml',
    keywords: ['abd', 'politics', 'siyaset'],
  },
  {
    id: 'cat:la-times',
    name: 'Los Angeles Times',
    region: 'us',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.latimes.com/local/rss2.0.xml',
    keywords: ['abd', 'california'],
  },

  // --- Worldwide ----------------------------------------------------------
  {
    id: 'cat:ap-news',
    name: 'Associated Press',
    region: 'world',
    category: 'agency',
    language: 'en',
    feedUrl: 'https://rsshub.app/apnews/topics/apf-topnews',
    keywords: ['ap', 'ajans', 'agency'],
  },
  {
    id: 'cat:nyt-world',
    name: 'The New York Times — World',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    keywords: ['nyt', 'times', 'dünya'],
  },
  {
    id: 'cat:washington-post-world',
    name: 'The Washington Post — World',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://feeds.washingtonpost.com/rss/world',
    keywords: ['wapo', 'dünya'],
  },
  {
    id: 'cat:cnn-world',
    name: 'CNN — World',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'http://rss.cnn.com/rss/edition_world.rss',
    keywords: ['dünya'],
  },
  {
    id: 'cat:sky-news-world',
    name: 'Sky News — World',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://feeds.skynews.com/feeds/rss/world.xml',
  },
  {
    id: 'cat:the-independent',
    name: 'The Independent — World',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.independent.co.uk/news/world/rss',
  },
  {
    id: 'cat:times-of-israel',
    name: 'The Times of Israel',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.timesofisrael.com/feed/',
  },
  {
    id: 'cat:the-hindu',
    name: 'The Hindu — International',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.thehindu.com/news/international/feeder/default.rss',
    keywords: ['india', 'hindistan'],
  },
  {
    id: 'cat:japan-times',
    name: 'The Japan Times',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.japantimes.co.jp/feed/',
    keywords: ['japan', 'japonya'],
  },
  {
    id: 'cat:scmp',
    name: 'South China Morning Post',
    region: 'world',
    category: 'general',
    language: 'en',
    feedUrl: 'https://www.scmp.com/rss/91/feed',
    keywords: ['china', 'çin', 'hong kong'],
  },
  {
    id: 'cat:ft-world',
    name: 'Financial Times — World',
    region: 'world',
    category: 'business',
    language: 'en',
    feedUrl: 'https://www.ft.com/world?format=rss',
    keywords: ['ekonomi', 'finance', 'markets'],
  },
  {
    id: 'cat:economist',
    name: 'The Economist',
    region: 'world',
    category: 'business',
    language: 'en',
    feedUrl: 'https://www.economist.com/latest/rss.xml',
    keywords: ['ekonomi', 'finance'],
  },
  {
    id: 'cat:marketwatch',
    name: 'MarketWatch',
    region: 'world',
    category: 'business',
    language: 'en',
    feedUrl: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    keywords: ['borsa', 'markets', 'stocks'],
  },
  {
    id: 'cat:bbc-business',
    name: 'BBC — Business',
    region: 'world',
    category: 'business',
    language: 'en',
    feedUrl: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    keywords: ['ekonomi'],
  },
  {
    id: 'cat:techcrunch',
    name: 'TechCrunch',
    region: 'world',
    category: 'technology',
    language: 'en',
    feedUrl: 'https://techcrunch.com/feed/',
    keywords: ['teknoloji', 'startup'],
  },
  {
    id: 'cat:the-verge',
    name: 'The Verge',
    region: 'world',
    category: 'technology',
    language: 'en',
    feedUrl: 'https://www.theverge.com/rss/index.xml',
    keywords: ['teknoloji', 'gadget'],
  },
  {
    id: 'cat:hacker-news',
    name: 'Hacker News',
    region: 'world',
    category: 'technology',
    language: 'en',
    feedUrl: 'https://hnrss.org/frontpage',
    keywords: ['teknoloji', 'yazılım', 'software'],
  },
  {
    id: 'cat:engadget',
    name: 'Engadget',
    region: 'world',
    category: 'technology',
    language: 'en',
    feedUrl: 'https://www.engadget.com/rss.xml',
    keywords: ['teknoloji', 'gadget'],
  },
  {
    id: 'cat:mit-tech-review',
    name: 'MIT Technology Review',
    region: 'world',
    category: 'technology',
    language: 'en',
    feedUrl: 'https://www.technologyreview.com/feed/',
    keywords: ['teknoloji', 'yapay zeka', 'ai'],
  },
  {
    id: 'cat:nature',
    name: 'Nature',
    region: 'world',
    category: 'science',
    language: 'en',
    feedUrl: 'https://www.nature.com/nature.rss',
    keywords: ['bilim', 'science', 'research'],
  },
  {
    id: 'cat:science-daily',
    name: 'ScienceDaily',
    region: 'world',
    category: 'science',
    language: 'en',
    feedUrl: 'https://www.sciencedaily.com/rss/all.xml',
    keywords: ['bilim', 'science'],
  },
  {
    id: 'cat:new-scientist',
    name: 'New Scientist',
    region: 'world',
    category: 'science',
    language: 'en',
    feedUrl: 'https://www.newscientist.com/feed/home/',
    keywords: ['bilim', 'science'],
  },
  {
    id: 'cat:nasa',
    name: 'NASA',
    region: 'world',
    category: 'science',
    language: 'en',
    feedUrl: 'https://www.nasa.gov/feeds/iotd-feed/',
    keywords: ['uzay', 'space', 'bilim'],
  },
  {
    id: 'cat:phys-org',
    name: 'Phys.org',
    region: 'world',
    category: 'science',
    language: 'en',
    feedUrl: 'https://phys.org/rss-feed/',
    keywords: ['bilim', 'physics', 'fizik'],
  },
  {
    id: 'cat:bbc-sport',
    name: 'BBC Sport',
    region: 'world',
    category: 'sports',
    language: 'en',
    feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml',
    keywords: ['spor', 'football'],
  },
  {
    id: 'cat:sky-sports',
    name: 'Sky Sports',
    region: 'world',
    category: 'sports',
    language: 'en',
    feedUrl: 'https://www.skysports.com/rss/12040',
    keywords: ['spor', 'football'],
  },
];

/** Turkish-aware folding, so `İSTANBUL` and `istanbul` are the same needle. */
function fold(value: string): string {
  return value.toLocaleLowerCase('tr');
}

export interface CatalogSearchOptions {
  region?: RegionFilter;
  /** Resolves a `local` region filter; defaults to Türkiye. */
  country?: CountryCode;
  /** Feed URLs already in the user's list — those entries are still shown, flagged as added. */
  existing?: NewsSource[];
}

/**
 * Ranks directory entries against a query. A name that starts with the query
 * outranks one that merely contains it, which keeps "BBC" from burying
 * "BBC Sport" under everything else that mentions the BBC.
 */
export function searchCatalog(
  entries: CatalogEntry[],
  query: string,
  options: CatalogSearchOptions = {},
): CatalogEntry[] {
  const region = options.region ?? 'all';
  const country = options.country ?? 'tr';
  const inRegion = entries.filter((entry) =>
    matchesRegion({ ...entry, custom: false } as NewsSource, region, country),
  );

  const needle = fold(query.trim());
  if (!needle) return inRegion;

  const scored: { entry: CatalogEntry; score: number }[] = [];
  for (const entry of inRegion) {
    const name = fold(entry.name);
    const haystack = [name, entry.category, entry.language, ...(entry.keywords ?? []).map(fold)];

    if (name.startsWith(needle)) scored.push({ entry, score: 0 });
    else if (name.includes(needle)) scored.push({ entry, score: 1 });
    else if (haystack.some((item) => item.includes(needle))) scored.push({ entry, score: 2 });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name, 'tr'))
    .map((item) => item.entry);
}

/** Directory entries are "already added" when their feed URL is in the list. */
export function isAlreadyAdded(entry: CatalogEntry, existing: NewsSource[]): boolean {
  return existing.some((source) => source.feedUrl === entry.feedUrl);
}
