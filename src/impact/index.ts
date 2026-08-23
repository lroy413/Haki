/**
 * The impact channel.
 *
 * Anything can call `fireImpact()`; whatever layer is mounted at the root
 * hears about it. A module-level emitter rather than context on purpose — it
 * mirrors the sound layer exactly, because an impact frame is the same kind of
 * thing as a sound effect: decoration that fires and is gone, never state.
 *
 * Fire-and-forget, never throws, and firing with no listener mounted is a
 * no-op rather than an error. A frame that cannot render must never stop a
 * task being marked done.
 */

type Listener = () => void;

function channel() {
  const listeners = new Set<Listener>();
  return {
    fire(): void {
      for (const listener of listeners) {
        try {
          listener();
        } catch {
          // Decoration. It never surfaces an error.
        }
      }
    },
    on(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** 武装色 — the strike. Fires on every struck task, many times a day. */
const impact = channel();

/**
 * 覇王色 — the burst. A separate channel because it is a separate event, not a
 * louder one.
 *
 * The strike frame is a hundred milliseconds and fires whenever a box gets
 * ticked. This fires when an island is reached, which is weeks of work
 * closing — a handful of times a year if the Log Pose is being used honestly.
 * Rarity is the entire value: at four times a year it is electric, and if it
 * ever starts firing weekly the thing to fix is what is calling it.
 */
const conquerors = channel();

export const fireImpact = impact.fire;
export const onImpact = impact.on;
export const fireConquerors = conquerors.fire;
export const onConquerors = conquerors.on;
