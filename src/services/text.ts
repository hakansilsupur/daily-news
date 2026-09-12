/**
 * Case-folds text for searching, reconciling the Turkish dotted/dotless i.
 *
 * Turkish casing rules map ASCII `I` to `ı` and `İ` to `i`, so a plain
 * `toLocaleLowerCase('tr')` makes "TÜRKIYE" (typed on any keyboard without a
 * dotless i) fail to match "Türkiye", and "ISTANBUL" fail to match "İstanbul".
 * Folding both variants onto `i` keeps search forgiving in both directions
 * while still lowercasing Turkish text correctly.
 */
export function foldForSearch(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .normalize('NFC')
    // `İ` lowercases to `i` + COMBINING DOT ABOVE in some engines.
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i');
}
