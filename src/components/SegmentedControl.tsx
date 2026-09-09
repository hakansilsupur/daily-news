import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '../theme';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  theme: Theme;
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Smaller variant, for a secondary row under the primary one. */
  compact?: boolean;
  /** Drops the screen-edge margin, for use inside an already-padded container. */
  flush?: boolean;
}

/** Pill row used for the region and feed-language filters. */
export function SegmentedControl<T extends string>({
  theme,
  options,
  value,
  onChange,
  compact = false,
  flush = false,
}: Props<T>) {
  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        flush && styles.containerFlush,
        { backgroundColor: theme.surfaceAlt },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.tab,
              compact && styles.tabCompact,
              selected && { backgroundColor: theme.accent },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                compact && styles.labelCompact,
                { color: selected ? theme.accentText : theme.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 10,
    gap: 3,
  },
  containerCompact: {
    borderRadius: 9,
  },
  containerFlush: {
    marginHorizontal: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabCompact: {
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 12,
  },
});
