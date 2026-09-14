import type { SourceLanguage, TranslationLanguage } from '../types';

/**
 * Preview translation.
 *
 * Headlines and summaries are machine-translated into the chosen translation
 * language — Türkçe unless the user picks otherwise — so a feed in a language
 * they do not read is still skimmable. Only the preview is translated: opening
 * an article goes to the publisher in the original.
 *
 * This uses the public translate endpoint: no API key, no account and no
 * backend, which keeps the app's "nothing to sign up for" property. It is an
 * unofficial endpoint, so every call is treated as best-effort: a failure or a
 * throttle leaves the original text on screen rather than surfacing an error.
 */
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TIMEOUT_MS = 8000;
const MAX_CONCURRENT = 2;
/** Minimum spacing between requests, so a screenful does not arrive as a burst. */
const MIN_REQUEST_GAP_MS = 200;
/** How long to stop asking after being throttled, doubling while it persists. */
const COOLDOWN_MS = 60_000;
const COOLDOWN_MAX_MS = 15 * 60_000;
/** Anything longer is truncated; the endpoint rejects very long queries. */
const MAX_CHARS = 900;

/**
 * The response is a nested array whose first element holds the translated
 * segments: [[["merhaba","hello",…],["dünya"," world",…]],…]. Segments are the
 * engine's own sentence split, so they are concatenated back verbatim.
 */
export function parseTranslateResponse(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) return null;

  const segments = parsed[0]
    .filter((segment): segment is unknown[] => Array.isArray(segment))
    .map((segment) => (typeof segment[0] === 'string' ? segment[0] : ''));

  const text = segments.join('');
  return text.trim() ? text : null;
}

/**
 * Fallback engine, used only when the primary endpoint declines (it throttles
 * by IP, so a shared network can hit its limit). MyMemory needs an explicit
 * source language and caps anonymous queries at roughly 500 characters, so it
 * is offered only the headline and only when the source language is known.
 */
const FALLBACK_ENDPOINT = 'https://api.mymemory.translated.net/get';
const FALLBACK_MAX_CHARS = 480;

export function buildFallbackUrl(
  text: string,
  target: TranslationLanguage,
  source: SourceLanguage,
): string {
  const params = new URLSearchParams({
    q: text.slice(0, FALLBACK_MAX_CHARS),
    langpair: `${source}|${target}`,
  });
  return `${FALLBACK_ENDPOINT}?${params.toString()}`;
}

export function parseFallbackResponse(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as {
      responseStatus?: number | string;
      responseData?: { translatedText?: unknown };
    };

    const status = Number(parsed.responseStatus);
    if (status && status !== 200) return null;

    const text = parsed.responseData?.translatedText;
    if (typeof text !== 'string' || !text.trim()) return null;
    // The service reports quota problems as translated text; never show that.
    if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(text)) return null;

    return text;
  } catch {
    return null;
  }
}

export function buildTranslateUrl(text: string, target: TranslationLanguage, source = 'auto'): string {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: source,
    tl: target,
    dt: 't',
    q: text.slice(0, MAX_CHARS),
  });
  return `${ENDPOINT}?${params.toString()}`;
}

/** Nothing to do when the text is already in the target language, or is empty. */
export function needsTranslation(
  sourceLanguage: SourceLanguage | undefined,
  target: TranslationLanguage,
  text: string,
): boolean {
  if (!text.trim()) return false;
  return sourceLanguage !== target;
}

/**
 * Throttle state.
 *
 * The endpoint answers a burst with `429` and an HTML page rather than a
 * translation. Hammering it then only extends the block, and every card in view
 * fails at once — which is what a hundred fresh articles arriving together (say,
 * after switching country) would otherwise cause. So a refusal starts a
 * cooldown, doubling while it persists, during which nothing is sent at all.
 */
let cooldownUntil = 0;
let cooldownStreak = 0;

/** Lets the feed say it is waiting rather than looking like the feature broke. */
const listeners = new Set<() => void>();

