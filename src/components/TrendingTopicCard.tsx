import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslatedPreview } from '../hooks/useTranslatedPreview';
import type { Strings } from '../i18n';
import { formatRelativeTime } from '../services/newsService';
import type { TrendingTopic } from '../services/trending';
import type { Theme } from '../theme';
import type { Article, TranslationLanguage, UiLanguage } from '../types';

interface Props {
  topic: TrendingTopic;
  rank: number;
  theme: Theme;
  language: UiLanguage;
  strings: Strings;
  translate: boolean;
  translateInto: TranslationLanguage;
  onPress: (article: Article) => void;
}

const MAX_RELATED = 3;

/**
 * One trending story: the lead article, then the other headlines covering it.
 * The rank and the source count carry the claim — "six newsrooms are running
 * this" — rather than a view count the app cannot know.
 */
function TrendingTopicCardBase({
  topic,
  rank,
  theme,
  language,
  strings,
  translate,
  translateInto,
  onPress,
}: Props) {
  const [lead, ...rest] = topic.articles;
  const preview = useTranslatedPreview(lead, translateInto, translate);
  const timeLabel = formatRelativeTime(lead.publishedAt, Date.now(), language);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.rank, { color: theme.accent }]}>{rank}</Text>

        <View style={styles.headerText}>
          <Text style={[styles.topic, { color: theme.text }]} numberOfLines={1}>
            {topic.label}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
            {strings.topicCoverage(topic.articles.length, topic.sourceCount)}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={lead.title}
        onPress={() => onPress(lead)}
        style={({ pressed }) => [styles.lead, { opacity: pressed ? 0.85 : 1 }]}
      >
        {lead.imageUrl ? (
          <Image source={{ uri: lead.imageUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.surfaceAlt }]}>
            <Ionicons name="trending-up" size={20} color={theme.textMuted} />
          </View>
        )}

        <View style={styles.leadText}>
          <Text style={[styles.leadTitle, { color: theme.text }]} numberOfLines={3}>
            {preview.title}
          </Text>
          <Text style={[styles.leadMeta, { color: theme.textMuted }]} numberOfLines={1}>
            {lead.sourceName}
            {timeLabel ? ` · ${timeLabel}` : ''}
            {preview.translated ? ` · ${strings.translatedBadge}` : ''}
          </Text>
        </View>
      </Pressable>

      {rest.slice(0, MAX_RELATED).map((article) => (
        <RelatedRow
          key={article.id}
          article={article}
          theme={theme}
          language={language}
          strings={strings}
          translate={translate}
          translateInto={translateInto}
          onPress={onPress}
        />
      ))}
    </View>
  );
}

function RelatedRow({
  article,
  theme,
  language,
  strings,
  translate,
  translateInto,
  onPress,
}: {
  article: Article;
  theme: Theme;
  language: UiLanguage;
  strings: Strings;
  translate: boolean;
  translateInto: TranslationLanguage;
  onPress: (article: Article) => void;
}) {
  const preview = useTranslatedPreview(article, translateInto, translate);
  const timeLabel = formatRelativeTime(article.publishedAt, Date.now(), language);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={article.title}
      onPress={() => onPress(article)}
      style={({ pressed }) => [
        styles.related,
        { borderTopColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.relatedTitle, { color: theme.text }]} numberOfLines={2}>
        {preview.title}
      </Text>
      <Text style={[styles.relatedMeta, { color: theme.textMuted }]} numberOfLines={1}>
        {article.sourceName}
        {timeLabel ? ` · ${timeLabel}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  rank: {
    fontSize: 20,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'center',
  },
  headerText: {
    flex: 1,
  },
  topic: {
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    marginTop: 1,
  },
  lead: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadText: {
    flex: 1,
    gap: 4,
  },
  leadTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  leadMeta: {
    fontSize: 12,
  },
  related: {
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  relatedTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  relatedMeta: {
    fontSize: 11,
  },
});

export const TrendingTopicCard = memo(TrendingTopicCardBase);
