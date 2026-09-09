# Local News

A cross-platform mobile app (iOS, Android, web) that pulls headlines from public
RSS/Atom feeds and lets you filter them **by region — Türkiye or Worldwide — and
by individual source**. No API keys, no backend: the app talks to publishers'
feeds directly and keeps everything on the device.

Built with Expo (SDK 57) + React Native + TypeScript.

## Features

- **Region filter** — `All` / `Türkiye` / `Worldwide`, persisted between launches.
- **Source filter** — every source has a toggle. Flip them from the chip row on
  the feed, or from the Sources sheet with `Select all` / `Clear` shortcuts.
- **Add your own feed** — paste any RSS/Atom URL, name it, tag it Türkiye or
  Worldwide. Custom feeds sit alongside the built-in ones and can be deleted.
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

Run it on a machine with unrestricted network access, then prune or replace
anything reported as `FAIL` or `EMPTY` in `src/data/sources.ts`.

> **Note:** the built-in feed URLs were **not** verified against the live
> internet during development — the build sandbox blocked all outbound traffic
> to news domains. The parser is covered by unit tests against RSS 2.0, Atom and
> RDF fixtures, but please run `npm run check-feeds` once before relying on the
> bundled source list.

## Project layout

```
App.tsx                     app shell: tabs, theme, filter sheet
src/
  types.ts                  Article / NewsSource / Region models
  theme.ts                  light + dark palettes
  data/sources.ts           built-in feeds, tagged by region and category
  services/
    rss.ts                  fetch + parse RSS 2.0 / RSS 1.0 (RDF) / Atom
    newsService.ts          parallel fetch, dedupe, sort, search, timestamps
    openArticle.ts          in-app browser with system-browser fallback
  storage/prefs.ts          AsyncStorage persistence (filters, custom feeds, saves)
  hooks/useNewsApp.ts       all app state in one hook
  components/               ArticleCard, RegionTabs, SourceChips, TabBar, …
  screens/                  FeedScreen, SavedScreen
tests/feed.test.mts         parser + merge/search/format unit tests
scripts/check-feeds.mts     live feed health check
```

## Built-in sources

**Türkiye** — Anadolu Ajansı, TRT Haber, Hürriyet, Sözcü, Cumhuriyet, NTV,
BBC News Türkçe, Bianet, Dünya Gazetesi, Webrazzi, Fanatik.

**Worldwide** — BBC World, Al Jazeera, The Guardian, NPR World, Deutsche Welle,
France 24, Euronews, Reuters Agency, CNBC, Ars Technica, ESPN.

Each entry in `src/data/sources.ts` carries an `id`, `region`, `category` and
`feedUrl`. Adding a source is a one-line edit — but keep existing `id`s stable,
since they are what user filter preferences are stored against.

## How fetching works

`useNewsApp` derives the active source set from the region filter plus the
per-source toggles, then refetches whenever that set changes (keyed on sorted
source ids, so re-renders don't cause redundant network calls). Each feed gets
its own `AbortController` with a 12-second timeout; `Promise.all` over
`fetchAllFeeds` never rejects, so one dead publisher degrades to a warning line
instead of an empty screen.

Articles are deduplicated on the link with its query string and fragment
stripped, which collapses the same story arriving from two feeds.
