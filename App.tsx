import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddSourceSheet } from './src/components/AddSourceSheet';
import { FeedTabSheet } from './src/components/FeedTabSheet';
import { SourceFilterSheet } from './src/components/SourceFilterSheet';
import { TabBar, type TabKey } from './src/components/TabBar';
import { useNewsApp } from './src/hooks/useNewsApp';
import { FeedScreen } from './src/screens/FeedScreen';
import { PodcastsScreen } from './src/screens/PodcastsScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { useTheme } from './src/theme';
import type { FeedTab } from './src/types';

function AppShell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const app = useNewsApp();

  const [tab, setTab] = useState<TabKey>('feed');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [findSourcesOpen, setFindSourcesOpen] = useState(false);
  // undefined = closed, null = creating a tab, a FeedTab = editing that one.
  const [tabEditor, setTabEditor] = useState<FeedTab | null | undefined>(undefined);

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <View style={styles.content}>
        {!app.ready ? (
          <View style={styles.splash}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : tab === 'feed' ? (
          <FeedScreen
            app={app}
            theme={theme}
            onOpenFilters={() => setFiltersOpen(true)}
            onAddTab={() => setTabEditor(null)}
            onEditTab={setTabEditor}
          />
        ) : tab === 'podcasts' ? (
          <PodcastsScreen app={app} theme={theme} />
        ) : (
          <SavedScreen app={app} theme={theme} />
        )}
      </View>

      <TabBar
        theme={theme}
        strings={app.t}
        active={tab}
        savedCount={app.savedArticles.length}
        onChange={setTab}
        bottomInset={insets.bottom}
      />

      <SourceFilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onFindSources={() => setFindSourcesOpen(true)}
        theme={theme}
        app={app}
      />

      <AddSourceSheet
        visible={findSourcesOpen}
        onClose={() => setFindSourcesOpen(false)}
        theme={theme}
        app={app}
      />

      <FeedTabSheet
        tab={tabEditor}
        onClose={() => setTabEditor(undefined)}
        theme={theme}
        app={app}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
