import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useStore } from '../src/db/client';
import { setTraining } from '../src/db/settings';
import { Field } from '../src/components/Field';
import { SettingsPage } from '../src/components/SettingsPage';
import { useHaki } from '../src/state/HakiProvider';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * The training numbers — how many sessions a week to read against, and how
 * long a gap makes coming back a Return. Lines to read against, never
 * verdicts; nothing here can be failed.
 */
export default function TrainingScreen() {
  const { db, settings, refreshSettings } = useStore();
  const { palette, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [weeklyTarget, setWeeklyTarget] = useState(String(settings.training.weeklyTarget));
  const [gapDays, setGapDays] = useState(String(settings.training.gapDaysForReturn));
  const [saved, setSaved] = useState(false);

  /** Editing anything takes the button back from "Saved" to willing. */
  function touch(set: (v: string) => void) {
    return (v: string) => {
      setSaved(false);
      set(v);
    };
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
    setSaved(true);
  }

  return (
    <SettingsPage kind="training">
      <Text style={styles.blurb}>
        The target is a line to read against, never a verdict. Nothing here can be failed.
      </Text>

      <Field
        label="Sessions per week"
        value={weeklyTarget}
        onChangeText={touch(setWeeklyTarget)}
        numeric
      />
      <Field
        label="A gap this long makes coming back a Return"
        value={gapDays}
        onChangeText={touch(setGapDays)}
        numeric
      />

      <Pressable
        onPress={saveTraining}
        accessibilityRole="button"
        style={({ pressed }) => [styles.save, pressed && styles.pressed]}
      >
        <Text style={styles.saveText}>{saved ? 'Saved' : 'Save training'}</Text>
      </Pressable>
    </SettingsPage>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },

    save: {
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
      marginTop: space.xs,
    },
    saveText: { ...type.body, color: c.onAccent },
    pressed: { ...press },
  });
