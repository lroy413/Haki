import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import { onImpact } from '../impact';
import { useHaki } from '../state/HakiProvider';
import { Fist } from './instruments/Fist';
import { ScratchField } from './ScratchField';

/**
 * The impact frame.
 *
 * The anime's trick for making a hit felt rather than seen: one or two frames
 * of stark, inverted, abstract art at the moment of contact, gone before the
 * eye can read them. Brevity is the entire effect — held any longer it becomes
 * a transition, and a transition is furniture.
 *
 * Two frames, both the instrument of the strike drawn full-screen:
 *
 *   1. the ground inverts, the fist in the old ground's colour, Haki rim hot
 *   2. everything flips — dark ground, pale fist, crimson rim
 *
 * and out, inside 110ms. The corona and the sound carry on underneath; this
 * is the frame *between* them.
 *
 * The fist is the instrument of the default theme. A future theme swaps the
 * silhouette — Zoro's is a sword — which is why the drawing takes its colours
 * as props and owns nothing.
 *
 * Silent in plain mode, at zero intensity, and under reduced motion — a
 * full-screen flash is exactly what that setting exists to prevent.
 */

const FRAME_ONE_MS = 55;
const FRAME_TWO_MS = 110;

export function ImpactLayer() {
  const { palette, intensity, plainMode } = useHaki();
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduceMotion = useRef(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) reduceMotion.current = on;
      })
      .catch(() => {
        /* unknowable — stay off the cautious side and keep the frames */
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      reduceMotion.current = on;
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const stop = onImpact(() => {
      if (plainMode || intensity <= 0 || reduceMotion.current) return;
      timers.current.forEach(clearTimeout);
      setPhase(1);
      timers.current = [
        setTimeout(() => setPhase(2), FRAME_ONE_MS),
        setTimeout(() => setPhase(0), FRAME_TWO_MS),
      ];
    });
    return () => {
      stop();
      timers.current.forEach(clearTimeout);
    };
  }, [plainMode, intensity]);

  if (phase === 0) return null;

  // Frame one inverts the ground; frame two flips back darker than it began.
  const ground = phase === 1 ? palette.ink : palette.bg;
  const body = phase === 1 ? palette.bg : palette.ink;
  const rim = phase === 1 ? palette.warn : palette.crimson;

  const size = Math.min(width, height) * 0.98;

  return (
    <View pointerEvents="none" style={[styles.layer, { backgroundColor: ground }]}>
      {/* The scratch-field tears edge to edge underneath the instrument. */}
      <View style={StyleSheet.absoluteFill}>
        <ScratchField color={body} />
      </View>
      {/* The second frame kicks: slightly bigger, slightly off-true, the way
          the real frames shake between cels. */}
      <View style={phase === 2 ? styles.kick : undefined}>
        <Fist size={size} fill={body} rim={rim} sheen={ground} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kick: { transform: [{ scale: 1.06 }, { rotate: '-2deg' }] },
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
});
