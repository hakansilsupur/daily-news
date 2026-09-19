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
import type { Theme } from '../theme';
import type { Podcast, RegionFilter } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
}

/** The popular-podcast chart for the chosen country, or worldwide. */
export function PodcastsScreen({ app, theme }: Props) {
  const { t } = app;
  const state = usePodcasts(app.country, app.region, true);

  const regionOptions: { value: RegionFilter; label: string }[] = (
    ['all', 'local', 'world'] as RegionFilter[]
  ).map((value) => ({ value, label: regionFilterLabel(t, value, app.country) }));

  const renderItem = useCallback(
    ({ item, index }: { item: Podcast; index: number }) => (
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

        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.art} resizeMode="cover" />
        ) : (
          <View style={[styles.art, styles.artFallback, { backgroundColor: theme.surfaceAlt }]}>
            <Ionicons name="mic-outline" size={22} color={theme.textMuted} />
          </View>
        )}

        <View style={styles.rowText}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.artist, { color: theme.textMuted }]} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
    ),
    [theme, state.openPodcast],
  );

  return (
    <>
      <FlatList
        data={state.podcasts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{t.podcastsTitle}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {t.podcastsSubtitle(
                app.region === 'world' ? t.worldLabel : t.countryName[app.country],
              )}
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
        }
        ListEmptyComponent={
          state.loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : (
            <EmptyState
              theme={theme}
              icon="mic-off-outline"
              title={t.noPodcastsTitle}
              message={t.noPodcastsMessage}
            />
          )
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={state.loading && state.podcasts.length > 0}
            onRefresh={state.refresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      />

      <PodcastSheet state={state} theme={theme} app={app} />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
  },
  filter: {
    marginHorizontal: -16,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
  art: {
    width: 64,
    height: 64,
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
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  artist: {
    fontSize: 12,
  },
  loading: {
    alignItems: 'center',
    paddingTop: 48,
  },
});
