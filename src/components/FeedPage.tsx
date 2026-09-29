import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ArticleCard } from './ArticleCard';
import { EmptyState } from './EmptyState';
import { TrendingTopicCard } from './TrendingTopicCard';
import { TRENDING_TAB_ID } from '../data/tabs';
import type { NewsApp } from '../hooks/useNewsApp';
import { openArticle } from '../services/openArticle';
import type { TrendingTopic } from '../services/trending';
import type { Theme } from '../theme';
import type { Article, FeedTab } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
  tabId: string;
  /** The page in view. Only it may claim the screen with a spinner or a prompt. */
  active: boolean;
  width: number;
  onOpenFilters: () => void;
  onEditTab: (tab: FeedTab) => void;
}

/**
 * One tab's timeline: a full-width page inside the pager.
 *
 * A page that is not in view still draws whatever was last fetched for it, so
 * the timeline sliding in under your thumb has headlines on it. What it does
 * not do is speak for itself — spinners, empty states and prompts belong to the
 * page you are actually looking at.
 */
export function FeedPage({ app, theme, tabId, active, width, onOpenFilters, onEditTab }: Props) {
  const { t } = app;
  const trending = tabId === TRENDING_TAB_ID;
  const tab = app.feedTabs.find((item) => item.id === tabId) ?? null;

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
    [
      theme,
      app.uiLanguage,
      t,
      app.translatePreviews,
      app.translationLanguage,
      app.isSaved,
      app.toggleSaved,
    ],
  );

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

  const refreshControl = (
    <RefreshControl
      refreshing={app.refreshing && active}
      onRefresh={app.refresh}
      tintColor={theme.accent}
      colors={[theme.accent]}
    />
  );

  const spinner = (label: string) => (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.loadingText, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );

  // Top stories come from outside the user's sources; when that endpoint cannot
  // be reached, the tab still works by grouping the feed the user already has.
  if (trending && (app.topStories.length > 0 || (active && app.topStoriesLoading))) {
    return (
      <View style={{ width }}>
        <FlatList
          data={app.topStories}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={active && app.topStoriesLoading ? spinner(t.fetchingFeeds) : null}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={6}
          refreshControl={refreshControl}
        />
      </View>
    );
  }

  const empty = () => {
    if (!active) return null;

    if (app.loading && !app.refreshing) return spinner(t.fetchingFeeds);

    if (app.activeSources.length === 0) {
      return tab ? (
        <EmptyState
          theme={theme}
          icon="albums-outline"
          title={t.emptyTabTitle}
          message={t.emptyTabMessage}
          actionLabel={t.editTabAction}
          onAction={() => onEditTab(tab)}
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
      <View style={{ width }}>
        <FlatList
          data={app.trendingTopics}
          keyExtractor={(item) => item.key}
          renderItem={renderTopic}
          ListEmptyComponent={empty}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={4}
          refreshControl={refreshControl}
        />
      </View>
    );
  }

  return (
    <View style={{ width }}>
      <FlatList
        data={app.articlesForTab(tabId)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={empty}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        windowSize={11}
        refreshControl={refreshControl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The page is stretched to the pager's height; the list has to be told to
  // fill it, or it sizes itself to its contents and scrolls against nothing.
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
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
