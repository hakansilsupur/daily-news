import { useEffect, useState } from 'react';

import * as prefs from '../storage/prefs';
import {
  cacheKey,
  isThrottled,
  needsTranslation,
  subscribeThrottle,
  throttleRetryDelay,
  translatePreview,
  type TranslatedPreview,
} from '../services/translate';
import type { Article, TranslationLanguage } from '../types';

/**
 * One process-wide cache, hydrated from storage at startup. Keeping it at
 * module level rather than in state means a card that scrolls back into view
 * renders its translation on the first frame, with no flash of the original.
 */
/** Retries per mounted card, and the floor on how soon one may happen. */
const MAX_ATTEMPTS = 4;
const MIN_RETRY_MS = 6000;

const memory = new Map<string, TranslatedPreview>();
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydrateTranslationCache(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  const stored = await prefs.loadTranslations();
  for (const [key, value] of Object.entries(stored)) memory.set(key, value);
}

function persistSoon(): void {
  if (saveTimer) clearTimeout(saveTimer);
  // Batched: a screenful of cards resolving together is one write, not thirty.
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void prefs.saveTranslations(Object.fromEntries(memory));
  }, 2000);
}

/** Exposed for tests, and for a future "clear cache" action. */
export function resetTranslationCache(): void {
  memory.clear();
  hydrated = false;
}

/**
 * True while the translation endpoint is refusing requests. The feed says so
 * out loud, because a screen of untranslated headlines otherwise reads as the
 * feature being broken rather than as waiting.
 */
export function useTranslationThrottled(): boolean {
  const [throttled, setThrottled] = useState(() => isThrottled());

  useEffect(() => {
    const update = () => setThrottled(isThrottled());
    const unsubscribe = subscribeThrottle(update);
    // The cooldown lapses on its own, with no event to announce it.
    const timer = setInterval(update, 5000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  return throttled;
}

export interface PreviewState {
  title: string;
  summary: string;
  /** True when what is shown came back from the translator. */
  translated: boolean;
}

/**
 * Returns the preview to render for an article: the translation when one is
 * available, the publisher's own words otherwise. Translation is attempted only
 * for cards that actually render, so a 200-article feed does not turn into 200
 * requests — the list virtualises, and so does this.
 */
export function useTranslatedPreview(
  article: Article,
  target: TranslationLanguage,
  enabled: boolean,
): PreviewState {
  const key = cacheKey(article.id, target);
  const wanted =
    enabled &&
    (needsTranslation(article.language, target, article.title) ||
      needsTranslation(article.language, target, article.summary));

  const [cached, setCached] = useState<TranslatedPreview | null>(() =>
    wanted ? memory.get(key) ?? null : null,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!wanted) {
      setCached(null);
      return;
    }

    const existing = memory.get(key);
    if (existing) {
      setCached(existing);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const result = await translatePreview(
        { title: article.title, summary: article.summary },
        target,
        article.language,
        controller.signal,
      );
      if (cancelled) return;

      if (!result) {
        // A failure is usually the endpoint throttling everyone at once, so try
        // again when its cooldown is up instead of leaving the card in the
        // original language until it happens to be scrolled off and back.
        if (attempt < MAX_ATTEMPTS) {
          const wait = Math.max(throttleRetryDelay(), MIN_RETRY_MS) + Math.random() * 2000;
          retry = setTimeout(() => setAttempt((value) => value + 1), wait);
        }
        return;
      }

      memory.set(key, result);
      persistSoon();
      setCached(result);
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (retry) clearTimeout(retry);
    };
  }, [key, wanted, target, article.title, article.summary, article.language, attempt]);

  if (!cached) {
    return { title: article.title, summary: article.summary, translated: false };
  }

  return {
    title: cached.title || article.title,
    // An empty translated summary means the split was not clean; keep the original.
    summary: cached.summary || article.summary,
    translated: true,
  };
}
