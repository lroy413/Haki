import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Dial } from '../src/components/Dial';
import { useStore } from '../src/db/client';
import { allSessions, logSession } from '../src/db/repo';
import { useHaki } from '../src/state/HakiProvider';
import { gapClosedBy, returnMessage } from '../src/domain/training';
import { todayKey } from '../src/domain/date';
import { color, font, radius, space, type } from '../src/theme/tokens';

const QUICK_KINDS = ['Push', 'Pull', 'Legs', 'Full body', 'Run', 'Conditioning'];

/**
 * Log a training session.
 *
 * Only `kind` is required. Everything else is optional, because a session
 * logged in five seconds beats a session not logged at all — and the gap
 * detection that matters only needs the date.
 */
export default function SessionScreen() {
  const router = useRouter();
  const { db, settings } = useStore();
  const { t, refresh } = useHaki();

  const [kind, setKind] = useState('');
  const [minutes, setMinutes] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [returned, setReturned] = useState<string | null>(null);

  const canSave = kind.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const today = todayKey();

      // Work out the gap before writing, or this session becomes its own
      // "previous session" and every Return would read as zero.
      const existing = await allSessions(db);
      const gap = gapClosedBy(existing, today, settings.training);

      const parsedMinutes = Number.parseInt(minutes, 10);

      await logSession(
        db,
        {
          kind: kind.trim(),
          minutes: Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : null,
          intensity,
          note: note.trim() || null,
          day: today,
        },
        gap,
      );

      await refresh();

      const message = returnMessage(gap);
      if (message) {
        // A Return is the one moment in this app worth stopping on.
        setReturned(message);
        setSaving(false);
        return;
      }

      router.back();
    } catch {
      setSaving(false);
    }
  }

  if (returned) {
    return (
      <View style={styles.returnScreen}>
        <Text style={styles.returnKanji}>帰</Text>
        <Text style={styles.returnTitle}>Return</Text>
        <Text style={styles.returnBody}>{returned}</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}
        >
          <Text style={styles.saveText}>Good</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>{t.trainingKind}</Text>
          <TextInput
            value={kind}
            onChangeText={setKind}
            placeholder="Push"
            placeholderTextColor={color.inkFaint}
            style={styles.input}
            // Native only: iOS opens the keyboard for gesture-driven focus,
            // never for programmatic focus, and an already-focused field
            // fires no new focus event when tapped.
            autoFocus={Platform.OS !== 'web'}
            accessibilityLabel={t.trainingKind}
          />
          <View style={styles.quick}>
            {QUICK_KINDS.map((q) => (
              <Pressable
                key={q}
                onPress={() => setKind(q)}
                style={({ pressed }) => [
                  styles.chip,
                  kind === q && styles.chipOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, kind === q && styles.chipTextOn]}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t.trainingMinutes}</Text>
          <TextInput
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            placeholder="45"
            placeholderTextColor={color.inkFaint}
            style={styles.input}
            accessibilityLabel={t.trainingMinutes}
          />
        </View>

        <Dial
          label={t.trainingIntensity}
          value={intensity}
          onChange={setIntensity}
          accent={color.crimson}
        />

        <View style={styles.field}>
          <Text style={styles.label}>{t.trainingNote}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Optional"
            placeholderTextColor={color.inkFaint}
            style={[styles.input, styles.multiline]}
            accessibilityLabel={t.trainingNote}
          />
        </View>

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.save,
            !canSave && styles.saveDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveText}>{kind.trim() ? 'Log it' : 'Name it first'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxxl },

  field: { gap: space.sm },
  label: { ...type.heading, color: color.ink },
  input: {
    ...type.body,
    color: color.ink,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    height: 54,
  },
  multiline: { height: 90, paddingTop: space.md, textAlignVertical: 'top' },

  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  chipOn: { borderColor: color.crimson, backgroundColor: color.crimsonSoft },
  chipText: { ...type.small, color: color.inkDim },
  chipTextOn: { color: color.crimson },

  save: {
    backgroundColor: color.crimson,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  saveDisabled: { backgroundColor: color.surface2 },
  saveText: { ...type.heading, color: '#0A0B12' },
  pressed: { opacity: 0.75 },

  returnScreen: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  returnKanji: { fontFamily: font.display, fontSize: 72, color: color.violet },
  returnTitle: { ...type.display, color: color.ink },
  returnBody: {
    ...type.body,
    color: color.inkDim,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
  },
});
