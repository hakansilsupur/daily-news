import { foldForSearch } from '../services/text';
import type { Country, CountryCode, NewsSource, SourceScope } from '../types';

/** The country selected on a fresh install. */
export const DEFAULT_COUNTRY: CountryCode = 'tr';

export const COUNTRIES: Country[] = [
  { code: 'tr', name: 'Türkiye', nativeName: 'Türkiye', flag: '🇹🇷' },
  { code: 'us', name: 'United States', nativeName: 'United States', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', nativeName: 'United Kingdom', flag: '🇬🇧' },
  { code: 'de', name: 'Germany', nativeName: 'Deutschland', flag: '🇩🇪' },
  { code: 'fr', name: 'France', nativeName: 'France', flag: '🇫🇷' },
  { code: 'es', name: 'Spain', nativeName: 'España', flag: '🇪🇸' },
  { code: 'it', name: 'Italy', nativeName: 'Italia', flag: '🇮🇹' },
  { code: 'nl', name: 'Netherlands', nativeName: 'Nederland', flag: '🇳🇱' },
  { code: 'in', name: 'India', nativeName: 'भारत', flag: '🇮🇳' },
  { code: 'jp', name: 'Japan', nativeName: '日本', flag: '🇯🇵' },
  { code: 'br', name: 'Brazil', nativeName: 'Brasil', flag: '🇧🇷' },
  { code: 'ca', name: 'Canada', nativeName: 'Canada', flag: '🇨🇦' },
  { code: 'au', name: 'Australia', nativeName: 'Australia', flag: '🇦🇺' },
];

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function getCountry(code: CountryCode): Country {
  const country = BY_CODE.get(code);
  if (!country) throw new Error(`Unknown country code: ${code}`);
  return country;
}

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && BY_CODE.has(value as CountryCode);
}

export const WORLD_LABEL = 'Worldwide';
export const WORLD_FLAG = '🌍';

/** Display label for a source's scope — a country name, or "Worldwide". */
export function scopeLabel(scope: SourceScope): string {
  return scope === 'world' ? WORLD_LABEL : getCountry(scope).name;
}

export function scopeFlag(scope: SourceScope): string {
  return scope === 'world' ? WORLD_FLAG : getCountry(scope).flag;
}

/** How many of `sources` report from each country, keyed by country code. */
export function countSourcesByCountry(sources: NewsSource[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const source of sources) {
    if (source.scope === 'world') continue;
    counts[source.scope] = (counts[source.scope] ?? 0) + 1;
  }
  return counts;
}

/** Countries matching a free-text query against English and native names. */
export function searchCountries(query: string): Country[] {
  const needle = foldForSearch(query.trim());
  if (!needle) return COUNTRIES;

  return COUNTRIES.filter(
    (country) =>
      foldForSearch(country.name).includes(needle) ||
      foldForSearch(country.nativeName).includes(needle) ||
      country.code.includes(needle),
  );
}
