import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ArticleCard } from '../components/ArticleCard';
import { EmptyState } from '../components/EmptyState';
import type { NewsApp } from '../hooks/useNewsApp';
import { openArticle } from '../services/openArticle';
import type { Theme } from '../theme';
import type { Article } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
}

export function SavedScreen({ app, theme }: Props) {
  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard
        article={item}
        theme={theme}
        saved
        onPress={openArticle}
        onToggleSave={app.toggleSaved}
      />
    ),
    [theme, app.toggleSaved],
  );

  return (
    <FlatList
      data={app.savedArticles}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Saved</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {app.savedArticles.length} article{app.savedArticles.length === 1 ? '' : 's'} kept on this device
          </Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          theme={theme}
          icon="bookmark-outline"
          title="Nothing saved yet"
          message="Tap the bookmark on any headline to keep it here for later."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
