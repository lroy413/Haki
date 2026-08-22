import { useCallback, useState } from 'react';
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
import { useStore } from '../../src/db/client';
import { listCarried, upsertCarried } from '../../src/db/repo';
import type { CarriedRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { color, radius, space, type } from '../../src/theme/tokens';

/**
 * Inherited Will.
 *
 * A record, not a mechanic. Nothing on this screen scores, nags, reminds, or
 * appears anywhere else in the app uninvited — memory is a source, never a
 * stick. It opens only when you open it.
 *
 * The surfacing logic (at Road Poneglyph milestones and at the weekly Setting
 * Sail) arrives in v2 alongside the things it would surface against.
 */
export default function CarriedScreen() {
  const { db } = useStore();
  const { t } = useHaki();

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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            <Input label={t.carriedDream} value={theirDream} onChangeText={setTheirDream} multiline />
            <Input
              label={t.carriedWhatICarry}
              value={whatICarry}
              onChangeText={setWhatICarry}
              multiline
            />
            <View style={styles.actions}>
              <Pressable onPress={() => setAdding(false)} style={styles.ghost}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={!name.trim()}
                style={[styles.primary, !name.trim() && styles.primaryDisabled]}
              >
                <Text style={styles.primaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
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
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoFocus={autoFocus}
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor={color.inkFaint}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  blurb: { ...type.small, color: color.inkDim, lineHeight: 20 },
  empty: { ...type.body, color: color.inkFaint, textAlign: 'center', marginVertical: space.xl },

  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.md,
  },
  name: { ...type.title, color: color.ink },
  relationship: { ...type.small, color: color.violet, marginTop: -space.sm },

  field: { gap: space.xs },
  fieldLabel: { ...type.label, color: color.inkFaint, fontSize: 10 },
  fieldValue: { ...type.body, color: color.ink, lineHeight: 21 },

  input: {
    ...type.body,
    color: color.ink,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.line,
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
    borderColor: color.line,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  ghostText: { ...type.body, color: color.inkDim },
  primary: {
    flex: 1,
    backgroundColor: color.violet,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  primaryDisabled: { backgroundColor: color.surface2 },
  primaryText: { ...type.body, color: '#0A0B12', fontWeight: '700' },

  add: {
    borderWidth: 1,
    borderColor: color.line,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  addText: { ...type.heading, color: color.inkDim },
  pressed: { opacity: 0.75 },
});
