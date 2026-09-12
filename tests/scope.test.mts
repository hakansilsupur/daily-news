import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  countSourcesByCountry,
  getCountry,
  isCountryCode,
  scopeFlag,
  scopeLabel,
  searchCountries,
} from '../src/data/countries';
import { BUILT_IN_SOURCES, sourcesForScope } from '../src/data/sources';
import type { NewsSource, SourceScope } from '../src/types';

const source = (id: string, scope: SourceScope): NewsSource => ({
  id,
  name: id,
  scope,
  category: 'general',
  feedUrl: `https://example.test/${id}`,
  language: 'en',
});

const FIXTURES = [
  source('tr-1', 'tr'),
  source('tr-2', 'tr'),
  source('de-1', 'de'),
  source('world-1', 'world'),
];

test('Türkiye is the default country', () => {
  assert.equal(DEFAULT_COUNTRY, 'tr');
  assert.equal(getCountry(DEFAULT_COUNTRY).name, 'Türkiye');
});

test('country scope selects only that country, and is switchable', () => {
  assert.deepEqual(
    sourcesForScope(FIXTURES, 'country', 'tr').map((s) => s.id),
    ['tr-1', 'tr-2'],
    'the default country is no longer hardcoded, just preselected',
  );
  assert.deepEqual(
    sourcesForScope(FIXTURES, 'country', 'de').map((s) => s.id),
    ['de-1'],
  );
});

test('world scope excludes every country feed', () => {
  assert.deepEqual(
    sourcesForScope(FIXTURES, 'world', 'tr').map((s) => s.id),
    ['world-1'],
  );
});

test('all scope is the selected country plus worldwide, not every country', () => {
  assert.deepEqual(
    sourcesForScope(FIXTURES, 'all', 'de').map((s) => s.id),
    ['de-1', 'world-1'],
  );
  assert.deepEqual(
    sourcesForScope(FIXTURES, 'all', 'tr').map((s) => s.id),
    ['tr-1', 'tr-2', 'world-1'],
  );
});

test('a country with no sources yields an empty scope rather than throwing', () => {
  assert.deepEqual(sourcesForScope(FIXTURES, 'country', 'jp'), []);
});

test('every shipped country has at least one built-in source', () => {
  const counts = countSourcesByCountry(BUILT_IN_SOURCES);

  for (const country of COUNTRIES) {
    assert.ok(
      (counts[country.code] ?? 0) > 0,
      `${country.name} (${country.code}) has no sources`,
    );
  }
});

test('every built-in source has a scope the app knows about', () => {
  for (const built of BUILT_IN_SOURCES) {
    assert.ok(
      built.scope === 'world' || isCountryCode(built.scope),
      `${built.id} has unknown scope "${built.scope}"`,
    );
  }
});

test('built-in source ids and feed URLs are unique', () => {
  const ids = new Set<string>();
  const urls = new Set<string>();

  for (const built of BUILT_IN_SOURCES) {
    assert.ok(!ids.has(built.id), `duplicate id ${built.id}`);
    assert.ok(!urls.has(built.feedUrl), `duplicate feed URL ${built.feedUrl}`);
    ids.add(built.id);
    urls.add(built.feedUrl);
  }
});

test('worldwide sources are counted separately from countries', () => {
  const counts = countSourcesByCountry(FIXTURES);

  assert.deepEqual(counts, { tr: 2, de: 1 }, 'world is not a country');
});

test('scope labels and flags cover both countries and worldwide', () => {
  assert.equal(scopeLabel('tr'), 'Türkiye');
  assert.equal(scopeLabel('world'), 'Worldwide');
  assert.equal(scopeFlag('tr'), '🇹🇷');
  assert.equal(scopeFlag('world'), '🌍');
});

test('country search matches English and native names and codes', () => {
  assert.deepEqual(
    searchCountries('german').map((c) => c.code),
    ['de'],
  );
  assert.deepEqual(
    searchCountries('Deutschland').map((c) => c.code),
    ['de'],
    'native name is searchable',
  );
  assert.deepEqual(
    searchCountries('TÜRKIYE').map((c) => c.code),
    ['tr'],
    'Turkish casing is handled',
  );
  assert.deepEqual(searchCountries('jp').map((c) => c.code), ['jp']);
  assert.equal(searchCountries('   ').length, COUNTRIES.length, 'blank query is a no-op');
  assert.equal(searchCountries('atlantis').length, 0);
});

test('isCountryCode guards stored preferences', () => {
  assert.ok(isCountryCode('tr'));
  assert.ok(!isCountryCode('turkey'), 'the old region value is not a country code');
  assert.ok(!isCountryCode('world'));
  assert.ok(!isCountryCode(undefined));
});
