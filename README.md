# Local News

A cross-platform mobile app (iOS, Android, web) that pulls headlines from public
RSS/Atom feeds and lets you filter them **by country, by worldwide coverage, and
by individual source**. No API keys, no backend: the app talks to publishers'
feeds directly and keeps everything on the device.

Built with Expo (SDK 57) + React Native + TypeScript.

## Features

- **Selectable country** — 13 countries ship with sources. Türkiye is the
  default on a fresh install, not a hard-coded special case: tap the country tab
  to open a searchable picker and switch to any other. The choice persists.
- **Scope filter** — the selected country, `Worldwide` (international outlets),
  or `All` (the country plus worldwide). `All` deliberately does not pull all 13
  countries at once, which would make the timeline unreadable.
- **Source filter** — every source has a toggle. Flip them from the chip row on
  the feed, or from the Sources sheet with `Select all` / `Clear` shortcuts.
- **Add your own feed** — paste any RSS/Atom URL, name it, and tag it to the
  current country or to Worldwide. Custom feeds sit alongside the built-in ones
  and can be deleted.
- **Unified timeline** — all selected feeds are fetched in parallel, merged,
  deduplicated by link, and sorted newest first.
- **Search** across headline, summary and source name, with Turkish casing
  handled properly: `ANKARA` matches `Ankara`, and `ISTANBUL`, `İSTANBUL`,
  `istanbul` and `ıstanbul` all match `İstanbul` (Turkish lowercases ASCII `I`
  to dotless `ı`, so the dotted and dotless forms are folded together).
- **Save for later** — bookmark articles into a Saved tab, stored on device.
- **Resilient fetching** — a feed that is slow (12s timeout), offline, or
  returning garbage never blocks the others; the UI reports which sources failed
  and the rest still render.
- **Light and dark theme**, following the system setting.
- Articles open in an in-app browser, falling back to the system browser.

## Getting started

```bash
npm install
npm start          # then press i / a, or scan the QR code with Expo Go
```

Other scripts:

```bash
npm run android      # open on an Android device/emulator
npm run ios          # open on an iOS simulator (macOS only)
npm run web          # run in a browser
npm run typecheck    # tsc --noEmit
npm test             # unit tests for the feed parser and merge/search logic
npm run check-feeds  # live health check of every built-in feed URL
```

### `npm run check-feeds`

Publishers retire and move RSS endpoints regularly. This script fetches every
built-in source and prints what came back:

```
TR trt-haber          OK     40 articles (40 dated, 38 with images) — …
WW reuters-agency     FAIL   HTTP 404
```

The prefix is the source's scope — an ISO country code, or `WW` for worldwide.

Run it on a machine with unrestricted network access, then prune or replace
anything reported as `FAIL` or `EMPTY` in `src/data/sources.ts`.

> **Note:** none of the built-in feed URLs were verified against the live
> internet during development — the build sandbox blocked all outbound traffic
> to news domains. The parser and the filtering logic are covered by unit tests
> against RSS 2.0, Atom and RDF fixtures, but the URLs themselves are
> best-effort. **Run `npm run check-feeds` before relying on the bundled source
> list**, particularly for the non-Türkiye countries, which were added without
> any live check.

## Project layout

```
App.tsx                     app shell: tabs, theme, filter + country sheets
src/
  types.ts                  CountryCode / SourceScope / ScopeMode / Article
  theme.ts                  light + dark palettes
  data/
    countries.ts            country list, default country, scope labels, search
    sources.ts              built-in feeds, tagged by scope and category
  services/
    rss.ts                  fetch + parse RSS 2.0 / RSS 1.0 (RDF) / Atom
    newsService.ts          parallel fetch, dedupe, sort, search, timestamps
    text.ts                 Turkish-aware case folding for search
    openArticle.ts          in-app browser with system-browser fallback
  storage/prefs.ts          AsyncStorage persistence (filters, custom feeds, saves)
  hooks/useNewsApp.ts       all app state in one hook
  components/               ArticleCard, ScopeTabs, CountryPickerSheet, …
  screens/                  FeedScreen, SavedScreen
tests/feed.test.mts         parser + merge/search/format unit tests
tests/scope.test.mts        country selection + scope filtering unit tests
scripts/check-feeds.mts     live feed health check
```

## Built-in sources

| Country | Sources |
|---|---|
| 🇹🇷 Türkiye *(default)* | Anadolu Ajansı, TRT Haber, Hürriyet, Sözcü, Cumhuriyet, NTV, BBC News Türkçe, Bianet, Dünya Gazetesi, Webrazzi, Fanatik |
| 🇺🇸 United States | NPR, The New York Times, The Verge, ESPN |
| 🇬🇧 United Kingdom | BBC News UK, The Guardian UK, Sky News, The Independent |
| 🇩🇪 Germany | Tagesschau, Der Spiegel, Die Zeit, Deutsche Welle |
| 🇫🇷 France | Le Monde, France 24, Le Figaro, Libération |
| 🇪🇸 Spain | El País, El Mundo, RTVE |
| 🇮🇹 Italy | ANSA, la Repubblica, Corriere della Sera |
| 🇳🇱 Netherlands | NOS, NU.nl |
| 🇮🇳 India | The Times of India, The Hindu, NDTV |
| 🇯🇵 Japan | NHK World, The Japan Times |
| 🇧🇷 Brazil | G1, Folha de S.Paulo |
| 🇨🇦 Canada | CBC News, The Globe and Mail |
| 🇦🇺 Australia | ABC News, The Sydney Morning Herald |
| 🌍 Worldwide | BBC World, Al Jazeera, The Guardian World, NPR World, Deutsche Welle World, France 24 English, Euronews, Reuters Agency, CNBC, Ars Technica |

### Adding a country or source

Each entry in `src/data/sources.ts` carries an `id`, `scope`, `category` and
`feedUrl`, where `scope` is either an ISO country code or `'world'`. Adding a
source is a one-line edit — but keep existing `id`s stable, since they are what
user filter preferences are stored against.

To add a country, extend the `CountryCode` union in `src/types.ts` and the
`COUNTRIES` array in `src/data/countries.ts`, then give it at least one source.
A test asserts that every shipped country has one, so a half-added country fails
the suite rather than showing an empty feed.

## How fetching works

`useNewsApp` derives the active source set from the scope (selected country /
worldwide / both) plus the per-source toggles, then refetches whenever that set
changes (keyed on sorted source ids, so re-renders don't cause redundant network
calls). Each feed gets its own `AbortController` with a 12-second timeout;
`Promise.all` over `fetchAllFeeds` never rejects, so one dead publisher degrades
to a warning line instead of an empty screen.

Articles are deduplicated on the link with its query string and fragment
stripped, which collapses the same story arriving from two feeds.
