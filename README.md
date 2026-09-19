# Local News

A cross-platform mobile app (iOS, Android, web) that pulls headlines from public
RSS/Atom feeds and lets you filter them **by region — Türkiye or Worldwide — and
by individual source**. No API keys, no backend: the app talks to publishers'
feeds directly and keeps everything on the device.

Built with Expo (SDK 57) + React Native + TypeScript.

## Features

- **Gündem (trending)** — the leftmost tab shows the day's top stories from
  *outside* your source list, via Google News' own ranking. It follows the
  region filter: pick Türkiye and you get Türkiye's front page in Turkish; pick
  Dünya and you get the international desk, which is news from beyond Türkiye
  rather than Turkish papers writing about abroad (translation turns those
  headlines back into your language). If the endpoint is unreachable it falls
  back to grouping your own feed into the stories several of your sources are
  running at once.
- **Pinned tabs** — a row of tabs across the top of the feed, like pinned lists
  on X. `All` is always first; `Add +` opens a sheet where you name a tab and
  tick the sources it holds. Long-press a tab to edit or delete it. The choice
  of tab persists between launches.
- **Translated previews** — a chip row on the feed picks the language you read
  in: `Özgün` leaves every headline as its publisher wrote it, any other chip
  machine-translates headlines and summaries into that language. Türkçe is the
  default. It is deliberately separate from the interface language, so an
  English UI can still show Turkish headlines, and the same setting is mirrored
  in the Sources sheet under `Çeviri dili`.
  Translated cards are labelled `çeviri`; tapping through opens the publisher's
  article in its original language. Translations are cached per article and
  target language, so each headline costs one request ever, and only cards you
  actually scroll to are translated.
- **Two interface languages** — Türkçe and English, switched in the Sources sheet
  under `Dil / Language`. `System` follows the device locale. The choice is
  persisted and also drives relative timestamps (`2 saat önce` / `2h ago`).
- **Selectable home country** — Türkiye by default, changeable in the Sources
  sheet to Azerbaijan, China, France, Germany, India, Israel, Italy, Japan, the
  Netherlands, Spain, the UK or the US. The directory carries local sources for
  each, and the feed's middle filter becomes whichever country you chose.
- **Region filter** — `All` / your country / `Worldwide`, persisted between
  launches. It stores `local` rather than a country name, so switching country
  re-points the filter instead of resetting it.
- **Feed language filter** — `All` plus whichever languages your sources
  actually publish in, applied on top of the region filter. It lives in the
  Sources sheet rather than on the feed, because hiding sources is rarely what
  you want once previews can be translated instead.
- **Source filter** — every source has a toggle. Flip them from the chip row on
  the feed, or from the Sources sheet with `Select all` / `Clear` shortcuts.
- **Find sources by search** — the Sources sheet opens a searchable directory of
  ~90 well-known feeds across 13 countries plus the worldwide bucket. Type
  `bilim`, `spor`, `çin` or `BBC` and add what you want with one tap; anything
  already in your list shows as added.
- **Auto-discovery from a site address** — paste `nature.com` (or any site) and
  the app finds that site's feeds: it reads the page's own
  `<link rel="alternate">` tags, falls back to probing the usual paths
  (`/rss`, `/feed`, `/index.xml`, …), and offers only candidates it actually
  fetched and parsed, with the article count it found.
- **Add your own feed** — or paste an RSS/Atom URL directly, name it, and tag it
  Türkiye or Worldwide. Custom feeds sit alongside the built-in ones.
- **Unified timeline** — all selected feeds are fetched in parallel, merged,
  deduplicated by link, and sorted newest first.
- **Search a topic, beyond your sources** — typing in the search box filters
  your own articles instantly (Turkish-aware casing, so `ANKARA` matches
  `Ankara`) and, after a pause in typing, also asks Google News for that topic
  across the whole web. Your own sources are listed first; web results follow,
  with stories you already have filtered out. The subtitle says how many came
  from beyond your sources. It follows the region filter, so the same query
  searches Türkiye or the international desk.
- **Podcasts** — a third bottom tab lists the most popular shows in your
  country (or worldwide), from Apple's public chart: no API key, no account.
  Tapping a show reads its RSS feed and lists recent episodes with dates and
  durations; tapping an episode hands the audio to the system player. Shows
  whose feed cannot be resolved offer a link to Apple Podcasts instead.
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
  data/countries.ts         selectable home countries, flags, default language
  data/sources.ts           built-in feeds, tagged by origin, category, language
  data/catalog.ts           searchable directory of feeds you can add, + ranking
  data/tabs.ts              which sources a pinned tab (or the All tab) resolves to
  services/
    rss.ts                  fetch + parse RSS 2.0 / RSS 1.0 (RDF) / Atom
    discovery.ts            finds a site's feeds from its address
    translate.ts            keyless preview translation, with a fallback engine
    previewImage.ts         reads a card image from the article's og:image
    podcasts.ts             Apple's popularity chart, plus episode parsing
    trending.ts             groups the feed into stories by shared coverage
    topStories.ts           Google News top stories, independent of your sources
    newsService.ts          parallel fetch, dedupe, sort, search, timestamps
    openArticle.ts          in-app browser with system-browser fallback
  storage/prefs.ts          AsyncStorage persistence (filters, language, tabs, feeds, saves)
  hooks/useNewsApp.ts       all app state in one hook
  components/               ArticleCard, FeedTabStrip, SegmentedControl, TabBar, …
  screens/                  FeedScreen, SavedScreen
