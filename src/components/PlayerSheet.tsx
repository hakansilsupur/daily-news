import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeekBar } from './SeekBar';
import type { Strings } from '../i18n';
import {
  formatClock,
  formatRate,
  SKIP_BACK_SECONDS,
  SKIP_FORWARD_SECONDS,
} from '../player/playback';
import { usePlayer } from '../player/PlayerContext';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  strings: Strings;
}

/**
 * The full player: artwork, the scrubber with elapsed and remaining time, and
 * the controls a podcast needs — skip back 15, play, skip forward 30, and
 * speed. Closing it only minimises; the episode keeps playing in the bar.
 */
export function PlayerSheet({ theme, strings: t }: Props) {
  const player = usePlayer();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { current } = player;

  // Square artwork that leaves room for everything else on a short phone.
  const artSize = Math.min(width - 64, height * 0.42, 340);
  const remaining = Math.max(0, player.duration - player.position);

  return (
    <Modal
      visible={player.expanded && current !== null}
      animationType="slide"
      onRequestClose={() => player.setExpanded(false)}
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top + 6,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.collapsePlayerLabel}
            hitSlop={12}
            onPress={() => player.setExpanded(false)}
          >
            <Ionicons name="chevron-down" size={28} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>{t.nowPlaying}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.stopPlayerLabel}
            hitSlop={12}
            onPress={player.stop}
          >
            <Ionicons name="stop-circle-outline" size={26} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={styles.artWrap}>
          {current?.artworkUrl ? (
            <Image
              source={{ uri: current.artworkUrl }}
              style={[styles.art, { width: artSize, height: artSize }]}
            />
          ) : (
            <View
              style={[
                styles.art,
                styles.artFallback,
                { width: artSize, height: artSize, backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Ionicons name="mic" size={artSize / 3} color={theme.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.titles}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
            {current?.title}
          </Text>
          <Text style={[styles.show, { color: theme.accent }]} numberOfLines={1}>
            {current?.show}
          </Text>
        </View>

        <View style={styles.seek}>
          <SeekBar
            theme={theme}
            position={player.position}
            duration={player.duration}
            label={t.seekBarLabel}
            onSeek={player.seekTo}
          />
          <View style={styles.times}>
            <Text style={[styles.time, { color: theme.textMuted }]}>{formatClock(player.position)}</Text>
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {player.duration > 0 ? `-${formatClock(remaining)}` : player.waiting ? t.loadingAudio : ''}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.playbackSpeedLabel(formatRate(player.rate))}
            onPress={player.cycleRate}
            style={[styles.rate, { borderColor: theme.border }]}
          >
            <Text style={[styles.rateText, { color: theme.text }]}>{formatRate(player.rate)}</Text>
          </Pressable>

          <SkipButton
            theme={theme}
            icon="play-back"
            seconds={SKIP_BACK_SECONDS}
            label={t.skipBackLabel(SKIP_BACK_SECONDS)}
            onPress={() => player.seekBy(-SKIP_BACK_SECONDS)}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={player.playing ? t.pauseLabel : t.playLabel}
            onPress={player.toggle}
            style={[styles.playButton, { backgroundColor: theme.accent }]}
          >
            {player.waiting && !player.playing ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <Ionicons
                name={player.playing ? 'pause' : 'play'}
                size={34}
                color={theme.accentText}
                // The play triangle's visual centre sits left of its box.
                style={player.playing ? undefined : styles.playNudge}
              />
            )}
          </Pressable>

          <SkipButton
            theme={theme}
            icon="play-forward"
            seconds={SKIP_FORWARD_SECONDS}
            label={t.skipForwardLabel(SKIP_FORWARD_SECONDS)}
            onPress={() => player.seekBy(SKIP_FORWARD_SECONDS)}
          />

          {/* Balances the speed button so play stays centred. */}
          <View style={styles.rateSpacer} />
        </View>
      </View>
    </Modal>
  );
}

function SkipButton({
  theme,
  icon,
  seconds,
  label,
  onPress,
}: {
  theme: Theme;
  icon: 'play-back' | 'play-forward';
  seconds: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={styles.skip}
    >
      <Ionicons name={icon} size={26} color={theme.text} />
      <Text style={[styles.skipText, { color: theme.textMuted }]}>{seconds}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  artWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: {
    borderRadius: 16,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    gap: 4,
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  show: {
    fontSize: 14,
    fontWeight: '600',
  },
  seek: {
    marginBottom: 10,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  rate: {
    width: 52,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rateSpacer: {
    width: 52,
  },
  skip: {
    alignItems: 'center',
    width: 52,
  },
  skipText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playNudge: {
    marginLeft: 4,
  },
});
