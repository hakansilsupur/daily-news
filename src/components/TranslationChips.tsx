import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { TRANSLATION_LANGUAGES } from '../data/countries';
import type { Strings } from '../i18n';
import type { Theme } from '../theme';
import type { TranslationLanguage } from '../types';

interface Props {
  theme: Theme;
  strings: Strings;
  enabled: boolean;
  language: TranslationLanguage;
  onChange: (next: { enabled: boolean; language: TranslationLanguage }) => void;
}

/**
 * Picks the language the feed is read in. The first chip leaves every headline
 * in the language its publisher wrote it in; any other chip translates the
 * previews into that language.
 *
 * This sits where the feed-language filter used to: that filter answered a
 * worse question — it hid sources that did not publish in the chosen language,
 * which loses news. Translating shows the same stories, readable. The filter
 * still exists, in the Sources sheet, for anyone who genuinely wants to narrow
 * the source list.
 */
export function TranslationChips({ theme, strings, enabled, language, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Chip
        theme={theme}
        label={strings.originalLanguage}
        active={!enabled}
        onPress={() => onChange({ enabled: false, language })}
      />

      {TRANSLATION_LANGUAGES.map((code) => (
        <Chip
          key={code}
          theme={theme}
          label={strings.languageName[code]}
          active={enabled && language === code}
          onPress={() => onChange({ enabled: true, language: code })}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  theme,
  label,
  active,
  onPress,
}: {
  theme: Theme;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.surfaceAlt,
          borderColor: active ? theme.accent : 'transparent',
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.chipText, { color: active ? theme.accentText : theme.textMuted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    gap: 6,
    paddingVertical: 1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
