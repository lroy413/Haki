/**
 * The moon, as it actually is tonight.
 *
 * The chart's moon is not a decoration picked once — it shows the real
 * phase, computed from the date. A mean-synodic calculation: age is days
 * since a known new moon, folded into the 29.53-day cycle. Accurate to
 * within a day or so of the true phase, which is exactly as accurate as an
 * eye on the sky — the drawing is fifteen units across.
 *
 * One deliberate exception to the house rule about dates: everything else
 * asking "what day is it" goes through `todayKey()` because the *voyage's*
 * day rolls over at a configured hour. The sky does not keep the voyage's
 * clock. The moon takes a plain `Date` from the caller, because its phase
 * is a fact about the world, not about the log.
 */

/** Mean length of the synodic month, in days. */
export const SYNODIC_DAYS = 29.530588853;

/** A known new moon: 2000-01-06 18:14 UTC. */
const EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);

export type MoonPhase = {
  /** Days since new moon, 0 ≤ age < SYNODIC_DAYS. */
  age: number;
  /** Illuminated fraction of the disc, 0 (new) to 1 (full). */
  fraction: number;
  /** True from new toward full — the right limb is lit, seen from the north. */
  waxing: boolean;
  /** The phase, nameable: "waxing gibbous", "full moon", … */
  name: string;
};

export function moonPhase(date: Date): MoonPhase {
  const days = (date.getTime() - EPOCH_MS) / 86_400_000;
  const age = ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  // The illuminated fraction follows the cosine of the phase angle: 0 at
  // new, 1/2 at the quarters, 1 at full.
  const fraction = (1 - Math.cos((2 * Math.PI * age) / SYNODIC_DAYS)) / 2;
  const waxing = age < SYNODIC_DAYS / 2;
  return { age, fraction, waxing, name: phaseName(age, fraction) };
}

function phaseName(age: number, fraction: number): string {
  if (fraction < 0.02) return 'new moon';
  if (fraction > 0.98) return 'full moon';
  const waxing = age < SYNODIC_DAYS / 2;
  if (Math.abs(fraction - 0.5) < 0.04) return waxing ? 'first quarter' : 'last quarter';
  if (fraction < 0.5) return waxing ? 'waxing crescent' : 'waning crescent';
  return waxing ? 'waxing gibbous' : 'waning gibbous';
}
