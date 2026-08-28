import { useRef } from 'react';

/**
 * One write in flight per control, and the finger answered first.
 *
 * The law this serves is in the working notes: *the screen answers the
 * finger, not the write.* On the web every write and the provider reload
 * behind it run down expo-sqlite's single synchronous channel, so a Save
 * that closes its form only when the write returns reads as a dead button —
 * and a perfectly reasonable second tap queues a second insert. One pillar
 * arrived five times that way.
 *
 * Usage: the synchronous acknowledgement goes first, inside the work,
 * before the first await —
 *
 *     const commit = useSingleFlight();
 *     onPress={() => void commit(async () => {
 *       setOpen(false);          // the same frame as the tap
 *       setDraft('');
 *       await write(db, draft);  // then the slow part
 *       await load();
 *     })}
 *
 * A ref rather than state, because state is exactly what is too slow here:
 * a re-render has not happened yet when the second tap lands.
 */
export function useSingleFlight(): (work: () => Promise<void>) => Promise<void> {
  const busy = useRef(false);
  return async (work) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await work();
    } finally {
      busy.current = false;
    }
  };
}
