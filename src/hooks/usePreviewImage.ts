import { useEffect, useState } from 'react';

import { fetchPreviewImage } from '../services/previewImage';
import * as prefs from '../storage/prefs';
import type { Article } from '../types';

/**
 * Process-wide cache of looked-up card images, hydrated at startup so a card
 * scrolled back into view shows its picture on the first frame. A miss is
 * remembered as an empty string: a page with no `og:image` will not have one
 * next time either, and re-asking on every render would be pure waste.
 */
const memory = new Map<string, string>();
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydratePreviewImageCache(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  const stored = await prefs.loadPreviewImages();
  for (const [key, value] of Object.entries(stored)) memory.set(key, value);
}

function persistSoon(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void prefs.savePreviewImages(Object.fromEntries(memory));
  }, 2000);
}

/**
 * The picture to show on a card: the feed's own, or one read from the article
 * page for feeds that carry none. Returns null while there is nothing to show,
 * which leaves the card's placeholder in place.
 */
export function usePreviewImage(article: Article, enabled: boolean): string | null {
  const needsLookup = enabled && !article.imageUrl && Boolean(article.link);

  const [found, setFound] = useState<string | null>(() =>
    needsLookup ? memory.get(article.id) || null : null,
  );

  useEffect(() => {
    if (!needsLookup) {
      setFound(null);
      return;
    }

    const cached = memory.get(article.id);
    if (cached !== undefined) {
      setFound(cached || null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      const url = await fetchPreviewImage(article.link, controller.signal);
      if (cancelled) return;

      memory.set(article.id, url ?? '');
      persistSoon();
      if (url) setFound(url);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [article.id, article.link, needsLookup]);

  return article.imageUrl ?? found;
}
