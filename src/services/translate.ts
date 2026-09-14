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
const MAX_CONCURRENT = 3;
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

let active = 0;
const waiting: (() => void)[] = [];

/** Keeps the endpoint to a few requests at a time, so a fast scroll cannot flood it. */
async function withSlot<T>(run: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active += 1;

  try {
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(buildTranslateUrl(text, target), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return parseTranslateResponse(await response.text());
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

/** Separator used to translate a card's title and summary in a single request. */
const JOINER = '\n';

export interface TranslatedPreview {
  title: string;
  summary: string;
}

/**
 * Translates one card. Title and summary go in a single request — two fields
 * per article would double the traffic for no benefit — and the result is split
 * back on the newline the engine preserves. If the split does not come back
 * cleanly, the title alone is kept, since a mangled summary is worse than none.
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
    const fallback = await withSlot(() =>
      requestFallback(title, target, sourceLanguage, signal),
    );
    return fallback ? { title: fallback.trim(), summary: '' } : null;
  }

  if (!summary) return { title: translated.trim(), summary: '' };

  const cut = translated.indexOf(JOINER);
  if (cut === -1) return { title: translated.trim(), summary: '' };

  return {
    title: translated.slice(0, cut).trim(),
    summary: translated.slice(cut + JOINER.length).trim(),
  };
}

export function cacheKey(articleId: string, target: TranslationLanguage): string {
  return `${target}:${articleId}`;
}
