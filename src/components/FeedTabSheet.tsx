import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
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

import type { NewsApp } from '../hooks/useNewsApp';
import { localeTag, type FeedTabError } from '../i18n';
import type { Theme } from '../theme';
import type { FeedTab, Region } from '../types';

interface Props {
  /** The tab being edited, `null` for a new one, `undefined` while closed. */
  tab: FeedTab | null | undefined;
  onClose: () => void;
  theme: Theme;
  app: NewsApp;
}

/** Create or edit a pinned tab: give it a name, then tick the sources it holds. */
export function FeedTabSheet({ tab, onClose, theme, app }: Props) {
  const { t } = app;
  const insets = useSafeAreaInsets();
  const visible = tab !== undefined;
  const editing = tab ?? null;

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<FeedTabError | null>(null);

  // Reset the form each time the sheet opens, so a cancelled edit leaves nothing behind.
  useEffect(() => {
    if (!visible) return;
    setName(editing?.name ?? '');
    setSelected(editing?.sourceIds ?? []);
    setError(null);
  }, [visible, editing]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleSave = () => {
    const failure = app.saveFeedTab({ id: editing?.id, name, sourceIds: selected });
    setError(failure);
    if (!failure) onClose();
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert(editing.name, t.deleteTabConfirm(editing.name), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => {
          app.removeFeedTab(editing.id);
          onClose();
        },
      },
    ]);
  };

  const groups = (['turkey', 'world'] as Region[])
    .map((region) => ({
      region,
      sources: app.allSources.filter((source) => source.region === region),
    }))
    .filter((group) => group.sources.length > 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {editing ? t.editTabTitle : t.newTabTitle}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t.closeLabel} hitSlop={10} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.group}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t.tabNamePlaceholder}
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
                  ]}
                />
              </View>

              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{t.tabPickSources}</Text>
                <Text style={[styles.count, { color: theme.textMuted }]}>
                  {t.tabSelectedCount(selected.length)}
                </Text>
              </View>

              {groups.map((group) => (
                <View key={group.region} style={styles.group}>
                  <Text style={[styles.groupTitle, { color: theme.textMuted }]}>
                    {t.regionLabel[group.region].toLocaleUpperCase(localeTag(app.uiLanguage))}
                  </Text>

                  {group.sources.map((source) => {
                    const checked = selected.includes(source.id);
                    return (
                      <Pressable
                        key={source.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        accessibilityLabel={source.name}
                        onPress={() => toggle(source.id)}
                        style={[
                          styles.row,
                          {
                            backgroundColor: theme.surface,
                            borderColor: checked ? theme.accent : theme.border,
                          },
                        ]}
                      >
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                            {source.name}
                          </Text>
                          <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>
                            {`${t.categoryLabel[source.category]} · ${source.language.toUpperCase()}`}
                          </Text>
                        </View>

                        <Ionicons
                          name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={checked ? theme.accent : theme.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ))}

            </ScrollView>

            {/* Pinned below the list: with 20-odd sources to tick, a save button
                at the end of the scroll is a save button nobody can find. */}
            <View
              style={[
                styles.footer,
                { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              {error ? (
                <Text style={[styles.error, { color: theme.danger }]}>{t.feedTabError[error]}</Text>
              ) : null}

              <View style={styles.footerRow}>
                {editing ? (
                  <Pressable
                    onPress={handleDelete}
                    style={[styles.deleteButton, { borderColor: theme.border }]}
                  >
                    <Text style={[styles.deleteButtonText, { color: theme.danger }]}>{t.deleteTab}</Text>
                  </Pressable>
                ) : null}

                <Pressable onPress={handleSave} style={[styles.saveButton, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.saveButtonText, { color: theme.accentText }]}>{t.saveTab}</Text>
                </Pressable>
              </View>
            </View>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    maxHeight: '88%',
  },
  sheet: {
    // Views do not shrink by default in React Native, so without this the
    // content grows past the wrapper's maxHeight and the footer lands offscreen.
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
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  count: {
    fontSize: 12,
    marginTop: -4,
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
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
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  error: {
    fontSize: 12,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
