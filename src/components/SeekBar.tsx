import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  /** Seconds. */
  position: number;
  /** Seconds; 0 while unknown, which leaves the bar inert. */
  duration: number;
  label: string;
  onSeek: (seconds: number) => void;
}

/**
 * The scrubber: tap anywhere to jump there, or drag. While a finger is down the
 * bar follows the finger, not the player — a stream reporting its position
 * every half second would otherwise yank the thumb back mid-drag — and the seek
 * is sent once, on release.
 */
export function SeekBar({ theme, position, duration, label, onSeek }: Props) {
  const track = useRef<View>(null);
  const bounds = useRef({ pageX: 0, width: 0 });
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  // Handlers are created once, so they read the latest props through a ref.
  const latest = useRef({ duration, onSeek });
  latest.current = { duration, onSeek };

  const ratioAt = (pageX: number) => {
    const { pageX: left, width } = bounds.current;
    return width > 0 ? Math.min(1, Math.max(0, (pageX - left) / width)) : 0;
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.duration > 0,
      onMoveShouldSetPanResponder: () => latest.current.duration > 0,
      // Inside a sheet, a sideways drag here belongs to the bar, not the sheet.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => setDragRatio(ratioAt(event.nativeEvent.pageX)),
      onPanResponderMove: (_event, gesture) => setDragRatio(ratioAt(gesture.moveX)),
      onPanResponderRelease: (_event, gesture) => {
        latest.current.onSeek(ratioAt(gesture.moveX || gesture.x0) * latest.current.duration);
        setDragRatio(null);
      },
      onPanResponderTerminate: () => setDragRatio(null),
    }),
  ).current;

  const ratio = dragRatio ?? (duration > 0 ? Math.min(1, position / duration) : 0);

  return (
    <View
      ref={track}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(position) }}
      onLayout={() =>
        track.current?.measure((_x, _y, width, _height, pageX) => {
          bounds.current = { pageX, width };
        })
      }
      style={styles.hitArea}
      {...responder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: theme.accent }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: `${ratio * 100}%`,
            backgroundColor: theme.accent,
            transform: [{ scale: dragRatio === null ? 1 : 1.35 }],
          },
        ]}
      />
    </View>
  );
}

const THUMB = 14;

const styles = StyleSheet.create({
  // Taller than it looks: a 4pt line is a target no thumb can hit.
  hitArea: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -THUMB / 2,
    top: (32 - THUMB) / 2,
  },
});
