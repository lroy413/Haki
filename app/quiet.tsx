import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from '../src/db/client';
import { setPlainMode, setSoundOn } from '../src/db/settings';
import { SettingsPage } from '../src/components/SettingsPage';
import { Toggle } from '../src/components/Toggle';
import { useHaki } from '../src/state/HakiProvider';
import { space, type } from '../src/theme/tokens';
import { row } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Quiet — the two mute switches, together because they are the same kind of
 * thing: how much of itself the app performs. Plain mode is the big one and
 * turns everything off at once, sound included; the sound switch alone stops
 * the effects being heard without stopping them being seen.
 */
export default function QuietScreen() {
  const { db, settings, refreshSettings } = useStore();
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  async function togglePlain(next: boolean) {
    await setPlainMode(db, next);
    await refreshSettings();
  }

  async function toggleSound(next: boolean) {
    await setSoundOn(db, next);
    await refreshSettings();
  }

  return (
    <SettingsPage kind="quiet">
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
          <Toggle value={settings.soundOn} onValueChange={toggleSound} tint={palette.crimson} />
        </View>
      </View>
    </SettingsPage>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { ...row(c), padding: space.lg },
    cardTitle: { ...type.title, color: c.ink },
    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
    switchText: { flex: 1, gap: space.xs },
  });
