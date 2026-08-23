import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { radius as radii } from '../theme/tokens';

/**
 * The moment of emission.
 *
 * Reference frames show it as a corona hugging the contour of the fist —
 * orange-white at the inner edge, falling to red at the outer, and gone
 * again. It is the push outward, not a state something rests in, so this is
 * an animation rather than a palette. Nothing here changes any colour that
 * survives the press.
 *
 * Two rings rather than one. A single expanding outline reads as a ripple,
 * which is the wrong idiom entirely — a Material touch response, a thing the
 * screen does *to* acknowledge you. Offsetting a hot inner ring against a
 * slower red outer one gives the edge its gradient and reads as something
 * being pushed out of the element.
 *
 * It rides `intensity`, so it fades with Will Reserve and vanishes completely
 * in plain mode — the concept doc's rule that the app's own Haki stops
 * working when yours does, and the reason this takes no `enabled` prop.
 */

const DURATION = 520;

export function Emission({
  trigger,
  radius = radii.md,
  children,
  style,
}: {
  /** Bump this to fire. Any change fires once; the initial value never does. */
  trigger: number;
  radius?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { palette, intensity, ryuo } = useHaki();
  const inner = useRef(new Animated.Value(0)).current;
  const outer = useRef(new Animated.Value(0)).current;
  // Its own value, on its own driver: a shadow cannot be animated natively,
  // and mixing drivers on one value throws.
  const glow = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);

  useEffect(() => {
    // Mounting is not an act. Only a change after the first render fires.
    if (!armed.current) {
      armed.current = true;
      return;
    }
    if (intensity <= 0) return;

    inner.setValue(0);
    outer.setValue(0);
    glow.setValue(0);
    Animated.parallel([
      Animated.timing(inner, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(outer, {
        toValue: 1,
        duration: DURATION,
        delay: 70,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [trigger, intensity, inner, outer, glow]);

  /**
   * Three bands, not two.
   *
   * The corona in the reference is thick and graded — hot at the contour,
   * falling to red at its edge — and two thin outlines render as a border
   * being briefly recoloured. Widths and peaks are set so it still reads at
   * the 0.6 intensity of an unknown reserve, which is the state the home
   * screen is in most mornings.
   */
  const rings = useMemo(() => {
    // Reach only ever scales the distance travelled, never the starting size,
    // so tier 0 is exactly the corona everyone gets and every tier above it
    // pushes the same shape further out.
    const far = (to: number) => 1 + (to - 1) * ryuo.reach;
    return [
      { value: inner, colour: palette.warn, to: far(1.05), peak: 1, width: 3 },
      { value: inner, colour: palette.crimson, to: far(1.13), peak: 0.95, width: 5 },
      { value: outer, colour: palette.crimson, to: far(1.22), peak: 0.55, width: 3 },
    ];
  }, [inner, outer, palette.warn, palette.crimson, ryuo.reach]);

  return (
    <View style={style}>
      {/*
        The soft half. Borders in React Native cannot blur, so three hard rings
        alone read as concentric rectangles rather than a corona. This is a
        shadow doing the falloff underneath them — real on iOS and on the web,
        and degrading to a flat elevation on Android, which is the one platform
        this app is not aimed at.
      */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: 1,
            borderColor: palette.crimson,
            shadowColor: palette.crimson,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 22,
            elevation: 12,
            opacity: glow.interpolate({
              inputRange: [0, 0.14, 1],
              outputRange: [0, intensity, 0],
            }),
          },
        ]}
      />
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: ring.width,
              borderColor: ring.colour,
              opacity: ring.value.interpolate({
                inputRange: [0, 0.12, 1],
                outputRange: [0, ring.peak * intensity, 0],
              }),
              transform: [
                {
                  scale: ring.value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, ring.to],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      {children}
    </View>
  );
}
