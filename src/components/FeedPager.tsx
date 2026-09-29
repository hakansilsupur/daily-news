import { useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { FeedPage } from './FeedPage';
import { feedPageIds, pageIndexOf } from '../data/tabs';
import type { NewsApp } from '../hooks/useNewsApp';
import type { Theme } from '../theme';
import type { FeedTab } from '../types';

interface Props {
  app: NewsApp;
  theme: Theme;
  onOpenFilters: () => void;
  onEditTab: (tab: FeedTab) => void;
}

/**
 * The tabs as pages you can slide between, rather than only chips you can tap.
 *
 * Only the page in view and its two neighbours are built; the rest are empty
 * space of the right width. That keeps a long strip of pinned tabs from meaning
 * a long strip of live lists, while the page you are about to reach is always
 * one of the three that exist.
 */
export function FeedPager({ app, theme, onOpenFilters, onEditTab }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const pageIds = useMemo(() => feedPageIds(app.feedTabs), [app.feedTabs]);
  const index = pageIndexOf(pageIds, app.selectedTabId);

  // Tapping a chip moves the pages; the pages moving selects a chip. Scrolling
  // to where we already are is a no-op, so the two cannot chase each other.
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  }, [index, width]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const landed = Math.round(event.nativeEvent.contentOffset.x / width);
    const id = pageIds[landed];
    if (id && id !== app.selectedTabId) app.selectTab(id);
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // A page is only ever a screen wide, so the offset is the index; laying
      // out on first measure avoids scrolling before there is a width to use.
      onLayout={() => scrollRef.current?.scrollTo({ x: index * width, animated: false })}
      onMomentumScrollEnd={onMomentumScrollEnd}
      style={styles.pager}
    >
      {pageIds.map((id, position) =>
        Math.abs(position - index) <= 1 ? (
          <FeedPage
            key={id}
            app={app}
            theme={theme}
            tabId={id}
            active={position === index}
            width={width}
            onOpenFilters={onOpenFilters}
            onEditTab={onEditTab}
          />
        ) : (
          <View key={id} style={{ width }} />
        ),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
});
