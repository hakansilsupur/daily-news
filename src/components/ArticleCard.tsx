import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePreviewImage } from '../hooks/usePreviewImage';
import { useTranslatedPreview } from '../hooks/useTranslatedPreview';
import type { Strings } from '../i18n';
import { formatRelativeTime } from '../services/newsService';
import type { Theme } from '../theme';
import type { Article, TranslationLanguage, UiLanguage } from '../types';

interface Props {
  article: Article;
  theme: Theme;
  language: UiLanguage;
  strings: Strings;
  /** Machine-translate the preview into `translateInto` when it is in another language. */
  translate: boolean;
  translateInto: TranslationLanguage;
  saved: boolean;
  onPress: (article: Article) => void;
  onToggleSave: (article: Article) => void;
}

function ArticleCardBase({
  article,
  theme,
  language,
  strings,
  translate,
  translateInto,
  saved,
  onPress,
  onToggleSave,
}: Props) {
  const timeLabel = formatRelativeTime(article.publishedAt, Date.now(), language);
  const preview = useTranslatedPreview(article, translateInto, translate);
  const image = usePreviewImage(article, true);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={article.title}
      onPress={() => onPress(article)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {image ? (
        <Image
          source={{ uri: image.uri }}
          style={[styles.thumb, image.isLogo && { backgroundColor: theme.surfaceAlt, padding: 14 }]}
          resizeMode={image.isLogo ? 'contain' : 'cover'}
        />
      ) : (
        // No picture anywhere: the publisher's initial reads as deliberate,
        // where a repeated grey newspaper icon reads as something failing.
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.thumbInitial, { color: theme.textMuted }]}>
            {article.sourceName.trim().charAt(0).toLocaleUpperCase('tr') || '·'}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={[styles.source, { color: theme.accent }]} numberOfLines={1}>
            {article.sourceName}
          </Text>
          {timeLabel ? (
            <Text style={[styles.time, { color: theme.textMuted }]}>· {timeLabel}</Text>
          ) : null}
          {preview.translated ? (
            // Says plainly that these words are the machine's, not the publisher's.
            <Text style={[styles.badge, { color: theme.textMuted, borderColor: theme.border }]}>
              {strings.translatedBadge}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
          {preview.title}
        </Text>

        {preview.summary ? (
          <Text style={[styles.summary, { color: theme.textMuted }]} numberOfLines={3}>
            {preview.summary}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? strings.removeSavedLabel : strings.saveArticleLabel}
        hitSlop={10}
        onPress={() => onToggleSave(article)}
        style={styles.saveButton}
      >
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={saved ? theme.accent : theme.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 104,
    height: 104,
    borderRadius: 12,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitial: {
    fontSize: 38,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  source: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  time: {
    fontSize: 13,
    // A long source name must not squeeze "az önce" down to "az".
    flexShrink: 0,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
    flexShrink: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    paddingLeft: 4,
    paddingTop: 2,
  },
});

export const ArticleCard = memo(ArticleCardBase);
