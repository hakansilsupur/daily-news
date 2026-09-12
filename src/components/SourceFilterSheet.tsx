import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedControl } from './SegmentedControl';
import { COUNTRIES } from '../data/countries';
import { localeTag, originLabel, UI_LANGUAGE_PREFERENCES, type AddSourceError } from '../i18n';
import type { NewsApp } from '../hooks/useNewsApp';
import type { Theme } from '../theme';
import type {
  CountryCode,
  LanguageFilter,
  NewsSource,
  SourceOrigin,
  UiLanguagePreference,
} from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onFindSources: () => void;
  theme: Theme;
  app: NewsApp;
}

export function SourceFilterSheet({ visible, onClose, onFindSources, theme, app }: Props) {
  const { t } = app;
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [newRegion, setNewRegion] = useState<SourceOrigin>(app.country);

  // Changing country while the sheet is open must not leave the manual form
  // tagging new feeds for the country the user just left.
  useEffect(() => setNewRegion(app.country), [app.country]);
  const [formError, setFormError] = useState<AddSourceError | null>(null);

  const uiLanguageOptions: { value: UiLanguagePreference; label: string }[] =
    UI_LANGUAGE_PREFERENCES.map((preference) => ({
      value: preference,
      label: t.uiLanguageOption[preference],
    }));

  const feedLanguageOptions: { value: LanguageFilter; label: string }[] = [
    { value: 'all', label: t.allLanguages },
    ...app.availableLanguages.map((language) => ({
      value: language as LanguageFilter,
      label: t.languageName[language],
    })),
  ];

  // The user's own country first, then every other origin present, then world.
  const origins: SourceOrigin[] = [
    app.country,
    ...[...new Set(app.regionSources.map((source) => source.region))]
      .filter((origin) => origin !== app.country && origin !== 'world')
      .sort(),
    'world',
  ];

  const grouped: { region: SourceOrigin; sources: NewsSource[] }[] = origins
    .map((region) => ({
      region,
      sources: app.regionSources.filter((source) => source.region === region),
    }))
    .filter((group) => group.sources.length > 0);

  const handleAdd = () => {
    const error = app.addCustomSource({ name, feedUrl: url, region: newRegion });
    setFormError(error);
    if (!error) {
      setName('');
      setUrl('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>{t.sheetTitle}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t.closeLabel} hitSlop={10} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>

            <View style={styles.bulkRow}>
              <Pressable
                onPress={() => app.setAllSourcesEnabled(true)}
                style={[styles.bulkButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Text style={[styles.bulkText, { color: theme.text }]}>{t.selectAll}</Text>
              </Pressable>
              <Pressable
                onPress={() => app.setAllSourcesEnabled(false)}
                style={[styles.bulkButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Text style={[styles.bulkText, { color: theme.text }]}>{t.clear}</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{t.countryGroup}</Text>
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t.homeCountry}</Text>

                <View style={styles.countryGrid}>
                  {COUNTRIES.map(({ code, flag }) => {
                    const selected = app.country === code;
                    return (
                      <Pressable
                        key={code}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={t.countryName[code]}
                        onPress={() => app.setCountry(code)}
                        style={[
                          styles.countryChip,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            backgroundColor: selected ? theme.accentSoft : theme.surface,
                          },
                        ]}
                      >
                        <Text style={styles.countryFlag}>{flag}</Text>
                        <Text
                          numberOfLines={1}
                          style={[styles.countryName, { color: selected ? theme.accent : theme.text }]}
                        >
                          {t.countryName[code]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{t.languageGroup}</Text>

                <Text style={[styles.settingLabel, { color: theme.text }]}>{t.interfaceLanguage}</Text>
                <SegmentedControl
                  theme={theme}
                  options={uiLanguageOptions}
                  value={app.uiLanguagePreference}
                  onChange={app.setUiLanguagePreference}
                  compact
                  flush
                />

                <Text style={[styles.settingLabel, { color: theme.text }]}>{t.feedLanguage}</Text>
                <SegmentedControl
                  theme={theme}
                  options={feedLanguageOptions}
                  value={app.languageFilter}
                  onChange={app.setLanguageFilter}
                  compact
                  flush
                />
              </View>

              {grouped.map((group) => (
                <View key={group.region} style={styles.group}>
                  <Text style={[styles.groupTitle, { color: theme.textMuted }]}>
                    {originLabel(t, group.region).toLocaleUpperCase(localeTag(app.uiLanguage))}
                  </Text>

                  {group.sources.map((source) => {
                    const failed = app.errors[source.id];
                    return (
                      <View
                        key={source.id}
                        style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      >
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                            {source.name}
                          </Text>
                          <Text style={[styles.rowSub, { color: failed ? theme.danger : theme.textMuted }]} numberOfLines={1}>
                            {failed
                              ? t.unavailable(failed)
                              : `${t.categoryLabel[source.category]} · ${source.language.toUpperCase()}`}
                          </Text>
                        </View>

                        {source.custom ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t.removeSourceLabel(source.name)}
                            hitSlop={8}
                            onPress={() => app.removeCustomSource(source.id)}
                            style={styles.removeButton}
                          >
                            <Ionicons name="trash-outline" size={18} color={theme.danger} />
                          </Pressable>
                        ) : null}

                        <Switch
                          value={app.isSourceEnabled(source.id)}
                          onValueChange={() => app.toggleSource(source.id)}
                          trackColor={{ true: theme.accent, false: theme.surfaceAlt }}
                          thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{t.addFeedGroup}</Text>

                <Pressable
                  onPress={onFindSources}
                  style={[styles.findButton, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
                >
                  <Ionicons name="search" size={18} color={theme.accent} />
                  <Text style={[styles.findButtonText, { color: theme.accent }]}>{t.findSources}</Text>
                </Pressable>

                <Text style={[styles.groupTitle, styles.manualTitle, { color: theme.textMuted }]}>
                  {t.manualEntryGroup}
                </Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t.sourceNamePlaceholder}
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder={t.feedUrlPlaceholder}
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />

                <View style={styles.regionPicker}>
                  {([app.country, 'world'] as SourceOrigin[]).map((region) => {
                    const selected = newRegion === region;
                    return (
                      <Pressable
                        key={region}
                        onPress={() => setNewRegion(region)}
                        style={[
                          styles.regionOption,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            backgroundColor: selected ? theme.accentSoft : theme.surface,
                          },
                        ]}
                      >
                        <Text style={[styles.regionOptionText, { color: selected ? theme.accent : theme.textMuted }]}>
                          {originLabel(t, region)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {formError ? (
                  <Text style={[styles.formError, { color: theme.danger }]}>
                    {t.addSourceError[formError]}
                  </Text>
                ) : null}

                <Pressable onPress={handleAdd} style={[styles.addButton, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.addButtonText, { color: theme.accentText }]}>{t.addSource}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    maxHeight: '88%',
  },
  sheet: {
    // Without flexShrink the content grows past the wrapper's maxHeight, which
    // pushes the end of the list (and the Add source button) off the screen.
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
  bulkRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  bulkButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  bulkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flexShrink: 1,
    marginTop: 8,
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
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  findButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  manualTitle: {
    marginTop: 8,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  countryFlag: {
    fontSize: 15,
  },
  countryName: {
    fontSize: 13,
    fontWeight: '600',
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
  removeButton: {
    padding: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  regionPicker: {
    flexDirection: 'row',
    gap: 10,
  },
  regionOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  regionOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formError: {
    fontSize: 12,
  },
  addButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