tests/feed.test.mts         parser + merge/search/format unit tests
scripts/check-feeds.mts     live feed health check
```

## Preview translation

The target is `translationLanguage` — Türkçe unless the user changes it — not
the interface language. The two are separate settings because they answer
different questions: which language the app's own labels are in, and which
language you want foreign headlines rendered into. A source already in the
target language is never sent anywhere.

`src/services/translate.ts` uses the public `translate.googleapis.com` endpoint:
no API key, no account, no backend, matching the rest of the app. That endpoint
is unofficial and throttles by IP, so the whole path is best-effort:

- A failure, a `429`, or an unparseable body leaves the publisher's own words on
  screen. Translation never blocks rendering and never surfaces an error.
- A refusal starts a **cooldown** — one minute, doubling up to fifteen while it
  persists — during which nothing is sent at all. Hammering a throttled endpoint
  only extends the block, and a hundred articles arriving at once (switching
  country, say) is exactly the burst that triggers it. Cards retry when the
  cooldown lapses, and the feed says it is waiting rather than looking broken.
- Requests are spaced at least 200ms apart, two at a time, and a card costs one
  request rather than two: title and summary are translated together.
- When the primary engine declines, a headline-only fallback via MyMemory is
  tried, but only when the source language is known (it needs an explicit
  language pair) and only within its ~500-character anonymous limit. Its quota
  notices arrive as if they were translated text, so they are filtered out
  explicitly rather than shown as a headline.
- Results are keyed per article and language and cached in AsyncStorage (500
  entries), so scrolling back costs nothing.

> **Note:** neither endpoint is reachable from the build sandbox — the primary
> returns `429` for datacentre IPs and the fallback is blocked outright — so the
> network path is unverified. The response parsers, URL building, language
> skipping and quota-notice filtering are unit-tested against fixtures.

## Card images

Most feeds put a picture in the item — an enclosure, a `media:content`, or an
`<img>` in the description — and the card uses it. Google News' RSS carries
none of those, so the Gündem tab would be a column of empty boxes.

For an article with no image of its own, `src/services/previewImage.ts` reads
the `og:image` the publisher advertises on the article page. That is an HTTP
request per card, so it is kept cheap: only picture-less articles ask, only
cards that render ask, the request is range-limited to the head of the document
(and abandoned if a server ignores that and the page is large), at most two run
at once, and every answer — including "this page has none" — is cached on the
device so it is asked once ever.

A Google News link is the exception: it opens an interstitial that redirects in
JavaScript, so a fetch stops there and reads *its* `og:image` — the Google News
logo, on every card. Those links are skipped rather than asked. Instead the card
falls back to the publisher's own mark, built from the site named in the feed's
`<source url>` tag, and failing that to the publisher's initial.

## Countries

A source's `region` is its origin: a country code (`tr`, `de`, `us`, …) or
`world` for outlets that report globally rather than for one country's readers.
The feed filter stores `local`, which resolves against the country you picked —
so the same saved filter means Türkiye today and Germany after you switch, and
no preference needs migrating when it changes.

Adding a country is `src/data/countries.ts` (code, flag, default language), a
name in both string tables, and directory entries in `src/data/catalog.ts`.
Installs from before this existed are migrated on load: the stored `turkey`
filter reads as `local`, and custom feeds tagged `turkey` become `tr`.

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

## What "trending" means here

Two answers, in order of preference.

**Outside the app** (`src/services/topStories.ts`): Google News publishes a
ranked top-stories RSS feed per country, plus a World section, with no API key.
That ranking is made from the whole web rather than from whatever sources the
user happens to have enabled, which is what "trending" ought to mean. X/Twitter
trends would have been the obvious choice and are not usable: they sit behind a
paid API tier, and scraping breaks both the terms and, sooner or later, itself.

**Inside the app** (`src/services/trending.ts`), when that endpoint cannot be
reached: there is no view counter to read — publishers do not put "most read" in
their RSS, and this app has no backend to collect one — but the feed does know
how many independent newsrooms are running the same story right now. So
headlines are grouped by shared terms and ranked by **distinct sources**, and
the UI says `3 kaynak` rather than a view count.

- A story needs at least two sources; one source is that outlet's story, not a
  trend.
- Terms are folded Turkish-aware (`İSTANBUL` and `istanbul` are one), filler
  words are dropped, and source names are excluded so "Habertürk" in a headline
  is not mistaken for a topic.
- Topics are taken greedily: once a story's articles belong to a topic, a
  second term covering the same articles is treated as a synonym rather than a
  separate entry, so a story appears once.
- Turkish glues suffixes onto words, so a topic ranking on `Bankası` is named by
  the phrase its coverage shares — `Merkez Bankası`.
- Turkish also conjugates onto the verb, so the most repeated word in a batch of
  headlines is often `ediyor` or `bulundu` — a tense, not a subject. No stopword
  list can hold every inflection, so verb endings are matched directly, and a
  word never written with a capital has to earn its place by appearing in a
  repeated phrase. Names are exempt from both rules.
- Only articles from the last 24 hours count.

It costs no extra network: everything is computed from articles already fetched.

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
