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
import { RegionTabs } from '../components/RegionTabs';
import { SourceChips } from '../components/SourceChips';
import type { NewsApp } from '../hooks/useNewsApp';
import { formatRelativeTime } from '../services/newsService';
import { openArticle } from '../services/openArticle';
import type { Theme } from '../theme';
import type { Article } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
  onOpenFilters: () => void;
}

export function FeedScreen({ app, theme, onOpenFilters }: Props) {
  const failedCount = Object.keys(app.errors).length;

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard
        article={item}
        theme={theme}
        saved={app.isSaved(item.id)}
        onPress={openArticle}
        onToggleSave={app.toggleSaved}
      />
    ),
    [theme, app.isSaved, app.toggleSaved],
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Headlines</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {app.activeSources.length} of {app.regionSources.length} sources
            {app.lastUpdated ? ` · updated ${formatRelativeTime(app.lastUpdated)}` : ''}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter sources"
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
          placeholder="Search headlines"
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
        />
        {app.query ? (
          <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => app.setQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <RegionTabs theme={theme} value={app.region} onChange={app.setRegion} />

      <SourceChips
        theme={theme}
        sources={app.regionSources}
        isEnabled={app.isSourceEnabled}
        onToggle={app.toggleSource}
      />

      {failedCount > 0 ? (
        <Text style={[styles.warning, { color: theme.danger }]}>
          {failedCount} source{failedCount > 1 ? 's' : ''} could not be reached.
        </Text>
      ) : null}
    </View>
  );

  const listEmpty = () => {
    if (app.loading && !app.refreshing) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Fetching feeds…</Text>
        </View>
      );
    }

    if (app.activeSources.length === 0) {
      return (
        <EmptyState
          theme={theme}
          icon="funnel-outline"
          title="No sources selected"
          message="Turn on at least one source to start seeing headlines."
          actionLabel="Choose sources"
          onAction={onOpenFilters}
        />
      );
    }

    if (app.query) {
      return (
        <EmptyState
          theme={theme}
          icon="search-outline"
          title="No matches"
          message={`Nothing in the current feed matches “${app.query}”.`}
        />
      );
    }

    return (
      <EmptyState
        theme={theme}
        icon="cloud-offline-outline"
        title="Nothing to show"
        message="The selected feeds returned no articles. Pull down to try again."
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
