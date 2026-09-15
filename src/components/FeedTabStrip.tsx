import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ALL_TAB_ID, TRENDING_TAB_ID } from '../data/tabs';
import type { Strings } from '../i18n';
import type { Theme } from '../theme';
import type { FeedTab } from '../types';

interface Props {
  theme: Theme;
  strings: Strings;
  tabs: FeedTab[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Long-press on a pinned tab — opens it for editing. */
  onEdit: (tab: FeedTab) => void;
  onAdd: () => void;
}

/**
 * The row of pinned tabs across the top of the feed. "All" is always first and
 * cannot be removed; everything after it is a tab the user assembled, and the
 * trailing button adds another.
 */
export function FeedTabStrip({ theme, strings, tabs, selectedId, onSelect, onEdit, onAdd }: Props) {
  return (
    <View style={[styles.wrapper, { borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TabItem
          theme={theme}
          label={strings.trendingTab}
          selected={selectedId === TRENDING_TAB_ID}
          onPress={() => onSelect(TRENDING_TAB_ID)}
        />

        <TabItem
          theme={theme}
          label={strings.allTab}
          selected={selectedId === ALL_TAB_ID}
          onPress={() => onSelect(ALL_TAB_ID)}
        />

        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            theme={theme}
            label={tab.name}
            selected={selectedId === tab.id}
            onPress={() => onSelect(tab.id)}
            onLongPress={() => onEdit(tab)}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.addTab}
          onPress={onAdd}
          style={styles.addButton}
        >
          <Text style={[styles.addLabel, { color: theme.textMuted }]}>{strings.addTab}</Text>
          <Ionicons name="add" size={18} color={theme.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

interface TabItemProps {
  theme: Theme;
  label: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

function TabItem({ theme, label, selected, onPress, onLongPress }: TabItemProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          { color: selected ? theme.text : theme.textMuted, fontWeight: selected ? '800' : '600' },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.underline,
          { backgroundColor: selected ? theme.accent : 'transparent' },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  tab: {
    paddingHorizontal: 10,
    paddingTop: 8,
    alignItems: 'center',
    maxWidth: 180,
  },
  tabLabel: {
    fontSize: 15,
    paddingBottom: 8,
  },
  underline: {
    height: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 11,
  },
  addLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
