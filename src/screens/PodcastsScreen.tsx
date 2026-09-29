import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { PodcastSheet } from '../components/PodcastSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import type { NewsApp } from '../hooks/useNewsApp';
import { usePodcasts } from '../hooks/usePodcasts';
import { regionFilterLabel } from '../i18n';
import { formatRelativeTime } from '../services/newsService';
import { openUrl } from '../services/openArticle';
import { usePlayer } from '../player/PlayerContext';
import { formatDuration, RECENT_DAYS } from '../services/podcasts';
import type { Theme } from '../theme';
import type { ChartEpisode, Podcast, RegionFilter } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
}

/**
 * What is hot in podcasts for the chosen country, or worldwide: the episodes
 * people are playing now, released in the last couple of weeks. Where a country
 * has no episode chart, popular shows that have published recently stand in.
 */
export function PodcastsScreen({ app, theme }: Props) {
  const { t } = app;
  const state = usePodcasts(app.country, app.region, true);
  const player = usePlayer();
  const scopeName = app.region === 'world' ? t.worldLabel : t.countryName[app.country];
  const showingShows = state.trending.length === 0 && state.podcasts.length > 0;

  const regionOptions: { value: RegionFilter; label: string }[] = (
    ['all', 'local', 'world'] as RegionFilter[]
  ).map((value) => ({ value, label: regionFilterLabel(t, value, app.country) }));

  const artwork = (uri: string | undefined) =>
    uri ? (
      <Image source={{ uri }} style={styles.art} resizeMode="cover" />
    ) : (
      <View style={[styles.art, styles.artFallback, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name="mic-outline" size={20} color={theme.textMuted} />
      </View>
    );

  const renderEpisode = useCallback(
    ({ item, index }: { item: ChartEpisode; index: number }) => {
      const when = item.publishedAt
        ? formatRelativeTime(item.publishedAt, Date.now(), app.uiLanguage)
        : '';
      const meta = [item.showName, when, formatDuration(item.durationSeconds)]
        .filter(Boolean)
        .join(' · ');
      const nowPlaying = player.isCurrent(item.audioUrl);
      // With audio it plays here; without, Apple's page is the only way to hear it.
      const onPress = item.audioUrl
        ? () =>
            player.start({
              title: item.title,
              show: item.showName,
              audioUrl: item.audioUrl as string,
              artworkUrl: item.artworkUrl,
            })
        : item.appleUrl
          ? () => openUrl(item.appleUrl as string)
          : undefined;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.title}
          disabled={!onPress}
          onPress={onPress}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {nowPlaying ? (
            <Ionicons
              name={player.playing ? 'volume-high' : 'pause'}
              size={16}
              color={theme.accent}
              style={styles.rankIcon}
            />
          ) : (
            <Text style={[styles.rank, { color: theme.textMuted }]}>{index + 1}</Text>
          )}
          {artwork(item.artworkUrl)}

          <View style={styles.rowText}>
            <Text
              style={[styles.name, { color: nowPlaying ? theme.accent : theme.text }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>

          {item.feedUrl ? (
            // The row plays this episode; this opens the rest of the show.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.moreFromShowLabel(item.showName)}
              hitSlop={8}
              onPress={() =>
                state.openPodcast({
                  id: item.showId ?? item.id,
                  name: item.showName,
                  artist: '',
                  artworkUrl: item.artworkUrl,
                  feedUrl: item.feedUrl,
                  appleUrl: item.appleUrl,
                })
              }
              style={styles.sideButton}
            >
              <Ionicons name="list" size={20} color={theme.textMuted} />
            </Pressable>
          ) : (
            <Ionicons
              name={item.audioUrl ? 'play-circle-outline' : 'open-outline'}
              size={22}
              color={theme.accent}
            />
          )}
        </Pressable>
      );
    },
    [theme, app.uiLanguage, t, state.openPodcast, player],
  );

  const renderShow = useCallback(
    ({ item, index }: { item: Podcast; index: number }) => {
      const latest = item.latestEpisodeAt
        ? formatRelativeTime(item.latestEpisodeAt, Date.now(), app.uiLanguage)
        : '';

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.name}
          onPress={() => state.openPodcast(item)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.rank, { color: theme.textMuted }]}>{index + 1}</Text>
          {artwork(item.artworkUrl)}

          <View style={styles.rowText}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
              {[item.artist, latest].filter(Boolean).join(' · ')}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      );
    },
    [theme, app.uiLanguage, state.openPodcast],
  );

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.text }]}>{t.podcastsTitle}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {showingShows
          ? t.recentShowsSubtitle(scopeName, RECENT_DAYS)
          : t.podcastsSubtitle(scopeName, RECENT_DAYS)}
      </Text>

      <View style={styles.filter}>
        <SegmentedControl
          theme={theme}
          options={regionOptions}
          value={app.region}
          onChange={app.setRegion}
          compact
        />
      </View>
    </View>
  );

  const empty = state.loading ? (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.accent} />
    </View>
  ) : state.failed ? (
    <EmptyState
      theme={theme}
      icon="mic-off-outline"
      title={t.noPodcastsTitle}
      message={t.noPodcastsMessage}
    />
  ) : (
    <EmptyState
      theme={theme}
      icon="time-outline"
      title={t.noRecentPodcastsTitle}
      message={t.noRecentPodcastsMessage(RECENT_DAYS)}
    />
  );

  const refreshControl = (
    <RefreshControl
      refreshing={state.loading && (state.trending.length > 0 || state.podcasts.length > 0)}
      onRefresh={state.refresh}
      tintColor={theme.accent}
      colors={[theme.accent]}
    />
  );

  return (
    <>
      {showingShows ? (
        <FlatList
          data={state.podcasts}
          keyExtractor={(item) => item.id}
          renderItem={renderShow}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
        />
      ) : (
        <FlatList
          data={state.trending}
          keyExtractor={(item) => item.id}
          renderItem={renderEpisode}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
        />
      )}

      <PodcastSheet state={state} theme={theme} app={app} />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
  },
  filter: {
    marginHorizontal: -14,
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
  rankIcon: {
    width: 18,
    textAlign: 'center',
  },
  art: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
  },
  sideButton: {
    padding: 4,
  },
  loading: {
    alignItems: 'center',
    paddingTop: 48,
  },
});
