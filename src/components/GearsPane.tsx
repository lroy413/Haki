import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { play } from '../sound';
import { useStore } from '../db/client';
import { gearSessionsOn, startGear } from '../db/repo';
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
} from '../domain/gears';
import { formatMinutes } from '../domain/tasks';
import { useHaki } from '../state/HakiProvider';
import { font, radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The Gears, as a pane.
 *
 * They lived on the Armament tab once, and the owner moved them off it: _"Haki
 * is will, Devil Fruit is ability."_ Armament is the productivity tool — the
 * list, the workouts, the schedule — and everything done under it hardens that
 * lens. The Gears are not that. They are Luffy's *ability*, spent rather than
 * built — and the ability tool has formed now (`app/ability.tsx`), so this is
 * its second tab. `/gears` still mounts the same pane, so nothing that pushed
 * there has to move.
 *
 * Nothing about the system underneath changed — the costs, the cooldown, the
 * lockout and the clock are all still `domain/gears.ts`, and a gear block
 * still hardens the *day*, because a day with ninety focused minutes in it
 * got used whichever page launched them.
 */
export function GearsPane() {
  const router = useRouter();
  const { db } = useStore();
  const { t, refresh, plainMode, palette, crew } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

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
    <View style={styles.content}>
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
              {/* The card is a door and looked like a paragraph. The word
                  goes last, where a call to action is read. */}
              {state.ready ? <Text style={styles.gearGo}>Start ›</Text> : null}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { gap: space.sm },
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
    gearName: { fontFamily: font.displayBold, fontSize: 20, color: c.ink },
    gearMinutes: { ...type.mono, color: c.inkDim },
    gearBlurb: { ...type.body, color: c.inkDim, lineHeight: 21 },
    gearCost: { ...type.mono, fontSize: 13, color: c.inkFaint },
    // Says the card is a door. Crimson because the Gears live under
    // Armament's light, and at label weight so it never competes with
    // the gear's own name.
    gearGo: { ...type.label, color: c.crimson, marginTop: space.xs },

    gearRunning: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.cyan,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    gearRunningLabel: { fontFamily: font.displayBold, fontSize: 20, color: c.ink },
    gearRunningHint: { ...type.mono, color: c.inkDim },

    pressed: { ...press },
  });
