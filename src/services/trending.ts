import type { Article } from '../types';

/**
 * What is big right now.
 *
 * There is no view counter to read: publishers do not put "most read" in their
 * RSS, and this app has no backend to collect one. What the feed does know is
 * how many independent newsrooms are running the same story at the same time,
 * which is the signal an editor actually watches. A term carried by six sources
 * in the last few hours is the day's story; one carried by a single source is
 * that source's story. So topics are ranked by distinct sources first, and the
 * UI says "N kaynak" rather than claiming a view count it does not have.
 *
 * Everything here is computed from articles already fetched, so the section
 * costs no extra network and works exactly as well offline as the feed does.
 */

/** Words too common to mean anything, across the languages the app carries. */
const STOPWORDS = new Set([
  // Turkish
  've', 'ile', 'için', 'bir', 'bu', 'şu', 'o', 'da', 'de', 'ki', 'mi', 'mı', 'mu', 'ne',
  'ama', 'çok', 'daha', 'en', 'gibi', 'kadar', 'sonra', 'önce', 'olarak', 'var', 'yok',
  'oldu', 'olan', 'dedi', 'diyor', 'açıkladı', 'son', 'dakika', 'yeni', 'büyük', 'ilk',
  'karar', 'açıklama', 'haber', 'canlı', 'video', 'foto', 'galeri', 'üzere', 'göre',
  'kim', 'nasıl', 'neden', 'hangi', 'yılında', 'yıl', 'gün', 'saat', 'bugün', 'dün',
  // English
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'for', 'to', 'with', 'from',
  'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'will',
  'would', 'can', 'could', 'says', 'said', 'new', 'live', 'watch', 'video', 'photos',
  'how', 'why', 'what', 'who', 'when', 'where', 'his', 'her', 'their', 'its', 'this',
  'that', 'these', 'those', 'not', 'but', 'over', 'after', 'before', 'more', 'most',
  'first', 'latest', 'update', 'updates', 'report', 'reports', 'you', 'your', 'we',
]);

/**
 * Turkish verb inflections.
 *
 * Turkish glues tense and person onto the verb, so a headline's most repeated
 * word is often a conjugation rather than a subject: four unrelated stories —
 * a volcano, Gaza, a governor, a road — all end clauses with "ediyor", and
 * grouping on it produces a topic that means nothing. No stopword list can hold
 * every inflected form, so the endings themselves are matched.
 *
 * A word that appears capitalised mid-headline is exempt: "Parti" ends like a
 * past-tense verb but is part of a party's name.
 */
const VERB_ENDINGS =
  /(?:[ıiuü]yor|[ae]c[ae][kğ]|m[ıiuü]ş|[aeıioöuü lnrktpşçsz]d[ıiuü]|[lnrktpşçsz]t[ıiuü]|m(?:ak|ek|aya|eye|akta|ekte)|[ae]rek|[ae]l[ıi]m)$/u;

const MIN_TERM_LENGTH = 4;
/** Below this, a word is too short for the ending rules to judge safely. */
const MIN_VERB_CHECK_LENGTH = 5;
/** A story is only trending if more than one newsroom is carrying it. */
const MIN_SOURCES = 2;
/**
 * A word in more than this share of the feed is vocabulary, not news. Only
 * applied once there are enough articles for the ratio to mean anything.
 */
const MAX_DOCUMENT_SHARE = 0.25;
const MIN_ARTICLES_FOR_SHARE = 20;

export interface TrendingTopic {
  /** Folded term the topic was found by — stable enough to use as a list key. */
  key: string;
  /** How it is shown: the most common surface form across the headlines. */
  label: string;
  /** Matching articles, newest first. */
  articles: Article[];
  /** Distinct sources carrying it — the ranking signal. */
  sourceCount: number;
}

/** Turkish-aware folding, so `İSTANBUL` and `istanbul` are one term. */
function fold(value: string): string {
  return value.toLocaleLowerCase('tr');
}

/** True for a word that starts with an upper-case letter in a cased script. */
function isCapitalized(word: string): boolean {
  const first = word[0];
  return first.toLocaleUpperCase('tr') === first && first.toLocaleLowerCase('tr') !== first;
}

function tokenize(title: string): string[] {
  return title
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= MIN_TERM_LENGTH)
    .filter((word) => !/^\d+$/.test(word));
}

export interface TrendingOptions {
  /** Articles older than this are ignored. Defaults to 24 hours. */
  windowMs?: number;
  /** How many topics to return. */
  limit?: number;
  now?: number;
  /** Source names, so "Habertürk" in a headline is not mistaken for a topic. */
  excludeTerms?: string[];
}

/**
 * Groups the feed into the stories several sources are running at once.
 *
 * Topics are chosen greedily: the strongest term takes its articles with it, so
 * a story covered under two related words ("Gazze", "İsrail") surfaces once
 * rather than twice with the same headlines underneath.
 */
