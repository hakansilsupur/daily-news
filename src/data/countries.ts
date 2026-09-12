import type { CountryCode, SourceLanguage } from '../types';

/**
 * The countries a user can call home, in the order they appear in the picker.
 * Türkiye leads because it is the default, the rest follow alphabetically by
 * their English name.
 */
export const COUNTRIES: { code: CountryCode; flag: string; language: SourceLanguage }[] = [
  { code: 'tr', flag: '🇹🇷', language: 'tr' },
  { code: 'az', flag: '🇦🇿', language: 'az' },
  { code: 'fr', flag: '🇫🇷', language: 'fr' },
  { code: 'de', flag: '🇩🇪', language: 'de' },
  { code: 'it', flag: '🇮🇹', language: 'it' },
  { code: 'nl', flag: '🇳🇱', language: 'nl' },
  { code: 'es', flag: '🇪🇸', language: 'es' },
  { code: 'gb', flag: '🇬🇧', language: 'en' },
  { code: 'us', flag: '🇺🇸', language: 'en' },
];

export const DEFAULT_COUNTRY: CountryCode = 'tr';

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
