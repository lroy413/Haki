import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/db/client';
import { setCrew } from '../src/db/settings';
import { CREW_ORDER, crewFor, type CrewName } from '../src/domain/crew';
import { SettingsPage } from '../src/components/SettingsPage';
import { useHaki } from '../src/state/HakiProvider';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Whose will — the crew picker, ashore on its own island.
 *
 * Everything a crew may and may not change is documented in
 * `src/domain/crew.ts`; this screen only chooses. The choice is instant and
 * needs no save button: there is nothing to get wrong and nothing recorded
 * changes.
 */
export default function CrewScreen() {
  const { db, settings, refreshSettings } = useStore();
  const { t, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // The chosen flag hoists in the same frame as the tap; the stored value
  // catches up through the provider and reconciles. Without this the row
  // sat unselected through the settings write and read as a missed tap.
  const [chosen, setChosen] = useState<CrewName>(settings.crew);
  useEffect(() => {
    setChosen(settings.crew);
  }, [settings.crew]);

  const committing = useSingleFlight();
  async function chooseCrew(next: CrewName) {
    if (next === chosen) return;
    setChosen(next);
    void Haptics.selectionAsync();
    await committing(async () => {
      await setCrew(db, next);
      await refreshSettings();
    });
  }

  return (
    <SettingsPage kind="crew">
      <Text style={styles.blurb}>{t.crewBlurb}</Text>
      <View style={styles.crewRow}>
        {CREW_ORDER.map((name) => {
          const option = crewFor(name);
          const on = chosen === name;
          return (
            <Pressable
              key={name}
              onPress={() => void chooseCrew(name)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${option.label}. ${option.blurb}`}
              style={({ pressed }) => [
                styles.crewCard,
                on && { borderColor: palette[option.conquerors] },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.crewName, on && { color: palette[option.conquerors] }]}>
                {option.label}
              </Text>
              <Text style={styles.crewBlurb}>{option.blurb}</Text>
            </Pressable>
          );
        })}
      </View>
    </SettingsPage>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },

    crewRow: { flexDirection: 'row', gap: space.sm },
    crewCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      padding: space.md,
      gap: space.xs,
      minHeight: 44,
    },
    crewName: { ...type.heading, fontSize: 15, color: c.ink },
    crewBlurb: { ...type.small, fontSize: 13, color: c.inkDim, lineHeight: 18 },
    pressed: { ...press },
  });
