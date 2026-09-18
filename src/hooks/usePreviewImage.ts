import { useEffect, useState } from 'react';

import { faviconUrl, fetchPreviewImage } from '../services/previewImage';
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

export interface CardImage {
  uri: string;
  /**
   * True for a publisher's mark rather than a picture of the story: it is drawn
   * to fit inside the tile instead of filling it, since a cropped logo is worse
   * than a small one.
   */
  isLogo: boolean;
}

/**
 * The picture to show on a card, in order of preference: the one the feed
 * carried, the one the article page advertises, or the publisher's mark.
 * Returns null when there is nothing to show at all.
 */
export function usePreviewImage(article: Article, enabled: boolean): CardImage | null {
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

  if (article.imageUrl) return { uri: article.imageUrl, isLogo: false };
  if (found) return { uri: found, isLogo: false };

  const logo = article.publisherUrl ? faviconUrl(article.publisherUrl) : null;
  return logo ? { uri: logo, isLogo: true } : null;
}
