import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';

import type { Theme } from '../theme';
import type { NewsSource } from '../types';

interface Props {
  theme: Theme;
  sources: NewsSource[];
  isEnabled: (id: string) => boolean;
  onToggle: (id: string) => void;
}

/** Horizontal quick-toggles for every source in the current region. */
export function SourceChips({ theme, sources, isEnabled, onToggle }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {sources.map((source) => {
        const active = isEnabled(source.id);
        return (
          <Pressable
            key={source.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={source.name}
            onPress={() => onToggle(source.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.accentSoft : theme.surface,
                borderColor: active ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[styles.chipText, { color: active ? theme.accent : theme.textMuted }]}
              numberOfLines={1}
            >
              {source.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