/**
 * Names a topic the way a reader would.
 *
 * Turkish glues suffixes onto words, so the winning token is often a fragment:
 * the story about the central bank ranks on "Bankası", which reads as nothing
 * on its own. When the same two words sit together across the coverage —
 * "Merkez Bankası", "asgari ücret" — that pair is the better name, so the
 * headlines are checked for a shared phrase before falling back to the token.
 */
function bestPhrase(key: string, articles: Article[]): { surface: string; count: number } | null {
  const phrases = new Map<string, { count: number; surface: string }>();

  for (const article of articles) {
    const words = tokenize(article.title);

    for (let i = 0; i < words.length - 1; i += 1) {
      const pair = [words[i], words[i + 1]];
      const folded = pair.map(fold);
      if (!folded.includes(key)) continue;
      if (folded.some((word) => STOPWORDS.has(word))) continue;

      const phraseKey = folded.join(' ');
      const entry = phrases.get(phraseKey);
      if (entry) entry.count += 1;
      else phrases.set(phraseKey, { count: 1, surface: pair.join(' ') });
    }
  }

  const best = [...phrases.values()].sort((a, b) => b.count - a.count)[0];
  // One article using a phrase is a coincidence; two or more is the story's name.
  return best && best.count >= 2 ? best : null;
}

function mostCommonForm(forms: Map<string, number>): string {
  return [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function findTrendingTopics(
  articles: Article[],
  options: TrendingOptions = {},
): TrendingTopic[] {
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs ?? 24 * 60 * 60 * 1000;
  const limit = options.limit ?? 8;
  const excluded = new Set((options.excludeTerms ?? []).flatMap((term) => tokenize(term).map(fold)));

  // An undated article is kept: a feed with no timestamps should still trend.
  const recent = articles.filter(
    (article) => !article.publishedAt || now - article.publishedAt <= windowMs,
  );

  const byTerm = new Map<
    string,
    {
      articles: Article[];
      sources: Set<string>;
      forms: Map<string, number>;
      properHits: number;
      capitalHits: number;
    }
  >();

  for (const article of recent) {
    // One count per term per article, however often the word repeats.
    const seen = new Set<string>();
    const words = tokenize(article.title);

    for (const [index, word] of words.entries()) {
      const key = fold(word);
      if (seen.has(key) || STOPWORDS.has(key) || excluded.has(key)) continue;
      seen.add(key);

      let entry = byTerm.get(key);
      if (!entry) {
        entry = { articles: [], sources: new Set(), forms: new Map(), properHits: 0, capitalHits: 0 };
        byTerm.set(key, entry);
      }

      entry.articles.push(article);
      entry.sources.add(article.sourceId);
      entry.forms.set(word, (entry.forms.get(word) ?? 0) + 1);
      if (isCapitalized(word)) {
        entry.capitalHits += 1;
        // Capitalised anywhere but the first word: a name, not a sentence start.
        if (index > 0) entry.properHits += 1;
      }
    }
  }

  const shareCap = recent.length >= MIN_ARTICLES_FOR_SHARE ? recent.length * MAX_DOCUMENT_SHARE : Infinity;

  const ranked = [...byTerm.entries()]
    .filter(([key, entry]) => {
      if (entry.sources.size < MIN_SOURCES) return false;
      if (entry.articles.length > shareCap) return false;
      // Names are exempt; everything else has to not look like a conjugation.
      if (entry.properHits > 0) return true;
      return !(key.length >= MIN_VERB_CHECK_LENGTH && VERB_ENDINGS.test(key));
    })
    .sort((a, b) => {
      const bySources = b[1].sources.size - a[1].sources.size;
      if (bySources !== 0) return bySources;
      const byArticles = b[1].articles.length - a[1].articles.length;
      if (byArticles !== 0) return byArticles;
      return a[0].localeCompare(b[0], 'tr');
    });

  const topics: TrendingTopic[] = [];
  const claimed = new Set<string>();

  for (const [key, entry] of ranked) {
    if (topics.length >= limit) break;

    const fresh = entry.articles.filter((article) => !claimed.has(article.id));
    // Once a story's articles belong to an earlier topic, the term is a synonym
    // of it rather than a topic of its own.
    const freshSources = new Set(fresh.map((article) => article.sourceId));
    if (freshSources.size < MIN_SOURCES) continue;

    const phrase = bestPhrase(key, fresh);

    // A word never written with a capital is ordinary vocabulary — "evinde",
    // "yaptığı" — unless the coverage repeats it as part of the same phrase.
    // Names and sentence-openers get in on their capital alone.
    if (entry.capitalHits === 0 && !phrase) continue;

    for (const article of fresh) claimed.add(article.id);

    topics.push({
      key,
      label: phrase ? phrase.surface : mostCommonForm(entry.forms),
      articles: [...fresh].sort((a, b) => b.publishedAt - a.publishedAt),
      sourceCount: freshSources.size,
    });
  }

  return topics;
}
