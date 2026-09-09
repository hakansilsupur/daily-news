import type { LanguageFilter, Region, RegionFilter, SourceCategory, UiLanguage, UiLanguagePreference } from '../types';

/** Reasons `addCustomSource` can reject a feed, mapped to text per language. */
export type AddSourceError = 'name-required' | 'invalid-url' | 'duplicate';

/** Reasons a pinned tab cannot be saved. */
export type FeedTabError = 'name-required' | 'no-sources';

/**
 * Every user-visible string in the app. Keeping it one flat interface means a
 * missing or misspelled translation is a type error, not a blank label.
 */
export interface Strings {
  tabHeadlines: string;
  tabSaved: string;

  feedTitle: string;
  /** e.g. "8 of 11 sources" */
  sourceCount: (active: number, total: number) => string;
  /** Appended to the source count once a fetch has landed. */
  updatedSuffix: (relativeTime: string) => string;
  searchPlaceholder: string;
  filterSourcesLabel: string;
  clearSearchLabel: string;
  sourcesUnreachable: (count: number) => string;
  fetchingFeeds: string;

  noSourcesTitle: string;
  noSourcesMessage: string;
  chooseSources: string;
  noMatchesTitle: string;
  noMatchesMessage: (query: string) => string;
  nothingToShowTitle: string;
  nothingToShowMessage: string;

  savedTitle: string;
  savedCount: (count: number) => string;
  nothingSavedTitle: string;
  nothingSavedMessage: string;
  saveArticleLabel: string;
  removeSavedLabel: string;

  sheetTitle: string;
  closeLabel: string;
  selectAll: string;
  clear: string;
  unavailable: (reason: string) => string;
  removeSourceLabel: (name: string) => string;
  addFeedGroup: string;
  sourceNamePlaceholder: string;
  feedUrlPlaceholder: string;
  addSource: string;
  addSourceError: Record<AddSourceError, string>;

  allTab: string;
  addTab: string;
  newTabTitle: string;
  editTabTitle: string;
  tabNamePlaceholder: string;
  tabPickSources: string;
  tabSelectedCount: (count: number) => string;
  saveTab: string;
  deleteTab: string;
  deleteTabConfirm: (name: string) => string;
  cancel: string;
  delete: string;
  editTabHint: string;
  emptyTabTitle: string;
  emptyTabMessage: string;
  editTabAction: string;
  feedTabError: Record<FeedTabError, string>;

  languageGroup: string;
  interfaceLanguage: string;
  feedLanguage: string;
  uiLanguageOption: Record<UiLanguagePreference, string>;

  regionFilter: Record<RegionFilter, string>;
  languageFilterOption: Record<LanguageFilter, string>;
  regionLabel: Record<Region, string>;
  categoryLabel: Record<SourceCategory, string>;

  justNow: string;
  minutesAgo: (minutes: number) => string;
  hoursAgo: (hours: number) => string;
  daysAgo: (days: number) => string;
}

const en: Strings = {
  tabHeadlines: 'Headlines',
  tabSaved: 'Saved',

  feedTitle: 'Headlines',
  sourceCount: (active, total) => `${active} of ${total} sources`,
  updatedSuffix: (relativeTime) => ` · updated ${relativeTime}`,
  searchPlaceholder: 'Search headlines',
  filterSourcesLabel: 'Filter sources',
  clearSearchLabel: 'Clear search',
  sourcesUnreachable: (count) =>
    count === 1 ? '1 source could not be reached.' : `${count} sources could not be reached.`,
  fetchingFeeds: 'Fetching feeds…',

  noSourcesTitle: 'No sources selected',
  noSourcesMessage: 'Turn on at least one source to start seeing headlines.',
  chooseSources: 'Choose sources',
  noMatchesTitle: 'No matches',
  noMatchesMessage: (query) => `Nothing in the current feed matches “${query}”.`,
  nothingToShowTitle: 'Nothing to show',
  nothingToShowMessage: 'The selected feeds returned no articles. Pull down to try again.',

  savedTitle: 'Saved',
  savedCount: (count) =>
    count === 1 ? '1 article kept on this device' : `${count} articles kept on this device`,
  nothingSavedTitle: 'Nothing saved yet',
  nothingSavedMessage: 'Tap the bookmark on any headline to keep it here for later.',
  saveArticleLabel: 'Save article',
  removeSavedLabel: 'Remove from saved',

  sheetTitle: 'Sources',
  closeLabel: 'Close',
  selectAll: 'Select all',
  clear: 'Clear',
  unavailable: (reason) => `Unavailable — ${reason}`,
  removeSourceLabel: (name) => `Remove ${name}`,
  addFeedGroup: 'ADD A FEED',
  sourceNamePlaceholder: 'Source name',
  feedUrlPlaceholder: 'https://example.com/rss',
  addSource: 'Add source',
  addSourceError: {
    'name-required': 'Give the source a name.',
    'invalid-url': 'Enter a full feed URL starting with http(s)://.',
    duplicate: 'That feed is already in your list.',
  },

  allTab: 'All',
  addTab: 'Add',
  newTabTitle: 'New tab',
  editTabTitle: 'Edit tab',
  tabNamePlaceholder: 'Tab name — e.g. Science',
  tabPickSources: 'SOURCES IN THIS TAB',
  tabSelectedCount: (count) => (count === 1 ? '1 source selected' : `${count} sources selected`),
  saveTab: 'Save tab',
  deleteTab: 'Delete tab',
  deleteTabConfirm: (name) => `Delete “${name}”? The sources themselves stay.`,
  cancel: 'Cancel',
  delete: 'Delete',
  editTabHint: 'Long-press a tab to edit or delete it.',
  emptyTabTitle: 'This tab is empty',
  emptyTabMessage: 'Every source pinned to this tab is gone. Edit it to pick new ones.',
  editTabAction: 'Edit tab',
  feedTabError: {
    'name-required': 'Give the tab a name.',
    'no-sources': 'Pick at least one source.',
  },

  languageGroup: 'LANGUAGE',
  interfaceLanguage: 'App language',
  feedLanguage: 'Show feeds in',
  uiLanguageOption: {
    system: 'System',
    tr: 'Türkçe',
    en: 'English',
  },

  regionFilter: {
    all: 'All',
    turkey: 'Türkiye',
    world: 'Worldwide',
  },
  languageFilterOption: {
    all: 'All languages',
    tr: 'Türkçe',
    en: 'English',
  },
  regionLabel: {
    turkey: 'Türkiye',
    world: 'Worldwide',
  },
  categoryLabel: {
    general: 'General',
    agency: 'Agency',
    business: 'Business',
    technology: 'Technology',
    sports: 'Sports',
  },

  justNow: 'just now',
  minutesAgo: (minutes) => `${minutes}m ago`,
  hoursAgo: (hours) => `${hours}h ago`,
  daysAgo: (days) => `${days}d ago`,
};

