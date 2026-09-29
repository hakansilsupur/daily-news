import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FeedTabStrip } from './FeedTabStrip';
import { SegmentedControl } from './SegmentedControl';
import { SourceChips } from './SourceChips';
import { TranslationChips } from './TranslationChips';
import type { NewsApp } from '../hooks/useNewsApp';
import { useTranslationThrottled } from '../hooks/useTranslatedPreview';
import { regionFilterLabel } from '../i18n';
import type { Theme } from '../theme';
import type { FeedTab, RegionFilter } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
  title: string;
  subtitle: string;
  /** Whether the search box and the settings below it are showing. */
  expanded: boolean;
  onToggle: () => void;
  onOpenFilters: () => void;
  onAddTab: () => void;
  onEditTab: (tab: FeedTab) => void;
}

/**
 * The fixed top of the feed: a compact bar, the settings it hides, and the tab
 * strip. None of it scrolls away — the pages below it do the scrolling — so the
 * tabs stay reachable wherever you are in a timeline.
 *
 * Everything that configures the feed lives behind the bar: touching anywhere
 * along the top opens it, and it closes the same way. Reading is the common
 * case and setting things up is the rare one, so the rare one gets the tap.
 */
export const FeedHeader = forwardRef<TextInput, Props>(function FeedHeader(
  { app, theme, title, subtitle, expanded, onToggle, onOpenFilters, onAddTab, onEditTab },
  searchRef,
) {
  const { t, selectedTab } = app;
  const failedCount = Object.keys(app.errors).length;
  const translationThrottled = useTranslationThrottled();

  const regionOptions: { value: RegionFilter; label: string }[] = (
    ['all', 'local', 'world'] as RegionFilter[]
  ).map((value) => ({ value, label: regionFilterLabel(t, value, app.country) }));

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? t.hideSettingsLabel : t.showSettingsLabel}
        onPress={onToggle}
        style={styles.bar}
      >
        <View style={styles.barText}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'search'}
          size={20}
          color={theme.textMuted}
          style={styles.barIcon}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.filterSourcesLabel}
          hitSlop={8}
          onPress={onOpenFilters}
          style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="options-outline" size={20} color={theme.text} />
        </Pressable>
      </Pressable>

      {expanded ? (
        <View style={styles.panel}>
          <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              ref={searchRef}
              value={app.query}
              onChangeText={app.setQuery}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
            />
            {app.query ? (
              <Pressable
                accessibilityLabel={t.clearSearchLabel}
                hitSlop={8}
                onPress={() => app.setQuery('')}
              >
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Reading language is a presentation choice, not a filter, so it
              applies on a pinned tab too — unlike the controls below it. */}
          <TranslationChips
            theme={theme}
            strings={t}
            enabled={app.translatePreviews}
            language={app.translationLanguage}
            onChange={({ enabled, language }) => {
              app.setTranslatePreviews(enabled);
              if (enabled) app.setTranslationLanguage(language);
            }}
          />

          {/* A pinned tab is its own fixed selection, so the ad-hoc filters
              would only contradict it — they belong to the other tabs. */}
          {selectedTab ? null : (
            <>
              <SegmentedControl
                theme={theme}
                options={regionOptions}
                value={app.region}
                onChange={app.setRegion}
              />

              <SourceChips
                theme={theme}
                sources={app.regionSources}
                isEnabled={app.isSourceEnabled}
                onToggle={app.toggleSource}
              />
            </>
          )}
        </View>
      ) : null}

      {failedCount > 0 ? (
        <Text style={[styles.warning, { color: theme.danger }]}>
          {t.sourcesUnreachable(failedCount)}
        </Text>
      ) : null}

      {translationThrottled && app.translatePreviews ? (
        <Text style={[styles.warning, { color: theme.textMuted }]}>{t.translationPaused}</Text>
      ) : null}

      <FeedTabStrip
        theme={theme}
        strings={t}
        tabs={app.feedTabs}
        selectedId={app.selectedTabId}
        onSelect={app.selectTab}
        onEdit={onEditTab}
        onAdd={onAddTab}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  barText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  barIcon: {
    // Part of the bar's own press target: the chevron is a hint, not a button.
    paddingHorizontal: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    gap: 12,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
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
  warning: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
