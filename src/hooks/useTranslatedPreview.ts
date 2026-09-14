import { useEffect, useState } from 'react';

import * as prefs from '../storage/prefs';
import {
  cacheKey,
  needsTranslation,
  translatePreview,
  type TranslatedPreview,
} from '../services/translate';
import type { Article, TranslationLanguage } from '../types';

/**
 * One process-wide cache, hydrated from storage at startup. Keeping it at
 * module level rather than in state means a card that scrolls back into view
 * renders its translation on the first frame, with no flash of the original.
 */
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

    (async () => {
      const result = await translatePreview(
        { title: article.title, summary: article.summary },
        target,
        article.language,
        controller.signal,
      );
      if (cancelled || !result) return;

      memory.set(key, result);
      persistSoon();
      setCached(result);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, wanted, target, article.title, article.summary, article.language]);

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
