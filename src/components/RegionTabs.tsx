import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '../theme';
import type { RegionFilter } from '../types';

const OPTIONS: { value: RegionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'turkey', label: 'Türkiye' },
  { value: 'world', label: 'Worldwide' },
];

interface Props {
  theme: Theme;
  value: RegionFilter;
  onChange: (value: RegionFilter) => void;
}

export function RegionTabs({ theme, value, onChange }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceAlt }]}>
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.tab,
              selected && { backgroundColor: theme.accent },
            ]}
          >
            <Text
              style={[
                styles.label,
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
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
