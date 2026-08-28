import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useHaki } from '../state/HakiProvider';
import { SectionLabel } from './SectionLabel';
import { row } from '../theme/surfaces';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * What this install actually measured.
 *
 * The app not reaching the bottom of the phone has now come back five times,
 * and every round was diagnosed by inference from a screenshot — three of
 * those inferences were wrong, and one of the fixes caused the next round.
 * The reason is simple and worth naming: **the only thing that knows what
 * the viewport is doing is the phone, and the phone had no way to say.**
 *
 * So it says. Two lines matter and the rest is evidence for them:
 *
 *   the **build**, because a PWA updates silently and "did the fix reach
 *   the phone" is otherwise unanswerable exactly when it matters most;
 *
 *   the **verdict** — whether the app is filling the screen, and by how
 *   much it is not.
 *
 * This is not a debug panel bolted on. A private app that has fought the
 * same layout bug five times has earned one honest readout, and it is
 * written to be read by someone who is annoyed rather than by someone
 * debugging: a sentence first, then the numbers.
 *
 * Native has no shell — the numbers come from `tools/pwa-head.mjs`, which
 * only exists on the web — so there it says so rather than inventing them.
 */

type Shell = {
  build: string;
  standalone: boolean;
  screen: [number, number];
  inner: [number, number];
  visual: [number, number, number] | null;
  root: [number, number, number] | null;
  forced: string;
  safe: [number, number, number, number];
  scrollY: number;
  short: number;
  /** The box the app can actually paint into. */
  target: number;
  /** Screen below the viewport that nothing can reach. 0 when healthy. */
  unreachable: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __HAKI_SHELL__: (() => Shell) | undefined;
}

function read(): Shell | null {
  if (Platform.OS !== 'web') return null;
  try {
    return globalThis.__HAKI_SHELL__?.() ?? null;
  } catch {
    // A readout is never worth a crash on the one screen you opened to find
    // out what is wrong.
    return null;
  }
}

export function ShellReport() {
  const { palette, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [shell, setShell] = useState<Shell | null>(read);

  // Re-read on every visit rather than once: the numbers are the point, and
  // a stale set of them is worse than none.
  useFocusEffect(
    useCallback(() => {
      setShell(read());
    }, []),
  );

  if (!shell) {
    return (
      <View style={styles.card}>
        <Text style={styles.verdict}>{t.shellNative}</Text>
      </View>
    );
  }

  const filling = shell.short <= 1;
  // Two different things, and conflating them is what made round six push the
  // tab bar off the bottom of the phone: the app can fill the box it is given
  // and still be short of the screen, because iOS did not give it the screen.
  const band = shell.unreachable;
  const rows: [string, string][] = [
    ['Build', shell.build],
    ['Installed', shell.standalone ? 'yes' : 'no — running in a browser tab'],
    ['Screen', `${shell.screen[0]} × ${shell.screen[1]}`],
    ['Window', `${shell.inner[0]} × ${shell.inner[1]}`],
    ['Visible box', shell.visual ? `${shell.visual[0]} × ${shell.visual[1]}` : 'not reported'],
    ['App box', shell.root ? `${shell.root[2]} tall, ends at ${shell.root[1]}` : 'not found'],
    ['Should fill', String(shell.target)],
    ['Out of reach', band > 0 ? `${band} below the viewport` : 'none'],
    ['Height', shell.forced],
    ['Safe area', shell.safe.join(' / ')],
  ];

  return (
    <View style={styles.card}>
      <Text style={[styles.verdict, !filling && styles.wrong]}>
        {filling ? t.shellFilling : t.shellShort(shell.short)}
      </Text>
      {/* Said separately, and never as a shortfall: it is not one the app can
          close. iOS extends the page's own background colour into the band,
          which is why the ground still looks continuous down there. */}
      {filling && band > 0 ? <Text style={styles.band}>{t.shellBand(band)}</Text> : null}
      <Text style={styles.note}>{t.shellNote}</Text>
      <View style={styles.table}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.line}>
            <Text style={styles.key}>{k}</Text>
            <Text style={styles.value} numberOfLines={1}>
              {v}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => setShell(read())}
        accessibilityRole="button"
        style={({ pressed }) => [styles.again, pressed && styles.pressed]}
      >
        <Text style={styles.againText}>{t.shellAgain}</Text>
      </Pressable>
    </View>
  );
}

/** The whole section, label included, for the page to drop in one line. */
export function ShellSection() {
  const { t, plainMode } = useHaki();
  return (
    <>
      <SectionLabel label={t.shellTitle} trailing={plainMode ? undefined : '寸法'} />
      <ShellReport />
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { ...row(c), padding: space.lg, gap: space.md },
    // The sentence, at reading weight. Somebody opening this screen wants an
    // answer, not a table.
    verdict: { ...type.body, color: c.ink, lineHeight: 23 },
    // Not red. A screen that is 62 points short is a fact about a layout,
    // not a failure of the person reading it — the tone rule holds here too.
    wrong: { color: c.warn },
    band: { ...type.small, color: c.inkDim, lineHeight: 19 },
    note: { ...type.small, color: c.inkDim, lineHeight: 19 },
    table: { gap: space.xs },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
    key: { ...type.mono, fontSize: 12, color: c.inkFaint },
    value: { ...type.mono, fontSize: 12, color: c.inkDim, flexShrink: 1 },
    again: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    againText: { ...type.heading, fontSize: 15, color: c.inkDim },
    pressed: { opacity: 0.7 },
  });
