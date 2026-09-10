import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedControl } from './SegmentedControl';
import { isAlreadyAdded, searchCatalog, SOURCE_CATALOG, type CatalogEntry } from '../data/catalog';
import type { NewsApp } from '../hooks/useNewsApp';
import {
  discoverFeeds,
  looksLikeUrl,
  normalizeSiteUrl,
  type DiscoveredFeed,
} from '../services/discovery';
import type { Theme } from '../theme';
import type { Region, RegionFilter } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  app: NewsApp;
}

type DiscoveryState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; feeds: DiscoveredFeed[] }
  | { status: 'error' };

/**
 * Search-first way to add a source: type a name to filter the bundled
 * directory, or paste a site address and let the app find that site's feeds.
 */
export function AddSourceSheet({ visible, onClose, theme, app }: Props) {
  const { t } = app;
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<RegionFilter>('all');
  const [discovery, setDiscovery] = useState<DiscoveryState>({ status: 'idle' });
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (visible) return;
    // Leaving the sheet cancels any lookup still running behind it.
    inFlight.current?.abort();
    setQuery('');
    setDiscovery({ status: 'idle' });
  }, [visible]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const matches = useMemo(
    () => searchCatalog(SOURCE_CATALOG, query, { region }),
    [query, region],
  );

  const siteUrl = looksLikeUrl(query) ? normalizeSiteUrl(query) : null;
  const host = siteUrl ? new URL(siteUrl).hostname.replace(/^www\./, '') : null;

  const runDiscovery = async () => {
    if (!siteUrl) return;

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setDiscovery({ status: 'searching' });

    try {
      const feeds = await discoverFeeds(siteUrl, controller.signal);
      if (controller.signal.aborted) return;
      setDiscovery({ status: 'done', feeds });
    } catch {
      if (!controller.signal.aborted) setDiscovery({ status: 'error' });
    }
  };

  const addFromCatalog = (entry: CatalogEntry) => {
    app.addCustomSource({
      name: entry.name,
      feedUrl: entry.feedUrl,
      region: entry.region,
      language: entry.language,
      category: entry.category,
    });
  };

  const addDiscovered = (feed: DiscoveredFeed) => {
    app.addCustomSource({
      name: feed.title,
      feedUrl: feed.url,
      // The region filter doubles as the caller's intent for a discovered feed.
      region: (region === 'all' ? 'world' : region) as Region,
    });
  };

  const regionOptions: { value: RegionFilter; label: string }[] = [
    { value: 'all', label: t.regionFilter.all },
    { value: 'turkey', label: t.regionFilter.turkey },
    { value: 'world', label: t.regionFilter.world },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>{t.findSourcesTitle}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t.closeLabel} hitSlop={10} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>

            <View style={styles.searchBlock}>
              <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search" size={16} color={theme.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t.findSourcesPlaceholder}
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.searchInput, { color: theme.text }]}
                  returnKeyType="search"
                  onSubmitEditing={() => void runDiscovery()}
                />
                {query ? (
                  <Pressable accessibilityLabel={t.clearSearchLabel} hitSlop={8} onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              <SegmentedControl
                theme={theme}
                options={regionOptions}
                value={region}
                onChange={setRegion}
                compact
                flush
              />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {host ? (
                <View style={styles.group}>
                  <Pressable
                    onPress={() => void runDiscovery()}
                    style={[styles.siteButton, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
                  >
                    <Ionicons name="globe-outline" size={18} color={theme.accent} />
                    <Text style={[styles.siteButtonText, { color: theme.accent }]} numberOfLines={1}>
                      {t.searchSiteAction(host)}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {discovery.status === 'searching' ? (
                <View style={styles.searching}>
                  <ActivityIndicator color={theme.accent} />
                  <Text style={[styles.searchingText, { color: theme.textMuted }]}>{t.searching}</Text>
                </View>
              ) : null}

              {discovery.status === 'error' ? (
                <View style={styles.group}>
                  <Text style={[styles.note, { color: theme.danger }]}>{t.discoveredError}</Text>
                </View>
              ) : null}

              {discovery.status === 'done' ? (
                <View style={styles.group}>
                  <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{t.discoveredGroup}</Text>

                  {discovery.feeds.length === 0 ? (
                    <Text style={[styles.note, { color: theme.textMuted }]}>{t.discoveredEmpty}</Text>
                  ) : (
                    discovery.feeds.map((feed) => {
                      const added = app.allSources.some((source) => source.feedUrl === feed.url);
                      return (
                        <ResultRow
                          key={feed.url}
                          theme={theme}
                          title={feed.title}
                          subtitle={`${t.feedArticleCount(feed.articleCount)} · ${feed.url}`}
                          added={added}
                          addLabel={t.addLabel}
                          addedLabel={t.addedLabel}
                          onAdd={() => addDiscovered(feed)}
                        />
                      );
                    })
                  )}
                </View>
              ) : null}

              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{t.directoryGroup}</Text>

                {matches.length === 0 ? (
                  <Text style={[styles.note, { color: theme.textMuted }]}>{t.directoryEmpty(query)}</Text>
                ) : (
                  matches.map((entry) => (
                    <ResultRow
                      key={entry.id}
                      theme={theme}
                      title={entry.name}
                      subtitle={`${t.regionLabel[entry.region]} · ${t.categoryLabel[entry.category]} · ${entry.language.toUpperCase()}`}
                      added={isAlreadyAdded(entry, app.allSources)}
                      addLabel={t.addLabel}
                      addedLabel={t.addedLabel}
                      onAdd={() => addFromCatalog(entry)}
                    />
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface ResultRowProps {
  theme: Theme;
  title: string;
  subtitle: string;
  added: boolean;
  addLabel: string;
  addedLabel: string;
  onAdd: () => void;
}

function ResultRow({ theme, title, subtitle, added, addLabel, addedLabel, onAdd }: ResultRowProps) {
  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {added ? (
        <View style={styles.addedBadge}>
          <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
          <Text style={[styles.addedText, { color: theme.accent }]}>{addedLabel}</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${addLabel} ${title}`}
          onPress={onAdd}
          style={[styles.addButton, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.addButtonText, { color: theme.accentText }]}>{addLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    maxHeight: '88%',
  },
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchBlock: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  scroll: {
    flexShrink: 1,
  },
  group: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 8,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
  },
  siteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  siteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  searching: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 8,
  },
  searchingText: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  addedText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
