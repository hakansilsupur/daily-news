import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

import { ArticleCard } from '../components/ArticleCard';
import { EmptyState } from '../components/EmptyState';
import { FeedHeader } from '../components/FeedHeader';
import { FeedPager } from '../components/FeedPager';
import { TRENDING_TAB_ID } from '../data/tabs';
import type { NewsApp } from '../hooks/useNewsApp';
import { formatRelativeTime } from '../services/newsService';
import { openArticle } from '../services/openArticle';
import type { Theme } from '../theme';
import type { Article, FeedTab } from '../types';

// Harmless where it is not needed: on the New Architecture the method is gone
// and layout animations work without being switched on.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  app: NewsApp;
  theme: Theme;
  onOpenFilters: () => void;
  onAddTab: () => void;
  onEditTab: (tab: FeedTab) => void;
}

export function FeedScreen({ app, theme, onOpenFilters, onAddTab, onEditTab }: Props) {
  const { t, selectedTab } = app;
  const searchRef = useRef<TextInput>(null);
  const [expanded, setExpanded] = useState(false);

  const trending = app.selectedTabId === TRENDING_TAB_ID;
  const searching = app.query.trim().length > 0;

  const toggleSettings = () => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {
      // An animation is a nicety; the panel opens either way.
    }

    if (expanded) {
      // Closing the panel closes the search with it: leaving a query running
      // behind a shut drawer would show results with nothing explaining them.
      if (app.query) app.setQuery('');
      setExpanded(false);
      return;
    }

    setExpanded(true);
    // The search box is the reason the panel is usually opened, so it takes the
    // cursor; the keyboard can be dismissed without closing anything.
    setTimeout(() => searchRef.current?.focus(), 120);
  };

  const title = searching
    ? t.searchTitle
    : trending
      ? t.trendingTitle
      : selectedTab
        ? selectedTab.name
        : t.feedTitle;

  const subtitle =
    (searching
      ? t.searchSubtitle(app.searchResults.length, app.webResultCount)
      : trending
        ? app.topStories.length > 0
          ? t.trendingIndependent(
              app.region === 'world' ? t.worldLabel : t.countryName[app.country],
            )
          : t.trendingSubtitle(app.activeSources.length)
        : selectedTab
          ? t.tabSelectedCount(app.activeSources.length)
          : t.sourceCount(app.activeSources.length, app.regionSources.length)) +
    (app.lastUpdated
      ? t.updatedSuffix(formatRelativeTime(app.lastUpdated, Date.now(), app.uiLanguage))
      : '');

  const renderItem = ({ item }: { item: Article }) => (
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
  );

  return (
    <View style={styles.root}>
      <FeedHeader
        ref={searchRef}
        app={app}
        theme={theme}
        title={title}
        subtitle={subtitle}
        expanded={expanded}
        onToggle={toggleSettings}
        onOpenFilters={onOpenFilters}
        onAddTab={onAddTab}
        onEditTab={onEditTab}
      />

      {/* A query turns the screen into results: the user's own matches, then
          what the topic search found beyond them. It replaces the pages rather
          than living on one, since looking for a story is not a property of
          which tab you happened to be on. */}
      {searching ? (
        <FlatList
          data={app.searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            app.searchingWeb ? (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t.searchingWeb}</Text>
              </View>
            ) : (
              <EmptyState
                theme={theme}
                icon="search-outline"
                title={t.noMatchesTitle}
                message={t.noMatchesMessage(app.query)}
              />
            )
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={6}
          refreshControl={
            <RefreshControl
              refreshing={app.refreshing}
              onRefresh={app.refresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
        />
      ) : (
        <FeedPager
          app={app}
          theme={theme}
          onOpenFilters={onOpenFilters}
          onEditTab={onEditTab}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // The header takes what it needs; the results take the rest, rather than
  // sizing to their own content and running off the bottom of the screen.
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 10,
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
