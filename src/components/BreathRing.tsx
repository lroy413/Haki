import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BREATH } from '../domain/stillness';
import type { BreathPhases } from '../domain/breath';
import { radius } from '../theme/tokens';

/**
 * The ring you breathe with.
 *
 * Four seconds out, one held, six back in — the one piece of breathing advice
 * nobody argues with is that the long half should be the exhale. The ring
 * simply does that, forever, and nothing about it is measured or recorded.
 *
 * **No words on it.** The obvious version labels each phase "In", "Hold",
 * "Out", and the obvious version is wrong twice over: the gear screen's rule
 * is that a thing built to help you look away from a phone has no business
 * being interesting, and a text label has to be driven from a clock that
 * drifts out of phase with a native-driver animation the moment the app is
 * backgrounded. A shape that grows and shrinks needs no caption anyway.
 *
 * Opacity carries the colour, never a literal — the ground under this moves
 * through four palettes and an rgba() baked in here would only be right in
 * one of them.
 */

/** How small it gets at the bottom of the breath. Never to nothing. */
const FLOOR = 0.55;

/** The ring's idle cadence, as a pattern: the sits breathe to this. */
const DEFAULT_PATTERN: BreathPhases = {
  inMs: BREATH.inMs,
  holdInMs: BREATH.holdMs,
  outMs: BREATH.outMs,
  holdOutMs: 0,
};

export function BreathRing({
  color,
  size = 240,
  active = true,
  pattern = DEFAULT_PATTERN,
}: {
  color: string;
  size?: number;
  active?: boolean;
  /** The cadence to breathe at. Defaults to the sits' long-exhale idle. */
  pattern?: BreathPhases;
}) {
  const breath = useRef(new Animated.Value(FLOOR)).current;

  useEffect(() => {
    if (!active) return;
    // A zero-duration timing confuses neither driver, so the two holds are
    // simply present for every pattern and last no time when a cadence has
    // none — one sequence shape for all of them.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: pattern.inMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 1,
          duration: pattern.holdInMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: FLOOR,
          duration: pattern.outMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: FLOOR,
          duration: pattern.holdOutMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, breath, pattern]);

  const circle = { width: size, height: size, borderRadius: radius.pill };

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {/* The extent: where the breath reaches at the top. Still, and faint. */}
      <View
        style={[styles.outline, circle, { borderColor: color }]}
        // Decoration around a timer that already has an accessible label.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {/*
        Two views, not one. A single filled disc reads as a purple button
        someone forgot to label; it needs an edge to follow, and a border on
        the fill cannot have one — it would share the fill's opacity and
        disappear with it. So the body is soft and the edge is separate, both
        riding the same breath.
      */}
      <Animated.View
        style={[
          styles.body,
          circle,
          {
            backgroundColor: color,
            opacity: breath.interpolate({
              inputRange: [FLOOR, 1],
              outputRange: [0.09, 0.24],
            }),
            transform: [{ scale: breath }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.body,
          circle,
          {
            borderWidth: 2,
            borderColor: color,
            opacity: breath.interpolate({
              inputRange: [FLOOR, 1],
              outputRange: [0.45, 0.9],
            }),
            transform: [{ scale: breath }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  outline: { position: 'absolute', borderWidth: 1, opacity: 0.28 },
  body: { position: 'absolute' },
});
