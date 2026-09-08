import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SourceFilterSheet } from './src/components/SourceFilterSheet';
import { TabBar, type TabKey } from './src/components/TabBar';
import { useNewsApp } from './src/hooks/useNewsApp';
import { FeedScreen } from './src/screens/FeedScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { useTheme } from './src/theme';

function AppShell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const app = useNewsApp();

  const [tab, setTab] = useState<TabKey>('feed');
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <View style={styles.content}>
        {!app.ready ? (
          <View style={styles.splash}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : tab === 'feed' ? (
          <FeedScreen app={app} theme={theme} onOpenFilters={() => setFiltersOpen(true)} />
        ) : (
          <SavedScreen app={app} theme={theme} />
        )}
      </View>

      <TabBar
        theme={theme}
        active={tab}
        savedCount={app.savedArticles.length}
        onChange={setTab}
        bottomInset={insets.bottom}
      />

      <SourceFilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
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
