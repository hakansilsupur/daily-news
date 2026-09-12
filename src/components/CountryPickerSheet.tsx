import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DEFAULT_COUNTRY, searchCountries } from '../data/countries';
import type { Theme } from '../theme';
import type { Country, CountryCode } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  selected: CountryCode;
  /** Built-in source count per country code, shown as a subtitle. */
  counts: Record<string, number>;
  onSelect: (country: CountryCode) => void;
}

export function CountryPickerSheet({
  visible,
  onClose,
  theme,
  selected,
  counts,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCountries(query), [query]);

  const choose = (country: CountryCode) => {
    onSelect(country);
    setQuery('');
    onClose();
  };

  const renderItem = ({ item }: { item: Country }) => {
    const isSelected = item.code === selected;
    const count = counts[item.code] ?? 0;

    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={item.name}
        onPress={() => choose(item.code)}
        style={[
          styles.row,
          {
            backgroundColor: isSelected ? theme.accentSoft : theme.surface,
            borderColor: isSelected ? theme.accent : theme.border,
          },
        ]}
      >
        <Text style={styles.flag}>{item.flag}</Text>

        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: isSelected ? theme.accent : theme.text }]}>
            {item.name}
            {item.code === DEFAULT_COUNTRY ? '  ·  default' : ''}
          </Text>
          <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>
            {item.nativeName !== item.name ? `${item.nativeName} · ` : ''}
            {count} source{count === 1 ? '' : 's'}
          </Text>
        </View>

        {isSelected ? <Ionicons name="checkmark-circle" size={20} color={theme.accent} /> : null}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Choose a country</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          <View
            style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries"
              placeholderTextColor={theme.textMuted}
              autoCorrect={false}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {query ? (
              <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                No country matches “{query}”.
              </Text>
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
    maxHeight: '85%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    padding: 18,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  flag: {
    fontSize: 22,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
