import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { play } from '../src/sound';
import { useStore } from '../src/db/client';
import { gearSessionsOn, startGear } from '../src/db/repo';
import {
  GEAR_ORDER,
  GEAR_SOUND,
  availability,
  minutesToday,
  runningSession,
  type GearName,
  type GearSession,
  styleFor,
  focusBlurb,
} from '../src/domain/gears';
import { formatMinutes } from '../src/domain/tasks';
import { useHaki } from '../src/state/HakiProvider';
import { font, radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * The Gears, on a screen of their own.
 *
 * They lived on the Armament tab once, and the owner moved them off it: _"Haki
 * is will, Devil Fruit is ability."_ Armament is the productivity tool — the
 * list, the workouts, the schedule — and everything done under it hardens that
 * lens. The Gears are not that. They are Luffy's *ability*, spent rather than
 * built, and they belong to the ability page when its vision forms.
 *
 * Until it does, they wait here: pushed, not a tab, reached from the day's
 * practice card. Nothing about the system underneath changed — the costs, the
 * cooldown, the lockout and the clock are all still `domain/gears.ts`, and a
 * gear block still hardens the *day*, because a day with ninety focused
 * minutes in it got used whichever page launched them.
 */
export default function GearsScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { t, refresh, plainMode, palette, crew } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const [gears, setGears] = useState<GearSession[]>([]);

  const reload = useCallback(async () => {
    setGears(await gearSessionsOn(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function shiftInto(gear: GearName) {
    play(GEAR_SOUND[gear]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await startGear(db, gear);
    await refresh();
    router.push({ pathname: '/gear', params: { gear } });
  }

  const nowMs = Date.now();
  const running = runningSession(gears, nowMs);
  const inGear = minutesToday(gears, nowMs);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, space.md) + space.lg },
      ]}
    >
      <Text style={styles.blurb}>{focusBlurb(crew.name)}</Text>

      {running ? (
        <Pressable
          onPress={() => router.push({ pathname: '/gear', params: { gear: running.gear } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.gearRunning, pressed && styles.pressed]}
        >
          <Text style={styles.gearRunningLabel}>
            {styleFor(crew.name, running.gear).label} is running
          </Text>
          <Text style={styles.gearRunningHint}>Tap to go back to it</Text>
        </Pressable>
      ) : (
        GEAR_ORDER.map((name) => {
          const gear = styleFor(crew.name, name);
          const state = availability(name, gears, nowMs);
          return (
            <Pressable
              key={name}
              onPress={() => void shiftInto(name)}
              disabled={!state.ready}
              accessibilityRole="button"
              accessibilityLabel={`${gear.label}, ${gear.minutes} minutes`}
              style={({ pressed }) => [
                styles.gear,
                !state.ready && styles.gearLocked,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.gearHead}>
                <Text style={styles.gearName}>
                  {plainMode ? gear.label : `${gear.kanji}  ${gear.label}`}
                </Text>
                <Text style={styles.gearMinutes}>{formatMinutes(gear.minutes)}</Text>
              </View>
              <Text style={styles.gearBlurb}>{state.ready ? gear.blurb : state.reason}</Text>
              {state.ready && gear.cost ? (
                <Text style={styles.gearCost}>{gear.cost}</Text>
              ) : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm },
    blurb: { ...type.body, color: c.inkDim, lineHeight: 22, marginBottom: space.xs },

    gear: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    // Still legible, still readable — a locked gear explains itself, so it must
    // not be dimmed to the point where the reason cannot be read.
    gearLocked: { backgroundColor: c.bg, borderColor: c.lineSoft },
    gearHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    gearName: { fontFamily: font.displayBold, fontSize: 18, color: c.ink },
    gearMinutes: { ...type.mono, color: c.inkDim },
    gearBlurb: { ...type.body, color: c.inkDim, lineHeight: 21 },
    gearCost: { ...type.mono, fontSize: 12, color: c.inkFaint },

    gearRunning: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.cyan,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    gearRunningLabel: { fontFamily: font.displayBold, fontSize: 18, color: c.ink },
    gearRunningHint: { ...type.mono, color: c.inkDim },

    pressed: { ...press },
  });
