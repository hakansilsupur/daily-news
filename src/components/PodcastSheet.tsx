import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NewsApp } from '../hooks/useNewsApp';
import type { PodcastsState } from '../hooks/usePodcasts';
import { formatRelativeTime } from '../services/newsService';
import { openUrl } from '../services/openArticle';
import { formatDuration } from '../services/podcasts';
import type { Theme } from '../theme';
import type { PodcastEpisode } from '../types';

interface Props {
  state: PodcastsState;
  theme: Theme;
  app: NewsApp;
}

/**
 * A show's recent episodes. Tapping one hands the audio to the system, which
 * is where playback belongs until the app carries a player of its own.
 */
export function PodcastSheet({ state, theme, app }: Props) {
  const { t } = app;
  const insets = useSafeAreaInsets();
  const show = state.selected;

  const renderEpisode = ({ item }: { item: PodcastEpisode }) => {
    const when = formatRelativeTime(item.publishedAt, Date.now(), app.uiLanguage);
    const length = formatDuration(item.durationSeconds);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => openUrl(item.audioUrl)}
        style={({ pressed }) => [
          styles.episode,
          { borderBottomColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="play-circle" size={30} color={theme.accent} />

        <View style={styles.episodeText}>
          <Text style={[styles.episodeTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.episodeMeta, { color: theme.textMuted }]} numberOfLines={1}>
            {[when, length].filter(Boolean).join(' · ')}
          </Text>
          {item.summary ? (
            <Text style={[styles.episodeSummary, { color: theme.textMuted }]} numberOfLines={2}>
              {item.summary}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={show !== null} animationType="slide" onRequestClose={state.closePodcast} transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            {show?.artworkUrl ? (
              <Image source={{ uri: show.artworkUrl }} style={styles.art} resizeMode="cover" />
            ) : null}

            <View style={styles.headerText}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
                {show?.name}
              </Text>
              <Text style={[styles.artist, { color: theme.textMuted }]} numberOfLines={1}>
                {show?.artist}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.closeLabel}
              hitSlop={10}
              onPress={state.closePodcast}
            >
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          <FlatList
            data={state.episodes}
            keyExtractor={(item) => item.id}
            renderItem={renderEpisode}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
            ListEmptyComponent={
              state.episodesLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              ) : (
                <View style={styles.loading}>
                  <Text style={[styles.empty, { color: theme.textMuted }]}>
                    {show?.feedUrl ? t.noEpisodes : t.noPodcastFeed}
                  </Text>

                  {show?.appleUrl ? (
                    <Pressable
                      onPress={() => openUrl(show.appleUrl as string)}
                      style={[styles.appleButton, { borderColor: theme.accent }]}
                    >
                      <Text style={[styles.appleButtonText, { color: theme.accent }]}>
                        {t.openInApple}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '88%',
    flexShrink: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  artist: {
    fontSize: 12,
  },
  list: {
    flexShrink: 1,
  },
  episode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  episodeText: {
    flex: 1,
    gap: 2,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  episodeMeta: {
    fontSize: 12,
  },
  episodeSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  loading: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  appleButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  appleButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
