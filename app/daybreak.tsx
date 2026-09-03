import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../src/db/client';
import { setDayStartHour } from '../src/db/settings';
import { describeDayStart } from '../src/domain/date';
import { SettingsPage } from '../src/components/SettingsPage';
import { useHaki } from '../src/state/HakiProvider';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Daybreak — where the day turns over.
 *
 * A day does not end at midnight here; everything that asks "what day is it"
 * goes through this boundary (`domain/date.ts`). The stepper writes the hour
 * and then refreshes the whole app, because the moment it lands, everything
 * derived from "today" is stale.
 */
export default function DaybreakScreen() {
  const { db, settings, refreshSettings } = useStore();
  const { palette, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // The displayed hour is local and moves with every tap. It used to be
  // computed from `settings`, which lags a write by a full reload — so two
  // quick taps both read the old hour and the second one was lost. The
  // stored value reconciles it when it lands.
  const [hour, setHour] = useState(settings.dayStartHour);
  useEffect(() => {
    setHour(settings.dayStartHour);
  }, [settings.dayStartHour]);

  async function shiftDayStart(delta: number) {
    const next = (hour + delta + 24) % 24;
    setHour(next);
    await setDayStartHour(db, next);
    await refreshSettings();
    // What day it is has just changed, so everything derived from it is stale.
    await refresh();
  }

  return (
    <SettingsPage kind="daybreak">
      <Text style={styles.blurb}>
        When the app rolls over. Set this past the end of your longest shift and a late night
        stays on the day you were working, instead of splitting in two while you are still up.
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
        <Text style={styles.dayStart}>{describeDayStart(hour)}</Text>
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
        Only changes what counts as today, and when Day’s End opens: eighteen hours after it.
        Nothing already written moves.
      </Text>
    </SettingsPage>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },

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
    stepText: { ...type.heading, fontSize: 24, color: c.ink },
    dayStart: { ...type.display, fontSize: 30, color: c.violet },
    footnote: { ...type.mono, fontSize: 13, color: c.inkFaint, marginTop: space.xs },
    pressed: { ...press },
  });
