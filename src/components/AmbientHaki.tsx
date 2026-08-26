import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { underCrew } from '../theme/palettes';
import { darkest } from '../theme/palettes';
import { nextGapMs, weatherFor } from '../domain/ambient';
import { SkyBolt } from './instruments/SkyBolt';

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
 * **Every flicker is a new bolt.** This used to throw one fixed field of
 * burst geometry around the screen at different offsets and rotations, on
 * the theory that at this opacity nobody could tell. They could: the burst
 * is a radial starburst thrown off a fist, and rotating it behind the app
 * reads as a firework going off, not as weather. A falling bolt is a
 * different drawing — see `instruments/SkyBolt.tsx` — and it is cheap
 * enough to generate one per strike, which is also what makes each strike
 * genuinely different rather than the same shape at a new angle.
 *
 * Off entirely in plain mode, at zero intensity, and under reduced motion. It
 * is the loudest ambient thing in the app and the first that should go quiet.
 */

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

  const flash = useRef(new Animated.Value(0)).current;
  // The shape of the current strike. A number rather than the geometry: the
  // bolt is derived from it, so re-rendering for any other reason cannot
  // reshape a strike that is already on screen.
  const [seed, setSeed] = useState(1);
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
      setSeed(Math.floor(Math.random() * 0xffffff) + 1);
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
    }),
    [flash, weather?.opacity, intensity],
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
        <SkyBolt
          seed={seed}
          core={core}
          halo={underCrew(palette, crew).crimson}
          width={weather.width}
        />
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
