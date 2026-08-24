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
import { listCarried, upsertCarried } from '../src/db/repo';
import type { CarriedRow } from '../src/db/schema';
import { useHaki } from '../src/state/HakiProvider';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Inherited Will.
 *
 * A record, not a mechanic. Nothing on this screen scores, nags, reminds, or
 * appears anywhere else in the app uninvited — memory is a source, never a
 * stick. It opens only when you open it.
 *
 * **Pushed rather than a tab of its own**, and it moved here when the Log Pose
 * took the fifth slot. It belongs under 覇王色: the whole argument of the
 * source material is that a dream outlives the person who held it as long as
 * somebody keeps carrying it, which makes this part of where you are going
 * rather than a drawer beside it. The Conqueror's tab lists who is aboard and
 * this screen is where you write them down.
 *
 * The surfacing logic (at Road Poneglyph milestones and at the weekly Setting
 * Sail) arrives in v2 alongside the things it would surface against.
 */
export default function CarriedScreen() {
  const { db } = useStore();
  const { t, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const [people, setPeople] = useState<CarriedRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [theirDream, setTheirDream] = useState('');
  const [whatICarry, setWhatICarry] = useState('');

  const load = useCallback(async () => {
    setPeople(await listCarried(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function save() {
    if (!name.trim()) return;
    await upsertCarried(db, {
      name: name.trim(),
      relationship: relationship.trim() || null,
      theirDream: theirDream.trim() || null,
      whatICarry: whatICarry.trim() || null,
    });
    setName('');
    setRelationship('');
    setTheirDream('');
    setWhatICarry('');
    setAdding(false);
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
          // Pushed, so the header owns the top. Only the home indicator is
          // this screen's problem.
          { paddingBottom: Math.max(insets.bottom, space.md) + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.blurb}>{t.carriedBlurb}</Text>

        {people.length === 0 && !adding ? (
          <Text style={styles.empty}>{t.carriedEmpty}</Text>
        ) : null}

        {people.map((person) => (
          <View key={person.id} style={styles.card}>
            <Text style={styles.name}>{person.name}</Text>
            {person.relationship ? (
              <Text style={styles.relationship}>{person.relationship}</Text>
            ) : null}
            {person.theirDream ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t.carriedDream}</Text>
                <Text style={styles.fieldValue}>{person.theirDream}</Text>
              </View>
            ) : null}
            {person.whatICarry ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t.carriedWhatICarry}</Text>
                <Text style={styles.fieldValue}>{person.whatICarry}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {adding ? (
          <View style={styles.card}>
            <Input label={t.carriedName} value={name} onChangeText={setName} autoFocus />
            <Input
              label={t.carriedRelationship}
              value={relationship}
              onChangeText={setRelationship}
            />
            <Input
              label={t.carriedDream}
              value={theirDream}
              onChangeText={setTheirDream}
              multiline
            />
            <Input
              label={t.carriedWhatICarry}
              value={whatICarry}
              onChangeText={setWhatICarry}
              multiline
            />
            <View style={styles.actions}>
              <Pressable
                onPress={() => setAdding(false)}
                accessibilityRole="button"
                style={styles.ghost}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={!name.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save this person"
                style={[styles.primary, !name.trim() && styles.primaryDisabled]}
              >
                <Text style={styles.primaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>{t.carriedAdd}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({
  label,
  value,
  onChangeText,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        // Native only — iOS will not open the keyboard for programmatic focus.
        autoFocus={Platform.OS !== 'web' && autoFocus}
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor={palette.inkFaint}
        accessibilityLabel={label}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },
    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },
    empty: { ...type.body, color: c.inkFaint, textAlign: 'center', marginVertical: space.xl },

    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.md,
    },
    name: { ...type.title, color: c.ink },
    relationship: { ...type.small, color: c.violet, marginTop: -space.sm },

    field: { gap: space.xs },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 10 },
    fieldValue: { ...type.body, color: c.ink, lineHeight: 21 },

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
    inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

    actions: { flexDirection: 'row', gap: space.sm },
    ghost: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    ghostText: { ...type.body, color: c.inkDim },
    primary: {
      flex: 1,
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    primaryDisabled: { backgroundColor: c.surface2 },
    primaryText: { ...type.body, color: c.onAccent },

    add: {
      borderWidth: 1,
      borderColor: c.line,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
    },
    addText: { ...type.heading, color: c.inkDim },
    pressed: { ...press },
  });
