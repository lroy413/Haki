import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { underCrew } from '../theme/palettes';
import { darkest } from '../theme/palettes';
import { nextGapMs, weatherFor } from '../domain/ambient';
import { Lightning } from './Lightning';

/**
 * The weather: lightning in the background, as the day hardens.
 *
 * Armament leaks. Nothing at all on an unhardened morning; an occasional
 * flicker once the day has something in it; something closer to a storm by the
 * end of one that had a lot. The cadence and the strength are in
 * `domain/ambient.ts`, with a floor on the interval that no level may go under.
 *
 * **Above the content, not behind it.** Behind would be invisible — every
 * screen paints its own opaque ground. So this is an overlay at a low enough
 * opacity to read as distant sky rather than as interface, sitting under the
 * impact frame and over everything else, and never taking a touch.
 *
 * Each flicker lands somewhere different. The bolts themselves are one fixed
 * field — regenerating geometry per strike would be work for nothing — so
 * variety comes from throwing the whole field off-centre and turning it, which
 * at this opacity is indistinguishable from a new one.
 *
 * Off entirely in plain mode, at zero intensity, and under reduced motion. It
 * is the loudest ambient thing in the app and the first that should go quiet.
 */

/** Where a flicker is thrown from, as a fraction of the screen. */
const SPOTS = [
  { x: -0.34, y: -0.34, rotate: '14deg', scale: 1.15 },
  { x: 0.33, y: -0.28, rotate: '-20deg', scale: 1.05 },
  { x: -0.18, y: 0.3, rotate: '32deg', scale: 1.1 },
  { x: 0.3, y: 0.26, rotate: '-9deg', scale: 1.25 },
  { x: 0.02, y: -0.46, rotate: '5deg', scale: 1.3 },
  { x: -0.4, y: 0.05, rotate: '-28deg', scale: 1.12 },
];

/**
 * One flicker: hard on, a dip, on again, then out.
 *
 * Two peaks rather than one — real lightning stutters, and a single fade in
 * and out reads as a screen dimming. Two is also the most it may ever be:
 * three inside a second is the line photosensitive-seizure guidance draws, and
 * this sits at two inside three hundred milliseconds with several seconds of
 * dark either side.
 */
const FLICKER = [
  { toValue: 1, duration: 45 },
  { toValue: 0.38, duration: 55 },
  { toValue: 0.9, duration: 45 },
  { toValue: 0, duration: 170 },
];

export function AmbientHaki() {
  const { palette, hardening, intensity, plainMode, crew } = useHaki();
  const { width, height } = useWindowDimensions();

  const flash = useRef(new Animated.Value(0)).current;
  const [spot, setSpot] = useState(SPOTS[0]);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduceMotion(on);
      })
      .catch(() => {
        /* unknowable — leave it on, the same as the impact frame does */
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  const weather = plainMode || intensity <= 0 || reduceMotion ? null : weatherFor(hardening);

  useEffect(() => {
    if (!weather) {
      flash.setValue(0);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const strike = () => {
      setSpot(SPOTS[Math.floor(Math.random() * SPOTS.length)]);
      Animated.sequence(
        FLICKER.map((step) => Animated.timing(flash, { ...step, useNativeDriver: true })),
      ).start();
      queue();
    };
    const queue = () => {
      timer = setTimeout(strike, nextGapMs(weather, Math.random()));
    };
    queue();
    return () => clearTimeout(timer);
  }, [weather, flash]);

  const style = useMemo(
    () => ({
      opacity: flash.interpolate({
        inputRange: [0, 1],
        outputRange: [0, (weather?.opacity ?? 0) * intensity],
      }),
      transform: [
        { translateX: spot.x * width },
        { translateY: spot.y * height },
        { rotate: spot.rotate },
        { scale: spot.scale },
      ],
    }),
    [flash, weather?.opacity, intensity, spot, width, height],
  );

  if (!weather) return null;

  // The darkest colour this palette owns: black lightning, the same as the
  // impact frame's. On the grounds this ever runs on, the core sinks in and
  // the crimson rim is what you see — which is how it is drawn over a night
  // sky.
  const core = darkest(palette);

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        {/* The weather is hardening made visible — 武装色's doing — so its
            halo follows the crew's coating. */}
        <Lightning core={core} halo={underCrew(palette, crew).crimson} width={weather.width} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Under the impact frame, over everything else.
    zIndex: 900,
    elevation: 900,
    overflow: 'hidden',
  },
});
