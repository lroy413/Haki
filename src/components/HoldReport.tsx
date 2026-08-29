import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useHaki } from '../state/HakiProvider';
import { SectionLabel } from './SectionLabel';
import { keep } from '../files/keep';
import {
  saidBytes,
  storageAdvice,
  storageLabel,
  storageLine,
  type StorageState,
} from '../domain/storage';
import { row } from '../theme/surfaces';
import { space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * Whether the browser is keeping the database.
 *
 * The app's whole promise is that everything lives on this device and the
 * export is the only way anything moves. That promise had a hole in it: on
 * the web, storage is best-effort unless it is asked to be persistent, and
 * the app had never asked. A browser under disk pressure could throw the
 * whole origin away — silently, with no error and no event — and the first
 * anyone would know is opening a fresh install one morning.
 *
 * `keep.anchor()` closes the hole. This says whether it worked, for the same
 * reason `ShellReport` exists directly below it: the only thing that knows is
 * the phone, and a guarantee you cannot verify is not one. Sentence first,
 * then the numbers.
 *
 * It sits under the export deliberately. When the answer is "not anchored",
 * the thing to do about it is the card directly above.
 */
export function HoldReport() {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [state, setState] = useState<StorageState | null>(null);

  // Re-read on every visit rather than once. Installing to the home screen is
  // what usually flips this, and the whole point of the readout is to be
  // right the first time somebody comes back to check.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void keep.state().then((s) => {
        if (alive) setState(s);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  if (!state) return null;

  const anchored = state.kind === 'native' || (state.kind === 'web' && state.persisted);
  const advice = storageAdvice(state);

  return (
    <View style={styles.card}>
      {/* Not red when it is not anchored. An origin the browser has not
          promised to keep is a fact about a browser, not a failure of the
          person reading it — the same rule the shell verdict holds. */}
      <Text style={[styles.verdict, !anchored && styles.warn]}>
        {storageLine(state, plainMode)}
      </Text>
      {advice ? <Text style={styles.note}>{advice}</Text> : null}
      {state.kind === 'web' ? (
        <View style={styles.table}>
          <View style={styles.line}>
            <Text style={styles.key}>Held</Text>
            <Text style={styles.value}>{saidBytes(state.usedBytes)}</Text>
          </View>
          {/* The quota is stated and never drawn as a fraction. It is a
              browser implementation detail that moves on its own, and this
              app's data against it would be a denominator nobody chose. */}
          <View style={styles.line}>
            <Text style={styles.key}>Room</Text>
            <Text style={styles.value}>{saidBytes(state.quotaBytes)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The whole section, label included, for the page to drop in one line. */
export function HoldSection() {
  const { plainMode } = useHaki();
  return (
    <>
      <SectionLabel label={storageLabel(plainMode)} trailing={plainMode ? undefined : '船倉'} />
      <HoldReport />
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { ...row(c), padding: space.lg, gap: space.md },
    verdict: { ...type.body, color: c.ink, lineHeight: 23 },
    warn: { color: c.warn },
    note: { ...type.small, color: c.inkDim, lineHeight: 19 },
    table: { gap: space.xs },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
    key: { ...type.mono, fontSize: 13, color: c.inkFaint },
    value: { ...type.mono, fontSize: 13, color: c.inkDim, flexShrink: 1 },
  });
