import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ArticleCard } from '../components/ArticleCard';
import { EmptyState } from '../components/EmptyState';
import { FeedTabStrip } from '../components/FeedTabStrip';
import { SegmentedControl } from '../components/SegmentedControl';
import { SourceChips } from '../components/SourceChips';
import { TranslationChips } from '../components/TranslationChips';
import { TrendingTopicCard } from '../components/TrendingTopicCard';
import { TRENDING_TAB_ID } from '../data/tabs';
import type { TrendingTopic } from '../services/trending';
import type { NewsApp } from '../hooks/useNewsApp';
import { useTranslationThrottled } from '../hooks/useTranslatedPreview';
import { regionFilterLabel } from '../i18n';
import { formatRelativeTime } from '../services/newsService';
import { openArticle } from '../services/openArticle';
import type { Theme } from '../theme';
import type { Article, FeedTab, RegionFilter } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
  onOpenFilters: () => void;
  onAddTab: () => void;
  onEditTab: (tab: FeedTab) => void;
}

export function FeedScreen({ app, theme, onOpenFilters, onAddTab, onEditTab }: Props) {
  const { t, selectedTab } = app;
  const failedCount = Object.keys(app.errors).length;
  const translationThrottled = useTranslationThrottled();

  const regionOptions: { value: RegionFilter; label: string }[] = (
    ['all', 'local', 'world'] as RegionFilter[]
  ).map((value) => ({ value, label: regionFilterLabel(t, value, app.country) }));

  const trending = app.selectedTabId === TRENDING_TAB_ID;

  const renderTopic = useCallback(
    ({ item, index }: { item: TrendingTopic; index: number }) => (
      <TrendingTopicCard
        topic={item}
        rank={index + 1}
        theme={theme}
        language={app.uiLanguage}
        strings={t}
        translate={app.translatePreviews}
        translateInto={app.translationLanguage}
        onPress={openArticle}
      />
    ),
    [theme, app.uiLanguage, t, app.translatePreviews, app.translationLanguage],
  );

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard
        article={item}
        theme={theme}
        language={app.uiLanguage}
        strings={t}
        translate={app.translatePreviews}
        translateInto={app.translationLanguage}
        saved={app.isSaved(item.id)}
        onPress={openArticle}
        onToggleSave={app.toggleSaved}
      />
    ),
    [theme, app.uiLanguage, t, app.translatePreviews, app.translationLanguage, app.isSaved, app.toggleSaved],
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            {trending ? t.trendingTitle : selectedTab ? selectedTab.name : t.feedTitle}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {trending
              ? t.trendingSubtitle(app.activeSources.length)
              : selectedTab
                ? t.tabSelectedCount(app.activeSources.length)
                : t.sourceCount(app.activeSources.length, app.regionSources.length)}
            {app.lastUpdated
              ? t.updatedSuffix(formatRelativeTime(app.lastUpdated, Date.now(), app.uiLanguage))
              : ''}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.filterSourcesLabel}
          onPress={onOpenFilters}
          style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="options-outline" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={16} color={theme.textMuted} />
        <TextInput
          value={app.query}
          onChangeText={app.setQuery}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
        />
        {app.query ? (
          <Pressable accessibilityLabel={t.clearSearchLabel} hitSlop={8} onPress={() => app.setQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FeedTabStrip
        theme={theme}
        strings={t}
        tabs={app.feedTabs}
        selectedId={app.selectedTabId}
        onSelect={app.selectTab}
        onEdit={onEditTab}
        onAdd={onAddTab}
      />

      {/* Reading language is a presentation choice, not a filter, so it applies
          on a pinned tab too — unlike the region and source controls below. */}
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

      {/* A pinned tab is its own fixed selection, so the ad-hoc filters below
          would only contradict it — they belong to the "All" tab alone. */}
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

      {failedCount > 0 ? (
        <Text style={[styles.warning, { color: theme.danger }]}>
          {t.sourcesUnreachable(failedCount)}
        </Text>
      ) : null}

      {translationThrottled && app.translatePreviews ? (
        <Text style={[styles.warning, { color: theme.textMuted }]}>{t.translationPaused}</Text>
      ) : null}
    </View>
  );

  const listEmpty = () => {
    if (app.loading && !app.refreshing) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t.fetchingFeeds}</Text>
        </View>
      );
    }

    if (app.activeSources.length === 0) {
      return selectedTab ? (
        <EmptyState
          theme={theme}
          icon="albums-outline"
          title={t.emptyTabTitle}
          message={t.emptyTabMessage}
          actionLabel={t.editTabAction}
          onAction={() => onEditTab(selectedTab)}
        />
      ) : (
        <EmptyState
          theme={theme}
          icon="funnel-outline"
          title={t.noSourcesTitle}
          message={t.noSourcesMessage}
          actionLabel={t.chooseSources}
          onAction={onOpenFilters}
        />
      );
    }

    if (app.query) {
      return (
        <EmptyState
          theme={theme}
          icon="search-outline"
          title={t.noMatchesTitle}
          message={t.noMatchesMessage(app.query)}
        />
      );
    }

    // Articles arrived, but no story is carried by enough sources to count.
    if (trending) {
      return (
        <EmptyState
          theme={theme}
          icon="trending-up-outline"
          title={t.noTrendsTitle}
          message={t.noTrendsMessage}
        />
      );
    }

    return (
      <EmptyState
        theme={theme}
        icon="cloud-offline-outline"
        title={t.nothingToShowTitle}
        message={t.nothingToShowMessage}
      />
    );
  };

  if (trending) {
    return (
      <FlatList
        data={app.trendingTopics}
        keyExtractor={(item) => item.key}
        renderItem={renderTopic}
        ListHeaderComponent={header}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={4}
        refreshControl={
          <RefreshControl
            refreshing={app.refreshing}
            onRefresh={app.refresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      />
    );
  }

  return (
    <FlatList
      data={app.articles}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={listEmpty}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews
      initialNumToRender={8}
      windowSize={11}
      refreshControl={
        <RefreshControl
          refreshing={app.refreshing}
          onRefresh={app.refresh}
          tintColor={theme.accent}
          colors={[theme.accent]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  headerBlock: {
    gap: 12,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  loading: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
});
