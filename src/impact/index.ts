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

const listeners = new Set<Listener>();

export function fireImpact(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Decoration. It never surfaces an error.
    }
  }
}

export function onImpact(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
