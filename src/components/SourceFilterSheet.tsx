import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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

import { scopeFlag, scopeLabel } from '../data/countries';
import { CATEGORY_LABELS } from '../data/sources';
import type { NewsApp } from '../hooks/useNewsApp';
import type { Theme } from '../theme';
import type { NewsSource, SourceScope } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  app: NewsApp;
}

export function SourceFilterSheet({ visible, onClose, theme, app }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [newScope, setNewScope] = useState<SourceScope>(app.country);
  const [formError, setFormError] = useState<string | null>(null);

  // A new feed belongs either to the country on screen or to the world bucket.
  const scopeChoices: SourceScope[] = [app.country, 'world'];
  // The country can change while this sheet is mounted, which would strand the
  // stored choice on a scope that is no longer offered.
  const effectiveScope = scopeChoices.includes(newScope) ? newScope : app.country;

  // Group the in-scope sources by where they report from, in the order the
  // scope itself implies (country first, then worldwide).
  const grouped: { scope: SourceScope; sources: NewsSource[] }[] = (
    [app.country, 'world'] as SourceScope[]
  )
    .map((scope) => ({
      scope,
      sources: app.scopeSources.filter((source) => source.scope === scope),
    }))
    .filter((group) => group.sources.length > 0);

  const handleAdd = () => {
    const error = app.addCustomSource({ name, feedUrl: url, scope: effectiveScope });
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
              <Text style={[styles.headerTitle, { color: theme.text }]}>Sources</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>

            <View style={styles.bulkRow}>
              <Pressable
                onPress={() => app.setAllSourcesEnabled(true)}
                style={[styles.bulkButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Text style={[styles.bulkText, { color: theme.text }]}>Select all</Text>
              </Pressable>
              <Pressable
                onPress={() => app.setAllSourcesEnabled(false)}
                style={[styles.bulkButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Text style={[styles.bulkText, { color: theme.text }]}>Clear</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {grouped.map((group) => (
                <View key={group.scope} style={styles.group}>
                  <Text style={[styles.groupTitle, { color: theme.textMuted }]}>
                    {scopeFlag(group.scope)}  {scopeLabel(group.scope).toUpperCase()}
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
                              ? `Unavailable — ${failed}`
                              : `${CATEGORY_LABELS[source.category]} · ${source.language.toUpperCase()}`}
                          </Text>
                        </View>

                        {source.custom ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${source.name}`}
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
                <Text style={[styles.groupTitle, { color: theme.textMuted }]}>ADD A FEED</Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Source name"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://example.com/rss"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                />

                <View style={styles.scopePicker}>
                  {scopeChoices.map((scope) => {
                    const selected = effectiveScope === scope;
                    return (
                      <Pressable
                        key={scope}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setNewScope(scope)}
                        style={[
                          styles.scopeOption,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            backgroundColor: selected ? theme.accentSoft : theme.surface,
                          },
                        ]}
                      >
                        <Text style={[styles.scopeOptionText, { color: selected ? theme.accent : theme.textMuted }]}>
                          {scopeFlag(scope)} {scopeLabel(scope)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {formError ? (
                  <Text style={[styles.formError, { color: theme.danger }]}>{formError}</Text>
                ) : null}

                <Pressable onPress={handleAdd} style={[styles.addButton, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.addButtonText, { color: theme.accentText }]}>Add source</Text>
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
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 32,
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
  scopePicker: {
    flexDirection: 'row',
    gap: 10,
  },
  scopeOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  scopeOptionText: {
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
