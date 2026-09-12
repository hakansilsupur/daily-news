import type { CountryCode, NewsSource, ScopeMode } from '../types';

/**
 * Built-in feeds, grouped by the country they report from. `scope: 'world'` is
 * for outlets whose feed is international rather than national.
 *
 * Everything here is a public RSS/Atom endpoint, so no API keys are needed.
 * Users can add their own feeds on top of these (see storage/prefs).
 *
 * Run `npm run check-feeds` after editing — publishers retire endpoints often.
 */
export const BUILT_IN_SOURCES: NewsSource[] = [
  // --- Türkiye ------------------------------------------------------------
  {
    id: 'aa-guncel',
    name: 'Anadolu Ajansı',
    scope: 'tr',
    category: 'agency',
    feedUrl: 'https://www.aa.com.tr/tr/rss/default?cat=guncel',
    language: 'tr',
  },
  {
    id: 'trt-haber',
    name: 'TRT Haber',
    scope: 'tr',
    category: 'general',
    feedUrl: 'https://www.trthaber.com/sondakika.rss',
    language: 'tr',
  },
  {
    id: 'hurriyet',
    name: 'Hürriyet',
    scope: 'tr',
    category: 'general',
    feedUrl: 'https://www.hurriyet.com.tr/rss/anasayfa',
    language: 'tr',
  },
  {
    id: 'sozcu',
    name: 'Sözcü',
    scope: 'tr',
    category: 'general',
    feedUrl: 'https://www.sozcu.com.tr/feed/',
    language: 'tr',
  },
  {
    id: 'cumhuriyet',
    name: 'Cumhuriyet',
    scope: 'tr',
    category: 'general',
    feedUrl: 'https://www.cumhuriyet.com.tr/rss/son_dakika.xml',
    language: 'tr',
  },
  {
    id: 'ntv',
    name: 'NTV',
    scope: 'tr',
    category: 'general',
    feedUrl: 'https://www.ntv.com.tr/gundem.rss',
    language: 'tr',
  },
  {
    id: 'bbc-turkce',
    name: 'BBC News Türkçe',
    scope: 'tr',
    category: 'general',
    feedUrl: 'https://feeds.bbci.co.uk/turkce/rss.xml',
    language: 'tr',
  },
  {
    id: 'bianet',
    name: 'Bianet',
    scope: 'tr',
    category: 'general',
    feedUrl: 'https://bianet.org/rss/anasayfa',
    language: 'tr',
  },
  {
    id: 'dunya-ekonomi',
    name: 'Dünya Gazetesi',
    scope: 'tr',
    category: 'business',
    feedUrl: 'https://www.dunya.com/rss?dunya',
    language: 'tr',
  },
  {
    id: 'webrazzi',
    name: 'Webrazzi',
    scope: 'tr',
    category: 'technology',
    feedUrl: 'https://webrazzi.com/feed/',
    language: 'tr',
  },
  {
    id: 'fanatik',
    name: 'Fanatik',
    scope: 'tr',
    category: 'sports',
    feedUrl: 'https://www.fanatik.com.tr/rss/anasayfa',
    language: 'tr',
  },

  // --- United States ------------------------------------------------------
  {
    id: 'npr-news',
    name: 'NPR',
    scope: 'us',
    category: 'general',
    feedUrl: 'https://feeds.npr.org/1001/rss.xml',
    language: 'en',
  },
  {
    id: 'nyt-home',
    name: 'The New York Times',
    scope: 'us',
    category: 'general',
    feedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    language: 'en',
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    scope: 'us',
    category: 'technology',
    feedUrl: 'https://www.theverge.com/rss/index.xml',
    language: 'en',
  },
  {
    id: 'espn',
    name: 'ESPN',
    scope: 'us',
    category: 'sports',
    feedUrl: 'https://www.espn.com/espn/rss/news',
    language: 'en',
  },

  // --- United Kingdom -----------------------------------------------------
  {
    id: 'bbc-uk',
    name: 'BBC News UK',
    scope: 'gb',
    category: 'general',
    feedUrl: 'https://feeds.bbci.co.uk/news/uk/rss.xml',
    language: 'en',
  },
  {
    id: 'guardian-uk',
    name: 'The Guardian UK',
    scope: 'gb',
    category: 'general',
    feedUrl: 'https://www.theguardian.com/uk/rss',
    language: 'en',
  },
  {
    id: 'sky-news',
    name: 'Sky News',
    scope: 'gb',
    category: 'general',
    feedUrl: 'https://feeds.skynews.com/feeds/rss/home.xml',
    language: 'en',
  },
  {
    id: 'independent-uk',
    name: 'The Independent',
    scope: 'gb',
    category: 'general',
    feedUrl: 'https://www.independent.co.uk/news/uk/rss',
    language: 'en',
  },

  // --- Germany ------------------------------------------------------------
  {
    id: 'tagesschau',
    name: 'Tagesschau',
    scope: 'de',
    category: 'general',
    feedUrl: 'https://www.tagesschau.de/xml/rss2',
    language: 'de',
  },
  {
    id: 'spiegel',
    name: 'Der Spiegel',
    scope: 'de',
    category: 'general',
    feedUrl: 'https://www.spiegel.de/schlagzeilen/tops/index.rss',
    language: 'de',
  },
  {
    id: 'zeit',
    name: 'Die Zeit',
    scope: 'de',
    category: 'general',
    feedUrl: 'https://newsfeed.zeit.de/index',
    language: 'de',
  },
  {
    id: 'dw-de',
    name: 'Deutsche Welle',
    scope: 'de',
    category: 'general',
    feedUrl: 'https://rss.dw.com/rdf/rss-de-all',
    language: 'de',
  },

  // --- France -------------------------------------------------------------
  {
    id: 'lemonde',
    name: 'Le Monde',
    scope: 'fr',
    category: 'general',
    feedUrl: 'https://www.lemonde.fr/rss/une.xml',
    language: 'fr',
  },
  {
    id: 'france24-fr',
    name: 'France 24',
    scope: 'fr',
    category: 'general',
    feedUrl: 'https://www.france24.com/fr/rss',
    language: 'fr',
  },
  {
    id: 'lefigaro',
    name: 'Le Figaro',
    scope: 'fr',
    category: 'general',
    feedUrl: 'https://www.lefigaro.fr/rss/figaro_actualites.xml',
    language: 'fr',
  },
  {
    id: 'liberation',
    name: 'Libération',
    scope: 'fr',
    category: 'general',
    feedUrl: 'https://www.liberation.fr/arc/outboundfeeds/rss/?outputType=xml',
    language: 'fr',
  },

  // --- Spain --------------------------------------------------------------
  {
    id: 'elpais',
    name: 'El País',
    scope: 'es',
    category: 'general',
    feedUrl: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',
    language: 'es',
  },
  {
    id: 'elmundo',
    name: 'El Mundo',
    scope: 'es',
    category: 'general',
    feedUrl: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml',
    language: 'es',
  },
  {
    id: 'rtve',
    name: 'RTVE',
    scope: 'es',
    category: 'general',
    feedUrl: 'https://api2.rtve.es/rss/temas_noticias.xml',
    language: 'es',
  },

  // --- Italy --------------------------------------------------------------
  {
    id: 'ansa',
    name: 'ANSA',
    scope: 'it',
    category: 'agency',
    feedUrl: 'https://www.ansa.it/sito/ansait_rss.xml',
    language: 'it',
  },
  {
    id: 'repubblica',
    name: 'la Repubblica',
    scope: 'it',
    category: 'general',
    feedUrl: 'https://www.repubblica.it/rss/homepage/rss2.0.xml',
    language: 'it',
  },
  {
    id: 'corriere',
    name: 'Corriere della Sera',
    scope: 'it',
    category: 'general',
    feedUrl: 'https://xml2.corriereobjects.it/rss/homepage.xml',
    language: 'it',
  },

  // --- Netherlands --------------------------------------------------------
  {
    id: 'nos',
    name: 'NOS',
    scope: 'nl',
    category: 'general',
    feedUrl: 'https://feeds.nos.nl/nosnieuwsalgemeen',
    language: 'nl',
  },
  {
    id: 'nu-nl',
    name: 'NU.nl',
    scope: 'nl',
    category: 'general',
    feedUrl: 'https://www.nu.nl/rss/Algemeen',
    language: 'nl',
  },

  // --- India --------------------------------------------------------------
  {
    id: 'toi',
    name: 'The Times of India',
    scope: 'in',
    category: 'general',
    feedUrl: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    language: 'en',
  },
  {
    id: 'thehindu',
    name: 'The Hindu',
    scope: 'in',
    category: 'general',
    feedUrl: 'https://www.thehindu.com/news/national/feeder/default.rss',
    language: 'en',
  },
  {
    id: 'ndtv',
    name: 'NDTV',
    scope: 'in',
    category: 'general',
    feedUrl: 'https://feeds.feedburner.com/ndtvnews-top-stories',
    language: 'en',
  },

  // --- Japan --------------------------------------------------------------
  {
    id: 'nhk-world',
    name: 'NHK World',
    scope: 'jp',
    category: 'general',
    feedUrl: 'https://www3.nhk.or.jp/nhkworld/en/news/feeds/rss/all.xml',
    language: 'en',
  },
  {
    id: 'japantimes',
    name: 'The Japan Times',
    scope: 'jp',
    category: 'general',
    feedUrl: 'https://www.japantimes.co.jp/feed/',
    language: 'en',
  },

  // --- Brazil -------------------------------------------------------------
  {
    id: 'g1',
    name: 'G1',
    scope: 'br',
    category: 'general',
    feedUrl: 'https://g1.globo.com/rss/g1/',
    language: 'pt',
  },
  {
    id: 'folha',
    name: 'Folha de S.Paulo',
    scope: 'br',
    category: 'general',
    feedUrl: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',
    language: 'pt',
  },

  // --- Canada -------------------------------------------------------------
  {
    id: 'cbc',
    name: 'CBC News',
    scope: 'ca',
    category: 'general',
    feedUrl: 'https://www.cbc.ca/webfeed/rss/rss-topstories',
    language: 'en',
  },
  {
    id: 'globeandmail',
    name: 'The Globe and Mail',
    scope: 'ca',
    category: 'general',
    feedUrl: 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/',
    language: 'en',
  },

  // --- Australia ----------------------------------------------------------
  {
    id: 'abc-au',
    name: 'ABC News',
    scope: 'au',
    category: 'general',
    feedUrl: 'https://www.abc.net.au/news/feed/2942460/rss.xml',
    language: 'en',
  },
  {
    id: 'smh',
    name: 'The Sydney Morning Herald',
    scope: 'au',
    category: 'general',
    feedUrl: 'https://www.smh.com.au/rss/feed.xml',
    language: 'en',
  },

  // --- Worldwide ----------------------------------------------------------
  {
    id: 'bbc-world',
    name: 'BBC World',
    scope: 'world',
    category: 'general',
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    language: 'en',
  },
  {
    id: 'aljazeera',
    name: 'Al Jazeera',
    scope: 'world',
    category: 'general',
    feedUrl: 'https://www.aljazeera.com/xml/rss/all.xml',
    language: 'en',
  },
  {
    id: 'guardian-world',
    name: 'The Guardian World',
    scope: 'world',
    category: 'general',
    feedUrl: 'https://www.theguardian.com/world/rss',
    language: 'en',
  },
  {
    id: 'npr-world',
    name: 'NPR World',
    scope: 'world',
    category: 'general',
    feedUrl: 'https://feeds.npr.org/1004/rss.xml',
    language: 'en',
  },
  {
    id: 'dw-world',
    name: 'Deutsche Welle World',
    scope: 'world',
    category: 'general',
    feedUrl: 'https://rss.dw.com/rdf/rss-en-world',
    language: 'en',
  },
  {
    id: 'france24',
    name: 'France 24 English',
    scope: 'world',
    category: 'general',
    feedUrl: 'https://www.france24.com/en/rss',
    language: 'en',
  },
  {
    id: 'euronews',
    name: 'Euronews',
    scope: 'world',
    category: 'general',
    feedUrl: 'https://www.euronews.com/rss?level=theme&name=news',
    language: 'en',
  },
  {
    id: 'reuters-agency',
    name: 'Reuters Agency',
    scope: 'world',
    category: 'agency',
    feedUrl: 'https://www.reutersagency.com/feed/?best-topics=business-finance',
    language: 'en',
  },
  {
    id: 'cnbc-world',
    name: 'CNBC',
    scope: 'world',
    category: 'business',
    feedUrl: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362',
    language: 'en',
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    scope: 'world',
    category: 'technology',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    language: 'en',
  },
];

export const CATEGORY_LABELS: Record<NewsSource['category'], string> = {
  general: 'General',
  agency: 'Agency',
  business: 'Business',
  technology: 'Technology',
  sports: 'Sports',
};

/**
 * The sources a given scope selection covers.
 * - `country` — just the selected country
 * - `world`   — just the international feeds
 * - `all`     — the selected country plus the international feeds, and
 *               deliberately not every other country, so "All" stays a
 *               readable timeline rather than 50 feeds at once
 */
export function sourcesForScope(
  sources: NewsSource[],
  mode: ScopeMode,
  country: CountryCode,
): NewsSource[] {
  return sources.filter((source) => {
    switch (mode) {
      case 'country':
        return source.scope === country;
      case 'world':
        return source.scope === 'world';
      case 'all':
        return source.scope === country || source.scope === 'world';
    }
  });
}