export function subscribeThrottle(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitThrottleChange(): void {
  for (const listener of listeners) listener();
}

export function isThrottled(now: number = Date.now()): boolean {
  return now < cooldownUntil;
}

/** Milliseconds until it is worth trying again. */
export function throttleRetryDelay(now: number = Date.now()): number {
  return Math.max(0, cooldownUntil - now);
}

export function noteThrottled(now: number = Date.now()): void {
  cooldownStreak += 1;
  cooldownUntil = now + Math.min(COOLDOWN_MS * 2 ** (cooldownStreak - 1), COOLDOWN_MAX_MS);
  emitThrottleChange();
}

export function noteTranslationSuccess(): void {
  const wasThrottled = cooldownUntil !== 0;
  cooldownStreak = 0;
  cooldownUntil = 0;
  if (wasThrottled) emitThrottleChange();
}

/** Clears the cooldown and its backoff — for tests, and a future manual retry. */
export const resetThrottle = noteTranslationSuccess;

/** A refusal page, rather than a translation that happened to be unparseable. */
export function looksThrottled(body: string): boolean {
  return /<html|We're sorry|unusual traffic|automated queries/i.test(body);
}

let active = 0;
let lastStart = 0;
const waiting: (() => void)[] = [];

/** Keeps the endpoint to a couple of requests at a time, evenly spaced. */
async function withSlot<T>(run: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active += 1;

  try {
    const gap = lastStart + MIN_REQUEST_GAP_MS - Date.now();
    if (gap > 0) await new Promise((resolve) => setTimeout(resolve, gap));
    lastStart = Date.now();
    return await run();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

async function requestTranslation(
  text: string,
  target: TranslationLanguage,
  signal?: AbortSignal,
): Promise<string | null> {
  if (isThrottled()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(buildTranslateUrl(text, target), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      // 429 is the usual one, but any refusal means backing off beats retrying.
      noteThrottled();
      return null;
    }

    const body = await response.text();
    const translated = parseTranslateResponse(body);
    if (translated) {
      noteTranslationSuccess();
      return translated;
    }

    if (looksThrottled(body)) noteThrottled();
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function requestFallback(
  text: string,
  target: TranslationLanguage,
  source: SourceLanguage,
  signal?: AbortSignal,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(buildFallbackUrl(text, target, source), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return parseFallbackResponse(await response.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface TranslatedPreview {
  title: string;
  summary: string;
}

/** Separator used to translate a card's title and summary in one request. */
const JOINER = '\n';

/**
 * Translates one card.
 *
 * Title and summary go in a single request, joined by a newline the engine
 * usually preserves — usually, not always. When it comes back fused, the two
 * fields cannot be told apart, so they are re-requested separately rather than
 * guessed at; that costs two extra calls, but only for the minority of cards
 * that need it. Sending both fields separately every time was worse: it doubled
 * the request volume against an endpoint that throttles by IP, which is enough
 * to turn a whole screen untranslated.
 */
export async function translatePreview(
  preview: TranslatedPreview,
  target: TranslationLanguage,
  sourceLanguage?: SourceLanguage,
  signal?: AbortSignal,
): Promise<TranslatedPreview | null> {
  const title = preview.title.trim();
  const summary = preview.summary.trim();
  if (!title && !summary) return null;

  const joined = summary ? `${title}${JOINER}${summary}` : title;
  const translated = await withSlot(() => requestTranslation(joined, target, signal));

  if (!translated) {
    // Primary engine unavailable: fall back to a headline-only translation.
    if (!title || !sourceLanguage || sourceLanguage === target) return null;
    const fallback = await withSlot(() => requestFallback(title, target, sourceLanguage, signal));
    return fallback ? { title: fallback.trim(), summary: '' } : null;
  }

  if (!summary) return { title: translated.trim(), summary: '' };

  const cut = translated.indexOf(JOINER);
  if (cut !== -1) {
    return {
      title: translated.slice(0, cut).trim(),
      summary: translated.slice(cut + JOINER.length).trim(),
    };
  }

  // Fused: the response holds both fields with no way back. Ask again, one
  // field at a time, rather than showing the summary text inside the headline.
  const [retriedTitle, retriedSummary] = await Promise.all([
    withSlot(() => requestTranslation(title, target, signal)),
    withSlot(() => requestTranslation(summary, target, signal)),
  ]);

  // Nothing usable: leave it untranslated so the card can try again later.
  if (!retriedTitle) return null;
  return { title: retriedTitle.trim(), summary: retriedSummary?.trim() ?? '' };
}

export function cacheKey(articleId: string, target: TranslationLanguage): string {
  return `${target}:${articleId}`;
}
