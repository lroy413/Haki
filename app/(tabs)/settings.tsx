import { useMemo, useState } from 'react';
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
import { BackupCard } from '../../src/components/BackupCard';
import { Toggle } from '../../src/components/Toggle';
import { useStore } from '../../src/db/client';
import {
  setDayStartHour,
  setKeystone,
  setPlainMode,
  setSoundOn,
  setTraining,
} from '../../src/db/settings';
import { describeDayStart } from '../../src/domain/date';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { useHaki } from '../../src/state/HakiProvider';
import { radius, space, type } from '../../src/theme/tokens';
import { press } from '../../src/theme/surfaces';
import type { Palette } from '../../src/theme/palettes';

export default function SettingsScreen() {
  const { db, settings, refreshSettings } = useStore();
  const { t, refresh, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();

  const [threshold, setThreshold] = useState(String(settings.keystone.thresholdHours));
  const [target, setTarget] = useState(String(settings.keystone.targetHours));
  const [escalate, setEscalate] = useState(String(settings.keystone.escalateAfterNights));
  const [downstream, setDownstream] = useState(settings.keystone.downstreamNames.join(', '));
  const [weeklyTarget, setWeeklyTarget] = useState(String(settings.training.weeklyTarget));
  const [gapDays, setGapDays] = useState(String(settings.training.gapDaysForReturn));

  async function saveKeystone() {
    const parsedTarget = Number.parseFloat(target.replace(',', '.'));
    const parsedThreshold = Number.parseFloat(threshold.replace(',', '.'));
    const parsedEscalate = Number.parseInt(escalate, 10);

    await setKeystone(db, {
      targetHours: Number.isFinite(parsedTarget) ? parsedTarget : settings.keystone.targetHours,
      thresholdHours: Number.isFinite(parsedThreshold)
        ? parsedThreshold
        : settings.keystone.thresholdHours,
      escalateAfterNights:
        Number.isFinite(parsedEscalate) && parsedEscalate > 0
          ? parsedEscalate
          : settings.keystone.escalateAfterNights,
      downstreamNames: downstream
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    });
    await refreshSettings();
    await refresh();
  }

  async function saveTraining() {
    const parsedTarget = Number.parseInt(weeklyTarget, 10);
    const parsedGap = Number.parseInt(gapDays, 10);

    await setTraining(db, {
      weeklyTarget:
        Number.isFinite(parsedTarget) && parsedTarget > 0
          ? parsedTarget
          : settings.training.weeklyTarget,
      gapDaysForReturn:
        Number.isFinite(parsedGap) && parsedGap > 0
          ? parsedGap
          : settings.training.gapDaysForReturn,
    });
    await refreshSettings();
    await refresh();
  }

  async function toggleSound(next: boolean) {
    await setSoundOn(db, next);
    await refreshSettings();
  }

  async function shiftDayStart(delta: number) {
    const next = (settings.dayStartHour + delta + 24) % 24;
    await setDayStartHour(db, next);
    await refreshSettings();
    // What day it is has just changed, so everything derived from it is stale.
    await refresh();
  }

  async function togglePlain(next: boolean) {
    await setPlainMode(db, next);
    await refreshSettings();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, pad]}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeading title={t.tabs.settings.label} />

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.cardTitle}>Plain mode</Text>
              <Text style={styles.blurb}>
                Swaps labels and turns the effects off. For waiting rooms and screenshares.
              </Text>
            </View>
            <Toggle value={settings.plainMode} onValueChange={togglePlain} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.cardTitle}>Sound</Text>
              <Text style={styles.blurb}>
                Armament on a struck task. Mixes with whatever else is playing rather than
                interrupting it.
              </Text>
            </View>
            <Toggle
              value={settings.soundOn}
              onValueChange={toggleSound}
              tint={palette.crimson}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Day starts at</Text>
          <Text style={styles.blurb}>
            When the app rolls over. Set this past the end of your longest shift and a late
            night stays on the day you were working, instead of splitting in two while you are
            still up.
          </Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => void shiftDayStart(-1)}
              accessibilityRole="button"
              accessibilityLabel="An hour earlier"
              style={({ pressed }) => [styles.step, pressed && styles.pressed]}
            >
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.dayStart}>{describeDayStart(settings.dayStartHour)}</Text>
            <Pressable
              onPress={() => void shiftDayStart(1)}
              accessibilityRole="button"
              accessibilityLabel="An hour later"
              style={({ pressed }) => [styles.step, pressed && styles.pressed]}
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.footnote}>
            Only changes what counts as today. Nothing already written moves.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.keystoneTitle}</Text>
          <Text style={styles.blurb}>{t.keystoneBlurb}</Text>

          <Field label="Target hours" value={target} onChangeText={setTarget} numeric />
          <Field
            label="A bad night is under"
            value={threshold}
            onChangeText={setThreshold}
            numeric
          />
          <Field
            label="Warn hard after this many bad nights"
            value={escalate}
            onChangeText={setEscalate}
            numeric
          />
          <Field
            label={t.downstreamLabel}
            value={downstream}
            onChangeText={setDownstream}
            placeholder="Training, Reading"
          />

          <Pressable
            onPress={saveKeystone}
            accessibilityRole="button"
            style={({ pressed }) => [styles.save, pressed && styles.pressed]}
          >
            <Text style={styles.saveText}>Save keystone</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.trainingTitle}</Text>
          <Text style={styles.blurb}>
            The target is a line to read against, never a verdict. Nothing here can be failed.
          </Text>

          <Field
            label="Sessions per week"
            value={weeklyTarget}
            onChangeText={setWeeklyTarget}
            numeric
          />
          <Field
            label="A gap this long makes coming back a Return"
            value={gapDays}
            onChangeText={setGapDays}
            numeric
          />

          <Pressable
            onPress={saveTraining}
            accessibilityRole="button"
            style={({ pressed }) => [styles.save, pressed && styles.pressed]}
          >
            <Text style={styles.saveText}>Save training</Text>
          </Pressable>
        </View>

        <BackupCard />

        <Text style={styles.footer}>
          Everything lives on this device. Nothing is uploaded anywhere.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  numeric,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={palette.inkFaint}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },

    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.md,
    },
    cardTitle: { ...type.title, color: c.ink },
    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },

    switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
    switchText: { flex: 1, gap: space.xs },

    field: { gap: space.xs },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 11 },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      height: 44,
    },

    save: {
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
      marginTop: space.xs,
    },
    saveText: { ...type.body, color: c.onAccent },
    pressed: { ...press },

    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.xs,
    },
    step: {
      width: 52,
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: { ...type.heading, fontSize: 22, color: c.ink },
    dayStart: { ...type.display, fontSize: 30, color: c.violet },
    footnote: { ...type.mono, fontSize: 12, color: c.inkFaint, marginTop: space.xs },

    footer: { ...type.small, color: c.inkFaint, textAlign: 'center' },
  });
