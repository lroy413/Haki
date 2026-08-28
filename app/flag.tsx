import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { addValue, listFlag, removeValue, updateValue } from '../src/db/repo';
import { FLAG_MAX, VALUE_MAX_CHARS, flagRoom, type Value } from '../src/domain/flag';
import { useHaki } from '../src/state/HakiProvider';
import { SectionLabel } from '../src/components/SectionLabel';
import { font, radius, space, type } from '../src/theme/tokens';
import { usableBottom } from '../src/theme/viewport';
import { lit, offer, plate, press, row } from '../src/theme/surfaces';
import { underCrew } from '../src/theme/palettes';
import type { Palette } from '../src/theme/palettes';

/**
 * The Flag — 旗.
 *
 * A pirate crew raises a flag to say what it stands for, and then everything
 * else can be checked against it. This screen is where those three to five
 * things get written down, and it is deliberately the least mechanical page
 * in the app: no checkbox, no history, no count of how often you lived up to
 * one. See `domain/flag.ts` for why each of those is absent.
 *
 * Taking a value down deletes it rather than retiring it — the one place
 * this app does not keep the record. Everything else here keeps its history
 * because those are records of things that happened; a value you no longer
 * hold is not a record of anything, and a list of former values would be a
 * monument to having changed your mind.
 */
export default function FlagScreen() {
  const { db } = useStore();
  const { t, palette, plainMode, hardening, crew } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<Value[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const load = useCallback(async () => {
    setValues(await listFlag(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const room = flagRoom(values.length, plainMode);

  async function raise() {
    if (!draft.trim()) return;
    await addValue(db, draft);
    setDraft('');
    setAdding(false);
    await load();
  }

  async function save(id: number) {
    if (!editDraft.trim()) return;
    await updateValue(db, id, editDraft);
    setEditing(null);
    await load();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* The flag itself, flying. One plate, in the king's colour, with the
            values on it rather than in a list beneath it — the whole point is
            that they are one thing you sail under. */}
        <View style={[styles.flag, lit(lens.violet, hardening)]}>
          {plainMode ? null : <Text style={styles.mark}>旗</Text>}
          <Text style={styles.flagLabel}>{t.flagTitle}</Text>

          {values.length === 0 ? (
            <Text style={styles.empty}>{t.flagEmpty}</Text>
          ) : (
            values.map((value) =>
              editing === value.id ? (
                <View key={value.id} style={styles.form}>
                  <TextInput
                    value={editDraft}
                    onChangeText={setEditDraft}
                    autoFocus={Platform.OS !== 'web'}
                    maxLength={VALUE_MAX_CHARS}
                    style={styles.input}
                    placeholderTextColor={palette.inkFaint}
                    accessibilityLabel={t.flagField}
                    onSubmitEditing={() => void save(value.id)}
                    returnKeyType="done"
                  />
                  <View style={styles.formRow}>
                    <Pressable
                      onPress={() => void removeValue(db, value.id).then(load)}
                      accessibilityRole="button"
                      accessibilityLabel={`Take down: ${value.text}`}
                      style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                    >
                      <Text style={styles.takeDown}>Take it down</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void save(value.id)}
                      disabled={!editDraft.trim()}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.filled,
                        !editDraft.trim() && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.filledText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  key={value.id}
                  onPress={() => {
                    setEditDraft(value.text);
                    setEditing(value.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit: ${value.text}`}
                  style={({ pressed }) => [styles.value, pressed && styles.pressed]}
                >
                  <Text style={styles.valueText}>{value.text}</Text>
                </Pressable>
              ),
            )
          )}
        </View>

        <Text style={styles.blurb}>{t.flagBlurb}</Text>

        <SectionLabel label={t.flagAdd} />
        <Text style={styles.room}>{room.note}</Text>

        {adding ? (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.flagField}</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus={Platform.OS !== 'web'}
              maxLength={VALUE_MAX_CHARS}
              style={styles.input}
              placeholder="Finish what I start"
              placeholderTextColor={palette.inkFaint}
              accessibilityLabel={t.flagField}
              onSubmitEditing={() => void raise()}
              returnKeyType="done"
            />
            <View style={styles.formRow}>
              <Pressable
                onPress={() => {
                  setAdding(false);
                  setDraft('');
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void raise()}
                disabled={!draft.trim()}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.filled,
                  !draft.trim() && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.filledText}>{t.flagAdd}</Text>
              </Pressable>
            </View>
          </View>
        ) : room.canAdd ? (
          <Pressable
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            accessibilityLabel={t.flagAdd}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>{t.flagAdd}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.footnote}>
          {plainMode
            ? 'Values are not tasks. Nothing here is ever marked done, and nothing counts how often you lived up to one.'
            : 'A flag is not a checklist. Nothing here is ever struck, and nothing counts how often you sailed under it — that number would be an accusation wearing arithmetic.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.md },

    flag: {
      ...plate(c),
      borderColor: c.violet,
      borderTopColor: c.violet,
      backgroundColor: c.violetSoft,
      padding: space.lg,
      gap: space.sm,
      overflow: 'hidden',
    },
    mark: {
      position: 'absolute',
      right: -space.sm,
      bottom: -space.xl,
      fontFamily: font.display,
      fontSize: 110,
      color: c.violet,
      opacity: 0.09,
    },
    flagLabel: { ...type.label, color: c.violet },
    empty: { ...type.body, color: c.inkDim, lineHeight: 22 },
    value: { minHeight: 44, justifyContent: 'center' },
    // The one place other than the Dream that gets display type this size:
    // these are the words the rest of the app is measured against.
    valueText: { fontFamily: font.displayBold, fontSize: 21, lineHeight: 27, color: c.ink },

    blurb: { ...type.small, color: c.inkDim, lineHeight: 19 },
    room: { ...type.small, color: c.inkDim, lineHeight: 19 },

    card: { ...row(c), padding: space.lg, gap: space.sm },
    fieldLabel: { ...type.label, color: c.inkFaint },
    form: { gap: space.sm },
    formRow: { flexDirection: 'row', gap: space.sm },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    filled: {
      flex: 1,
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filledText: { ...type.heading, fontSize: 15, color: c.onAccent },
    ghost: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: { ...type.heading, fontSize: 15, color: c.inkDim },
    takeDown: { ...type.heading, fontSize: 15, color: c.inkFaint },
    disabled: { opacity: 0.4 },

    add: {
      ...offer(c),
      paddingVertical: space.lg,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: { ...type.heading, color: c.inkDim },
    footnote: { ...type.small, color: c.inkFaint, lineHeight: 18, marginTop: space.sm },
    pressed: { ...press },
  });
