import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { seaState } from '../domain/practice';
import { Sea } from './instruments/Sea';
import { Sunny } from './instruments/Sunny';
import { space } from '../theme/tokens';

/**
 * The band the Sunny sails in, at the top of the home screen.
 *
 * Full-bleed to both edges, which is the payoff for taking the header off:
 * there is a real edge to run to now. It negates the screen's own horizontal
 * padding rather than asking the screen to special-case it, so nothing else on
 * the home screen has to know this exists.
 *
 * The state is in the accessible name and nowhere else on the band. The
 * practice card below already says what the day has had in it; a caption here
 * would be the same information twice, and the ship is supposed to be
 * something you notice rather than something you read.
 */

/** The screen's own side padding, given back so the water reaches the edge. */
const BLEED = space.lg;

export function SeaBand() {
  const { palette, hardening, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(), []);

  return (
    <View
      style={styles.band}
      accessibilityRole="image"
      accessibilityLabel={
        plainMode ? undefined : `The Thousand Sunny, ${seaState(hardening).toLowerCase()}`
      }
      // Plain mode keeps the ship — it is the app's own picture of the day,
      // not an effect — but stops narrating a metaphor nobody asked for.
      importantForAccessibility={plainMode ? 'no-hide-descendants' : 'yes'}
    >
      {/* Water first, ship on top. Two drawings in one coordinate system,
          stacked — so redrawing either one never touches the other. */}
      <View style={StyleSheet.absoluteFill}>
        <Sea level={hardening} colour={palette.inkFaint} />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <Sunny
          level={hardening}
          ink={palette.ink}
          faint={palette.inkFaint}
          flag={palette.crimson}
        />
      </View>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    band: {
      height: 76,
      marginHorizontal: -BLEED,
      // Trimmed top and bottom: the gap either side of it comes from the
      // screen's own gap, and the drawing already carries its own air.
      marginTop: -space.xs,
      marginBottom: -space.xs,
    },
  });
