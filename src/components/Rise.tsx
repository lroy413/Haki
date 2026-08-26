import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type ViewStyle } from 'react-native';
import { useHaki } from '../state/HakiProvider';

/**
 * A card arriving.
 *
 * The whole motion vocabulary of this app in one component: things fade up
 * a short distance, quickly, and settle. Nothing bounces, nothing slides in
 * from off-screen, nothing spins. A screen of six of these staggered by a
 * few frames reads as the page assembling itself rather than as six
 * separate animations, which is the difference between expensive and busy.
 *
 * Three rules, and they are the reason this is a component rather than six
 * hand-rolled `Animated.Value`s:
 *
 * - **Plain mode gets none of it.** Same law as `lit()` and the settings
 *   chart: an animation is a performance and plain mode stops the app
 *   performing. It renders the final frame immediately.
 * - **So does anyone who asked the OS for less motion.** Checked once at
 *   mount through `AccessibilityInfo`, and re-checked when the setting
 *   changes, because someone turning it on mid-session means it now.
 * - **It only ever runs on arrival.** Re-rendering a card must not replay
 *   it, or every keystroke in a form animates the card around it.
 *
 * `delay` is the stagger. Keep it small — 40ms a card is enough to read as
 * a cascade, and 150 is enough to read as a wait.
 */
export function Rise({
  children,
  delay = 0,
  /** How far it travels. Larger for the first card, small for rows. */
  distance = 10,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}) {
  const { plainMode } = useHaki();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduced(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const still = plainMode || reduced;
  // Starts at the final frame when motion is off, so the branch below never
  // has to animate to catch up — and a card that mounts while plain mode is
  // on simply appears.
  const t = useRef(new Animated.Value(still ? 1 : 0)).current;

  useEffect(() => {
    if (still) {
      t.setValue(1);
      return;
    }
    const run = Animated.timing(t, {
      toValue: 1,
      duration: 260,
      delay,
      // Decelerate: fast out of the gate, settling at the end. The one
      // curve this app uses.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
    // `delay` is a constant per card. Depending on it would restart the
    // animation whenever a parent re-orders, which is exactly the replay
    // the third rule forbids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
