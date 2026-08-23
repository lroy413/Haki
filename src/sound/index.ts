import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { SOUNDS, type SoundName } from './sounds';

/**
 * Playing the app's sounds.
 *
 * Three rules, all of them about not being annoying:
 *
 * 1. **Never block on audio.** Every call is fire-and-forget and every failure
 *    is swallowed. A sound that will not load must never stop a task from
 *    being marked done.
 * 2. **Never interrupt what is already playing.** On iOS the default audio
 *    session ducks or stops other apps' audio; this one explicitly mixes, so
 *    striking a task does not pause your music.
 * 3. **Silence is a first-class state.** Plain mode and the sound setting both
 *    turn it off completely, and off means no player is even created.
 *
 * Players are made once and reused. Recreating one per tap leaks on native and
 * adds latency you can hear.
 */

let enabled = false;
let configured = false;
const players = new Map<SoundName, AudioPlayer>();

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  if (!next) unload();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

async function configure(): Promise<void> {
  if (configured) return;
  configured = true;
  try {
    await setAudioModeAsync({
      // Mix rather than take over: this app has no business pausing a podcast.
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    // An audio session we cannot configure is one we simply do not use.
  }
}

function playerFor(name: SoundName): AudioPlayer | null {
  const existing = players.get(name);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOUNDS[name]);
    players.set(name, player);
    return player;
  } catch {
    return null;
  }
}

/**
 * Play a sound, if sound is on.
 *
 * Seeks to zero first so a rapid second tap retriggers from the attack instead
 * of being swallowed by the tail of the first.
 */
export function play(name: SoundName): void {
  if (!enabled) return;

  void (async () => {
    try {
      await configure();
      const player = playerFor(name);
      if (!player) return;
      await player.seekTo(0);
      player.play();
    } catch {
      // Sound is decoration. It never surfaces an error.
    }
  })();
}

/**
 * Warm the players so the first tap is not the one that stutters.
 * Safe to call more than once.
 */
export function preloadSounds(): void {
  if (!enabled) return;
  void (async () => {
    try {
      await configure();
      for (const name of Object.keys(SOUNDS) as SoundName[]) playerFor(name);
    } catch {
      /* nothing to do */
    }
  })();
}

export function unload(): void {
  for (const player of players.values()) {
    try {
      player.remove();
    } catch {
      /* already gone */
    }
  }
  players.clear();
}

export type { SoundName };
