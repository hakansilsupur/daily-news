import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Strings } from '../i18n';
import { SKIP_FORWARD_SECONDS } from '../player/playback';
import { usePlayer } from '../player/PlayerContext';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  strings: Strings;
}

/**
 * The bar that sits above the tabs while an episode is loaded, on every tab —
 * the news keeps working underneath it. Tapping it opens the full player.
 */
export function MiniPlayer({ theme, strings: t }: Props) {
  const player = usePlayer();
  const { current } = player;
  if (!current) return null;

  const progress = player.duration > 0 ? Math.min(1, player.position / player.duration) : 0;

  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <View
          style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]}
        />
      </View>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.openPlayerLabel}
          onPress={() => player.setExpanded(true)}
          style={styles.info}
        >
          {current.artworkUrl ? (
            <Image source={{ uri: current.artworkUrl }} style={styles.art} />
          ) : (
            <View style={[styles.art, styles.artFallback, { backgroundColor: theme.surfaceAlt }]}>
              <Ionicons name="mic" size={18} color={theme.textMuted} />
            </View>
          )}
          <View style={styles.text}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {current.title}
            </Text>
            <Text style={[styles.show, { color: theme.textMuted }]} numberOfLines={1}>
              {player.waiting ? t.loadingAudio : current.show}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={player.playing ? t.pauseLabel : t.playLabel}
          hitSlop={8}
          onPress={player.toggle}
          style={styles.control}
        >
          {player.waiting && !player.playing ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <Ionicons name={player.playing ? 'pause' : 'play'} size={26} color={theme.text} />
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.skipForwardLabel(SKIP_FORWARD_SECONDS)}
          hitSlop={8}
          onPress={() => player.seekBy(SKIP_FORWARD_SECONDS)}
          style={styles.control}
        >
          <Ionicons name="play-forward" size={22} color={theme.text} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.stopPlayerLabel}
          hitSlop={8}
          onPress={player.stop}
          style={styles.control}
        >
          <Ionicons name="close" size={22} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  progressTrack: {
    height: 2,
  },
  progressFill: {
    height: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  art: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  show: {
    fontSize: 11,
    marginTop: 1,
  },
  control: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