const tr: Strings = {
  tabHeadlines: 'Haberler',
  tabSaved: 'Kaydedilenler',

  feedTitle: 'Haberler',
  sourceCount: (active, total) => `${total} kaynaktan ${active} tanesi`,
  updatedSuffix: (relativeTime) => ` · ${relativeTime} güncellendi`,
  searchPlaceholder: 'Haberlerde ara',
  filterSourcesLabel: 'Kaynakları filtrele',
  clearSearchLabel: 'Aramayı temizle',
  sourcesUnreachable: (count) => `${count} kaynağa ulaşılamadı.`,
  fetchingFeeds: 'Akışlar alınıyor…',

  noSourcesTitle: 'Kaynak seçilmedi',
  noSourcesMessage: 'Haberleri görmek için en az bir kaynağı açın.',
  chooseSources: 'Kaynakları seç',
  noMatchesTitle: 'Sonuç yok',
  noMatchesMessage: (query) => `Mevcut akışta “${query}” ile eşleşen bir şey yok.`,
  nothingToShowTitle: 'Gösterilecek bir şey yok',
  nothingToShowMessage: 'Seçili akışlardan haber gelmedi. Yenilemek için aşağı çekin.',

  savedTitle: 'Kaydedilenler',
  savedCount: (count) => `Bu cihazda ${count} haber saklanıyor`,
  nothingSavedTitle: 'Henüz kayıt yok',
  nothingSavedMessage: 'Sonra okumak için herhangi bir haberdeki yer imine dokunun.',
  saveArticleLabel: 'Haberi kaydet',
  removeSavedLabel: 'Kayıtlardan çıkar',

  sheetTitle: 'Kaynaklar',
  closeLabel: 'Kapat',
  selectAll: 'Tümünü seç',
  clear: 'Temizle',
  unavailable: (reason) => `Ulaşılamadı — ${reason}`,
  removeSourceLabel: (name) => `${name} kaynağını sil`,
  addFeedGroup: 'AKIŞ EKLE',
  sourceNamePlaceholder: 'Kaynak adı',
  feedUrlPlaceholder: 'https://ornek.com/rss',
  addSource: 'Kaynak ekle',
  addSourceError: {
    'name-required': 'Kaynağa bir ad verin.',
    'invalid-url': 'http(s):// ile başlayan tam bir akış adresi girin.',
    duplicate: 'Bu akış zaten listenizde.',
  },

  allTab: 'Tümü',
  addTab: 'Ekle',
  newTabTitle: 'Yeni sekme',
  editTabTitle: 'Sekmeyi düzenle',
  tabNamePlaceholder: 'Sekme adı — örn. Bilim',
  tabPickSources: 'BU SEKMEDEKİ KAYNAKLAR',
  tabSelectedCount: (count) => `${count} kaynak seçildi`,
  saveTab: 'Sekmeyi kaydet',
  deleteTab: 'Sekmeyi sil',
  deleteTabConfirm: (name) => `“${name}” silinsin mi? Kaynaklar listenizde kalır.`,
  cancel: 'Vazgeç',
  delete: 'Sil',
  editTabHint: 'Düzenlemek veya silmek için sekmeye uzun basın.',
  emptyTabTitle: 'Bu sekme boş',
  emptyTabMessage: 'Bu sekmeye eklenen kaynaklar kalmamış. Düzenleyip yeniden seçin.',
  editTabAction: 'Sekmeyi düzenle',
  feedTabError: {
    'name-required': 'Sekmeye bir ad verin.',
    'no-sources': 'En az bir kaynak seçin.',
  },

  languageGroup: 'DİL',
  interfaceLanguage: 'Uygulama dili',
  feedLanguage: 'Akış dili',
  uiLanguageOption: {
    system: 'Sistem',
    tr: 'Türkçe',
    en: 'English',
  },

  regionFilter: {
    all: 'Tümü',
    turkey: 'Türkiye',
    world: 'Dünya',
  },
  languageFilterOption: {
    all: 'Tüm diller',
    tr: 'Türkçe',
    en: 'İngilizce',
  },
  regionLabel: {
    turkey: 'Türkiye',
    world: 'Dünya',
  },
  categoryLabel: {
    general: 'Genel',
    agency: 'Ajans',
    business: 'Ekonomi',
    technology: 'Teknoloji',
    sports: 'Spor',
  },

  justNow: 'az önce',
  minutesAgo: (minutes) => `${minutes} dk önce`,
  hoursAgo: (hours) => `${hours} saat önce`,
  daysAgo: (days) => `${days} gün önce`,
};

export const STRINGS: Record<UiLanguage, Strings> = { en, tr };
