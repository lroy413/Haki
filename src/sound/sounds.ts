/**
 * The sound library.
 *
 * Adding one is a single line here plus a file in `assets/sounds/`. Cut new
 * effects with `tools/make_sound.py` — raw sound-effect exports are mastered
 * for video and run several seconds, which is how an app gets muted for good.
 *
 * Keep them short. Anything that fires on a tap should be under a second.
 */

export type SoundName =
  | 'armamentStrike'
  | 'observationRead'
  | 'returnDrums'
  | 'gearSecond'
  | 'gearThird'
  | 'gearFourth'
  | 'dendenRing';

/**
 * `require` is deliberate: Metro resolves these at build time so the asset is
 * bundled and available offline, which a runtime URL would not be.
 */
export const SOUNDS: Record<SoundName, number> = {
  // 武装色 — hardening, and the moment of impact. Plays when a task is struck.
  armamentStrike: require('../../assets/sounds/armament-strike.wav'),
  // 見聞色 — sensing rather than striking. Plays when the Daily Read is saved.
  observationRead: require('../../assets/sounds/observation-read.wav'),
  // 帰 — the Return, and the only music here. Six seconds, and rare by
  // construction: it needs a real gap to have been closed. mp3 rather than
  // wav because the same cue as PCM would be a third of a megabyte.
  returnDrums: require('../../assets/sounds/return-drums.mp3'),

  // The gears announce themselves on the way in. mp3 rather than wav because
  // these are spoken cues at the start of a long block, not tap feedback —
  // a few milliseconds of encoder padding costs nothing and the PCM would be
  // four times the size.
  gearSecond: require('../../assets/sounds/gear-second.mp3'),
  gearThird: require('../../assets/sounds/gear-third.mp3'),
  gearFourth: require('../../assets/sounds/gear-fourth.mp3'),

  // 電伝虫 — one ring cycle, and the bell that closes a sit. A Den Den Mushi
  // is a snail somebody is calling you on, which is as good a reason to open
  // your eyes as any bowl-gong sample would have been.
  dendenRing: require('../../assets/sounds/denden.wav'),
};
