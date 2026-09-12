import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCountry, WORLD_LABEL } from '../data/countries';
import type { Theme } from '../theme';
import type { CountryCode, ScopeMode } from '../types';

interface Props {
  theme: Theme;
  mode: ScopeMode;
  country: CountryCode;
  onChangeMode: (mode: ScopeMode) => void;
  /** Opens the country picker. */
  onPickCountry: () => void;
}

/**
 * Scope selector: the selected country, international news, or both.
 *
 * The country tab doubles as the entry point to the country picker — pressing
 * it selects the country scope, and pressing it again (while selected) opens
 * the picker, which the chevron advertises.
 */
export function ScopeTabs({ theme, mode, country, onChangeMode, onPickCountry }: Props) {
  const selected = getCountry(country);
  const countryActive = mode === 'country';

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceAlt }]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: countryActive }}
        accessibilityLabel={selected.name}
        accessibilityHint={
          countryActive ? 'Opens the country picker' : 'Shows news from this country'
        }
        onPress={() => (countryActive ? onPickCountry() : onChangeMode('country'))}
        style={[styles.tab, styles.countryTab, countryActive && { backgroundColor: theme.accent }]}
      >
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text
          style={[styles.label, { color: countryActive ? theme.accentText : theme.textMuted }]}
          numberOfLines={1}
        >
          {selected.name}
        </Text>
        <Ionicons
          name="chevron-down"
          size={13}
          color={countryActive ? theme.accentText : theme.textMuted}
        />
      </Pressable>

      {(['world', 'all'] as ScopeMode[]).map((option) => {
        const isSelected = mode === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChangeMode(option)}
            style={[styles.tab, isSelected && { backgroundColor: theme.accent }]}
          >
            <Text
              style={[styles.label, { color: isSelected ? theme.accentText : theme.textMuted }]}
              numberOfLines={1}
            >
              {option === 'world' ? WORLD_LABEL : 'All'}
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
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryTab: {
    flexDirection: 'row',
    gap: 4,
    flexGrow: 1.3,
  },
  flag: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
});
