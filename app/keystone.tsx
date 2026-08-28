import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useStore } from '../src/db/client';
import { setKeystone } from '../src/db/settings';
import { Field } from '../src/components/Field';
import { SettingsPage } from '../src/components/SettingsPage';
import { useHaki } from '../src/state/HakiProvider';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * The Keystone — the habit everything else stands on, which for the owner is
 * sleep. The numbers here tune the cascade warning (`domain/cascade.ts`):
 * what a good night is, what a bad one is, and how many bad ones in a row
 * before the app says so harder.
 */
export default function KeystoneScreen() {
  const { db, settings, refreshSettings } = useStore();
  const { t, palette, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [threshold, setThreshold] = useState(String(settings.keystone.thresholdHours));
  const [target, setTarget] = useState(String(settings.keystone.targetHours));
  const [escalate, setEscalate] = useState(String(settings.keystone.escalateAfterNights));
  const [downstream, setDownstream] = useState(settings.keystone.downstreamNames.join(', '));
  const [saved, setSaved] = useState(false);

  /** Editing anything takes the button back from "Saved" to willing. */
  function touch<T>(set: (v: T) => void) {
    return (v: T) => {
      setSaved(false);
      set(v);
    };
  }

  const committing = useSingleFlight();
  async function saveKeystone() {
    const parsedTarget = Number.parseFloat(target.replace(',', '.'));
    const parsedThreshold = Number.parseFloat(threshold.replace(',', '.'));
    const parsedEscalate = Number.parseInt(escalate, 10);

    await committing(async () => {
      await setKeystone(db, {
        targetHours: Number.isFinite(parsedTarget)
          ? parsedTarget
          : settings.keystone.targetHours,
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
      setSaved(true);
    });
  }

  return (
    <SettingsPage kind="keystone">
      <Text style={styles.blurb}>{t.keystoneBlurb}</Text>

      <Field label="Target hours" value={target} onChangeText={touch(setTarget)} numeric />
      <Field
        label="A bad night is under"
        value={threshold}
        onChangeText={touch(setThreshold)}
        numeric
      />
      <Field
        label="Warn hard after this many bad nights"
        value={escalate}
        onChangeText={touch(setEscalate)}
        numeric
      />
      <Field
        label={t.downstreamLabel}
        value={downstream}
        onChangeText={touch(setDownstream)}
        placeholder="Training, Reading"
      />

      <Pressable
        onPress={saveKeystone}
        accessibilityRole="button"
        style={({ pressed }) => [styles.save, pressed && styles.pressed]}
      >
        <Text style={styles.saveText}>{saved ? 'Saved' : 'Save keystone'}</Text>
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
