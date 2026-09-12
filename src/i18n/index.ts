import { STRINGS, type Strings } from './strings';
import type {
  CountryCode,
  RegionFilter,
  SourceOrigin,
  UiLanguage,
  UiLanguagePreference,
} from '../types';

export { STRINGS };
export type { Strings };
export type { AddSourceError, FeedTabError } from './strings';

export const UI_LANGUAGES: UiLanguage[] = ['tr', 'en'];
export const UI_LANGUAGE_PREFERENCES: UiLanguagePreference[] = ['system', 'tr', 'en'];

/**
 * Device language, read from Intl rather than a native module so that switching
 * languages needs no extra dependency and no native rebuild. Anything that is
 * not Turkish falls back to English.
 */
export function detectSystemLanguage(): UiLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

export function resolveLanguage(preference: UiLanguagePreference): UiLanguage {
  return preference === 'system' ? detectSystemLanguage() : preference;
}

export function stringsFor(language: UiLanguage): Strings {
  return STRINGS[language];
}

/** Names where a source belongs: its country, or the worldwide bucket. */
export function originLabel(strings: Strings, origin: SourceOrigin): string {
  return origin === 'world' ? strings.worldLabel : strings.countryName[origin];
}

/** Labels the three feed filters, with `local` reading as the chosen country. */
export function regionFilterLabel(
  strings: Strings,
  region: RegionFilter,
  country: CountryCode,
): string {
  if (region === 'all') return strings.allFilter;
  if (region === 'world') return strings.worldLabel;
  return strings.countryName[country];
}

/** The BCP 47 tag to hand to `toLocaleDateString` and friends. */
export function localeTag(language: UiLanguage): string {
  return language === 'tr' ? 'tr-TR' : 'en-US';
}
