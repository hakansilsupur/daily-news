import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '../theme';

export type TabKey = 'feed' | 'saved';

const TABS: {
  key: TabKey;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  activeIcon: ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'feed', label: 'Headlines', icon: 'newspaper-outline', activeIcon: 'newspaper' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline', activeIcon: 'bookmark' },
];

interface Props {
  theme: Theme;
  active: TabKey;
  savedCount: number;
  onChange: (tab: TabKey) => void;
  bottomInset: number;
}

export function TabBar({ theme, active, savedCount, onChange, bottomInset }: Props) {
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(bottomInset, 8),
        },
      ]}
    >
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const badge = tab.key === 'saved' && savedCount > 0 ? savedCount : null;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <View>
              <Ionicons
                name={selected ? tab.activeIcon : tab.icon}
                size={22}
                color={selected ? theme.accent : theme.textMuted}
              />
              {badge ? (
                <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.badgeText, { color: theme.accentText }]}>
                    {badge > 99 ? '99+' : badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: selected ? theme.accent : theme.textMuted }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -12,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
