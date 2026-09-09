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
import { SegmentedControl } from '../components/SegmentedControl';
import { SourceChips } from '../components/SourceChips';
import type { NewsApp } from '../hooks/useNewsApp';
import { formatRelativeTime } from '../services/newsService';
import { openArticle } from '../services/openArticle';
import type { Theme } from '../theme';
import type { Article, LanguageFilter, RegionFilter } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
  onOpenFilters: () => void;
}

export function FeedScreen({ app, theme, onOpenFilters }: Props) {
  const { t } = app;
  const failedCount = Object.keys(app.errors).length;

  const regionOptions: { value: RegionFilter; label: string }[] = [
    { value: 'all', label: t.regionFilter.all },
    { value: 'turkey', label: t.regionFilter.turkey },
    { value: 'world', label: t.regionFilter.world },
  ];

  const languageOptions: { value: LanguageFilter; label: string }[] = [
    { value: 'all', label: t.languageFilterOption.all },
    { value: 'tr', label: t.languageFilterOption.tr },
    { value: 'en', label: t.languageFilterOption.en },
  ];

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard
        article={item}
        theme={theme}
        language={app.uiLanguage}
        strings={t}
        saved={app.isSaved(item.id)}
        onPress={openArticle}
        onToggleSave={app.toggleSaved}
      />
    ),
    [theme, app.uiLanguage, t, app.isSaved, app.toggleSaved],
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>{t.feedTitle}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {t.sourceCount(app.activeSources.length, app.regionSources.length)}
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

      <SegmentedControl
        theme={theme}
        options={regionOptions}
        value={app.region}
        onChange={app.setRegion}
      />

      <SegmentedControl
        theme={theme}
        options={languageOptions}
        value={app.languageFilter}
        onChange={app.setLanguageFilter}
        compact
      />

      <SourceChips
        theme={theme}
        sources={app.regionSources}
        isEnabled={app.isSourceEnabled}
        onToggle={app.toggleSource}
      />

      {failedCount > 0 ? (
        <Text style={[styles.warning, { color: theme.danger }]}>
          {t.sourcesUnreachable(failedCount)}
        </Text>
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
      return (
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

    return (
      <EmptyState
        theme={theme}
        icon="cloud-offline-outline"
        title={t.nothingToShowTitle}
        message={t.nothingToShowMessage}
      />
    );
  };

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
