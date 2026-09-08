import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import type { Article } from '../types';

/** Opens the story in the in-app browser, falling back to the system browser. */
export async function openArticle(article: Article): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(article.link);
  } catch {
    await Linking.openURL(article.link).catch(() => undefined);
  }
}
