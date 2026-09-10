# Local News

A cross-platform mobile app (iOS, Android, web) that pulls headlines from public
RSS/Atom feeds and lets you filter them **by region — Türkiye or Worldwide — and
by individual source**. No API keys, no backend: the app talks to publishers'
feeds directly and keeps everything on the device.

Built with Expo (SDK 57) + React Native + TypeScript.

## Features

- **Pinned tabs** — a row of tabs across the top of the feed, like pinned lists
  on X. `All` is always first; `Add +` opens a sheet where you name a tab and
  tick the sources it holds. Long-press a tab to edit or delete it. The choice
  of tab persists between launches.
- **Two interface languages** — Türkçe and English, switched in the Sources sheet
  under `Dil / Language`. `System` follows the device locale. The choice is
  persisted and also drives relative timestamps (`2 saat önce` / `2h ago`).
- **Region filter** — `All` / `Türkiye` / `Worldwide`, persisted between launches.
- **Feed language filter** — `All` / `Türkçe` / `English`, applied on top of the
  region filter using each source's `language`. It is independent of the
  interface language, so you can read an English UI over Turkish feeds.
- **Source filter** — every source has a toggle. Flip them from the chip row on
  the feed, or from the Sources sheet with `Select all` / `Clear` shortcuts.
- **Find sources by search** — the Sources sheet opens a searchable directory of
  ~45 well-known Turkish and worldwide feeds. Type `bilim`, `spor` or `BBC` and
  add what you want with one tap; anything already in your list shows as added.
- **Auto-discovery from a site address** — paste `nature.com` (or any site) and
  the app finds that site's feeds: it reads the page's own
  `<link rel="alternate">` tags, falls back to probing the usual paths
  (`/rss`, `/feed`, `/index.xml`, …), and offers only candidates it actually
  fetched and parsed, with the article count it found.
- **Add your own feed** — or paste an RSS/Atom URL directly, name it, and tag it
  Türkiye or Worldwide. Custom feeds sit alongside the built-in ones.
- **Unified timeline** — all selected feeds are fetched in parallel, merged,
  deduplicated by link, and sorted newest first.
- **Search** across headline, summary and source name (Turkish-aware casing, so
  `ANKARA` matches `Ankara` and `İSTANBUL` matches `İstanbul`).
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
npm run build:apk    # build an installable Android APK (see below)
```

## Building an APK

Three ways to get an installable Android package, from least to most setup.

### 1. GitHub Actions (nothing to install)

The **Build Android APK** workflow (`.github/workflows/build-apk.yml`) runs
`expo prebuild` + Gradle on GitHub's runners and uploads the APK as a build
artifact. Trigger it from the Actions tab (pick `release` or `debug`), or push a
`v*` tag. Download the artifact, unzip, and `adb install -r local-news-release.apk`.

### 2. Locally with the Android SDK

```bash
npm run build:apk          # release APK  -> build/local-news-release.apk
npm run build:apk -- debug # debug APK    -> build/local-news-debug.apk
```

Needs JDK 17+ and the Android SDK on the machine (`ANDROID_HOME` or
`ANDROID_SDK_ROOT` set — installing Android Studio is the easy route). The
script regenerates the native `android/` project from `app.json` each run, so
never hand-edit that folder: it is gitignored and gets wiped by `--clean`.

### 3. EAS Build (cloud, managed signing)

```bash
npm install -g eas-cli
eas login
eas build:configure
npm run build:apk:eas      # eas build --platform android --profile preview
```

`eas.json` defines four profiles:

| profile          | output | use for                                   |
| ---------------- | ------ | ----------------------------------------- |
| `development`    | APK    | dev client with the debug menu            |
| `preview`        | APK    | internal testing / sideloading            |
| `production`     | AAB    | Google Play uploads                       |
| `production-apk` | APK    | production build to distribute yourself   |

### A note on signing

Options 1 and 2 sign the release APK with the debug keystore that
`expo prebuild` generates. That is fine for sideloading and internal testing,
but Google Play will reject it — for a store upload use `eas build --profile
production`, which manages a real upload keystore for you, or wire your own
keystore into `android/app/build.gradle` after prebuild.

### `npm run check-feeds`

Publishers retire and move RSS endpoints regularly. This script fetches every
built-in source and prints what came back:

```
TR trt-haber          OK     40 articles (40 dated, 38 with images) — …
WW reuters-agency     FAIL   HTTP 404
```

It covers both the built-in sources and the Add-source directory. Run it on a
machine with unrestricted network access, then prune or replace anything
reported as `FAIL` or `EMPTY` in `src/data/sources.ts` or `src/data/catalog.ts`.

> **Note:** none of the bundled feed URLs — built-ins or directory — were
> verified against the live internet during development. The build sandbox
> returns `HTTP 403` for every news domain, so a run there reports `0/67
> healthy` regardless of whether a URL is correct, which makes it useless as a
> check. The parser, the directory search and the discovery helpers are covered
> by unit tests against fixtures, but please run `npm run check-feeds` from your
> own machine before relying on the bundled lists.

## Project layout

```
App.tsx                     app shell: tabs, theme, filter sheet
src/
  types.ts                  Article / NewsSource / Region / language models
  theme.ts                  light + dark palettes
  i18n/
    strings.ts              every UI string, in Turkish and English
    index.ts                locale detection and language resolution
  data/sources.ts           built-in feeds, tagged by region, category, language
  data/catalog.ts           searchable directory of feeds you can add, + ranking
  data/tabs.ts              which sources a pinned tab (or the All tab) resolves to
  services/
    rss.ts                  fetch + parse RSS 2.0 / RSS 1.0 (RDF) / Atom
    discovery.ts            finds a site's feeds from its address
    newsService.ts          parallel fetch, dedupe, sort, search, timestamps
    openArticle.ts          in-app browser with system-browser fallback
  storage/prefs.ts          AsyncStorage persistence (filters, language, tabs, feeds, saves)
  hooks/useNewsApp.ts       all app state in one hook
  components/               ArticleCard, FeedTabStrip, SegmentedControl, TabBar, …
  screens/                  FeedScreen, SavedScreen
