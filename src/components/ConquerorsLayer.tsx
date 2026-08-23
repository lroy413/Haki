import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { onConquerors } from '../impact';
import { useHaki } from '../state/HakiProvider';
import { darkest } from '../theme/palettes';
import { Lightning } from './Lightning';

/**
 * 覇王色 — the Conqueror's burst.
 *
 * The one loud thing in the app, and the whole design is that it almost never
 * happens. It fires on exactly one event: an island reached on the Log Pose.
 * That is weeks of work closing, a handful of times a year — and the concept
 * doc is right that this is the entire value. Fired weekly it is a screen
 * transition. Fired four times a year it is electric.
 *
 * **The second lightning**, which `Lightning.tsx` was written for and left a
 * call site open for. Where the impact frame's bolts are black with a hot rim
 * — Armament crackling off a fist — these are black with a *violet* one, thrown
 * from three overlapping fields at once so the screen fills rather than a
 * single strike landing on it. Conqueror's does not hit a thing; it goes out.
 *
 * Slower than the impact frame on purpose. That one is 110ms and is over
 * before the eye can read it, because a hit you can study is furniture. This
 * one is meant to be looked at.
 *
 * Two peaks, never three: the same photosensitivity line the ambient weather
 * holds. Silent in plain mode, at zero intensity, and under reduced motion.
 */

/** In hard, a stutter, then a long fall. One event, two peaks. */
const BURST = [
  { toValue: 1, duration: 70 },
  { toValue: 0.45, duration: 90 },
  { toValue: 0.95, duration: 60 },
  { toValue: 0, duration: 620 },
];

const TOTAL_MS = BURST.reduce((sum, step) => sum + step.duration, 0);

/**
 * Three fields, turned against each other so no two bolts run parallel.
 *
 * `width` is in the drawing's own 100-unit box and is multiplied twice on the
 * way to the screen — once by the box-to-screen ratio (about 3.9 on a phone)
 * and again by `scale` — and the halo is 2.4× the core on top of that. A width
 * of 1.1 at scale 1.5 came out as a fifteen-pixel ribbon: angular grey tubing
 * rather than lightning. Scale stretches the bolt *geometry* too, so a field
 * blown up past about 1.5 stops reading as lightning at all — six segments
 * become six long straight wires. These stay near 1 and take their coverage
 * from `count` instead.
 */
const FIELDS = [
  { rotate: '0deg', scale: 1.3, width: 0.42, count: 13 },
  { rotate: '58deg', scale: 1.05, width: 0.5, count: 11 },
  { rotate: '-47deg', scale: 1.55, width: 0.36, count: 15 },
];

export function ConquerorsLayer() {
  const { palette, intensity, plainMode } = useHaki();
  const [live, setLive] = useState(false);
  const flash = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (mounted) reduceMotion.current = on;
      })
      .catch(() => {
        /* unknowable — matches the impact frame and stays on */
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      reduceMotion.current = on;
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const stop = onConquerors(() => {
      if (plainMode || intensity <= 0 || reduceMotion.current) return;
      clearTimeout(timer);
      setLive(true);
      flash.setValue(0);
      Animated.sequence(
        BURST.map((step) => Animated.timing(flash, { ...step, useNativeDriver: true })),
      ).start();
      // Unmounted rather than left at zero opacity: three lightning fields are
      // the most expensive drawing in the app and it has no business sitting
      // over every screen for the rest of the year.
      timer = setTimeout(() => setLive(false), TOTAL_MS + 60);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [plainMode, intensity, flash]);

  const style = useMemo(
    () => ({
      opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, intensity] }),
    }),
    [flash, intensity],
  );

  if (!live) return null;

  // Both the bolt core and the wash behind them. `darkest()` rather than
  // `palette.ink` — see the note on it; the name is a trap and this effect is
  // where it was sprung. The two sharing a colour is not a compromise either:
  // the core sinks into the ground and the violet rim is all that is left,
  // which is how these bolts are drawn over a night sky.
  const black = darkest(palette);

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        {/* The screen goes dark before anything is drawn on it. Black
            lightning needs a ground it can be black against: over paper at
            two-thirds opacity the bolts came out grey wire with a lavender
            edge, which is a diagram of lightning rather than lightning.
            Darkened, not inverted — the impact frame flips because a strike is
            a cut between two cels, and this is one continuous moment that a
            flip would turn into a screen error. */}
        <View style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: black }]} />
        {FIELDS.map((field) => (
          <View
            key={field.rotate}
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ rotate: field.rotate }, { scale: field.scale }] },
            ]}
          >
            <Lightning
              core={black}
              halo={palette.violet}
              width={field.width}
              count={field.count}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { opacity: 0.86 },
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Above the impact frame: nothing outranks this, and the two can only ever
    // overlap if a task is struck inside the same second an island is reached.
    zIndex: 1100,
    elevation: 1100,
    overflow: 'hidden',
  },
});
