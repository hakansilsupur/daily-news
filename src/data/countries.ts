import type { CountryCode, SourceLanguage, TranslationLanguage } from '../types';

/**
 * The countries a user can call home, in the order they appear in the picker.
 * Türkiye leads because it is the default, the rest follow alphabetically by
 * their English name.
 */
export const COUNTRIES: { code: CountryCode; flag: string; language: SourceLanguage }[] = [
  { code: 'tr', flag: '🇹🇷', language: 'tr' },
  { code: 'az', flag: '🇦🇿', language: 'az' },
  { code: 'cn', flag: '🇨🇳', language: 'zh' },
  { code: 'fr', flag: '🇫🇷', language: 'fr' },
  { code: 'de', flag: '🇩🇪', language: 'de' },
  // India's national press publishes mainly in English, so that is the useful
  // default for a feed added there by hand; Hindi sources are tagged as such.
  { code: 'in', flag: '🇮🇳', language: 'en' },
  { code: 'il', flag: '🇮🇱', language: 'he' },
  { code: 'it', flag: '🇮🇹', language: 'it' },
  { code: 'jp', flag: '🇯🇵', language: 'ja' },
  { code: 'nl', flag: '🇳🇱', language: 'nl' },
  { code: 'es', flag: '🇪🇸', language: 'es' },
  { code: 'gb', flag: '🇬🇧', language: 'en' },
  { code: 'us', flag: '🇺🇸', language: 'en' },
];

export const DEFAULT_COUNTRY: CountryCode = 'tr';

/**
 * Languages a preview can be translated into, and the default target. Türkçe
 * leads and is the default; the rest follow in the order they read in the
 * picker. Independent of the interface language, which only has two options.
 */
export const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  'tr',
  'en',
  'az',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'he',
  'zh',
  'hi',
  'ja',
];

export const DEFAULT_TRANSLATION_LANGUAGE: TranslationLanguage = 'tr';

export function isTranslationLanguage(value: unknown): value is TranslationLanguage {
  return typeof value === 'string' && (TRANSLATION_LANGUAGES as string[]).includes(value);
}

export const COUNTRY_CODES = COUNTRIES.map((country) => country.code);

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as string[]).includes(value);
}

/** A sensible default language for a feed filed under a given origin. */
export function languageForOrigin(origin: CountryCode | 'world'): SourceLanguage {
  if (origin === 'world') return 'en';
  return COUNTRIES.find((country) => country.code === origin)?.language ?? 'en';
}

export function flagFor(code: CountryCode): string {
  return COUNTRIES.find((country) => country.code === code)?.flag ?? '';
}
