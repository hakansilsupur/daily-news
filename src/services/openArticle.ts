import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import type { Article } from '../types';

/** Opens a link in the in-app browser, falling back to the system browser. */
export async function openUrl(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => undefined);
  }
}

/** Opens the story in the in-app browser, falling back to the system browser. */
export async function openArticle(article: Article): Promise<void> {
  return openUrl(article.link);
}
