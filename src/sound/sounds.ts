/**
 * The sound library.
 *
 * Adding one is a single line here plus a file in `assets/sounds/`. Cut new
 * effects with `tools/make_sound.py` — raw sound-effect exports are mastered
 * for video and run several seconds, which is how an app gets muted for good.
 *
 * Keep them short. Anything that fires on a tap should be under a second.
 */

export type SoundName = 'armamentStrike' | 'observationRead';

/**
 * `require` is deliberate: Metro resolves these at build time so the asset is
 * bundled and available offline, which a runtime URL would not be.
 */
export const SOUNDS: Record<SoundName, number> = {
  // 武装色 — hardening, and the moment of impact. Plays when a task is struck.
  armamentStrike: require('../../assets/sounds/armament-strike.wav'),
  // 見聞色 — sensing rather than striking. Plays when the Daily Read is saved.
  observationRead: require('../../assets/sounds/observation-read.wav'),
};