tests/feed.test.mts         parser + merge/search/format unit tests
scripts/check-feeds.mts     live feed health check
```

## Built-in sources

**Türkiye** — Anadolu Ajansı, TRT Haber, Hürriyet, Sözcü, Cumhuriyet, NTV,
BBC News Türkçe, Bianet, Dünya Gazetesi, Webrazzi, Fanatik.

**Worldwide** — BBC World, Al Jazeera, The Guardian, NPR World, Deutsche Welle,
France 24, Euronews, Reuters Agency, CNBC, Ars Technica, ESPN.

Each entry in `src/data/sources.ts` carries an `id`, `region`, `category`,
`language` and `feedUrl`. Adding a source is a one-line edit — but keep existing
`id`s stable, since they are what user filter preferences are stored against.

## Adding a language

`src/i18n/strings.ts` holds one `Strings` object per language, so adding a third
is: extend `UiLanguage` in `src/types.ts`, add the object, and list it in
`UI_LANGUAGES` / `UI_LANGUAGE_PREFERENCES`. `Strings` is a flat interface, so a
missing key is a compile error rather than a blank label, and a unit test
asserts both tables have the same shape. `detectSystemLanguage()` reads the
device locale from `Intl` — no native module, so no rebuild is needed to change
languages at runtime.

## Tabs vs. filters

The two coexist by staying out of each other's way, which `src/data/tabs.ts`
enforces in one function:

- **The `All` tab** is the ad-hoc view. The region filter, the language filter
  and the per-source switches all apply to it, and it is the only tab that shows
  those controls.
- **A pinned tab** is an explicit list of sources, so it deliberately ignores
  all three — otherwise a filter set on `All` would quietly empty out a tab you
  pinned. Its sources are exactly what you ticked, in that order.

Deleting a custom feed prunes it out of every tab that referenced it, so a tab
can never point at a source that no longer exists.

## How fetching works

`useNewsApp` derives the active source set from the region filter plus the
per-source toggles, then refetches whenever that set changes (keyed on sorted
source ids, so re-renders don't cause redundant network calls). Each feed gets
its own `AbortController` with a 12-second timeout; `Promise.all` over
`fetchAllFeeds` never rejects, so one dead publisher degrades to a warning line
instead of an empty screen.

Articles are deduplicated on the link with its query string and fragment
stripped, which collapses the same story arriving from two feeds.
