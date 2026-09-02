import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { recentSessions } from '../src/db/repo';
import { useHaki } from '../src/state/HakiProvider';
import { BattleshipBag } from '../src/components/BattleshipBag';
import { GearsPane } from '../src/components/GearsPane';
import type { TrainingSessionRow } from '../src/db/schema';
import { underCrew } from '../src/theme/palettes';
import { usableBottom } from '../src/theme/viewport';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

type Tab = 'bag' | 'gears';

/**
 * The ability tool. Two tabs under one roof:
 *
 *   **Battleship Bags** — the gym, as the hull Garp punches. One hull a
 *   week, one hit per day trained, fresh on Monday. `components/BattleshipBag`.
 *
 *   **Gears** (Luffy) / **Styles** (Zoro) — the career ladder, with the
 *   focus sessions on its items, mounted from the same pane `/gears` shows.
 *   `components/GearsPane`, and `domain/ladder.ts` for every rule.
 *
 * The owner's framing: _"Haki is will, Devil Fruit is ability."_ Armament is
 * the tool for what you do and everything under it hardens that lens; this
 * is the room for the two things that are *trained* rather than done — the
 * body, and the ability. It is reached from the Do tab's door and keeps the
 * Armament light under whichever crew is flying.
 */
export default function AbilityScreen() {
  const { tab: raw } = useLocalSearchParams<{ tab?: string }>();
  const { db } = useStore();
  const { palette, crew, plainMode, t } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>(raw === 'gears' ? 'gears' : 'bag');
  const [sessions, setSessions] = useState<TrainingSessionRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void recentSessions(db, 60).then((rows) => {
        if (!cancelled) setSessions(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const gearsWord = crew.name === 'zoro' ? t.stylesTitle : t.gearsTitle;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + space.lg },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Two tabs. The lit one wears the Armament light: this whole room is
          under 武装色, and the tab bar's legend says one screen, one light. */}
      <View style={styles.tabs} accessibilityRole="tablist">
        {(
          [
            ['bag', plainMode ? t.bagTitle : `砲艦  ${t.bagTitle}`],
            ['gears', gearsWord],
          ] as [Tab, string][]
        ).map(([key, label]) => {
          const on = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.tab,
                on && { backgroundColor: lens.crimsonSoft, borderColor: lens.crimson },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tabText, on && { color: lens.crimson }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'bag' ? (
        <BattleshipBag sessions={sessions} tint={lens.crimson} />
      ) : (
        <GearsPane />
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.md },
    tabs: { flexDirection: 'row', gap: space.sm },
    tab: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      paddingHorizontal: space.sm,
    },
    tabText: { ...type.mono, fontSize: 13, color: c.inkDim },
    pressed: { ...press },
  });
