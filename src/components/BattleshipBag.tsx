import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { TrainingSessionRow } from '../db/schema';
import { useHaki } from '../state/HakiProvider';
import { Battleship } from './instruments/Battleship';
import { SectionLabel } from './SectionLabel';
import { MAX_HITS, hitsThisWeek, returnMessage, startOfWeek } from '../domain/training';
import { shortDay, todayKey } from '../domain/date';
import { radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The Battleship Bag — the gym, as the hull Garp punches.
 *
 * The owner's picture, from the manga: warships he punched until their
 * armoured hulls caved in, with no Haki and no Devil Fruit — a strength you
 * have to earn. So the workout tracker is one hull a week. Every day trained
 * lands a hit on it, seven at most, and on Monday there is a fresh ship.
 *
 * What it is and is not:
 *
 * - **A record, not a score.** The drawing is the week; the rows under it are
 *   what each hit was. There is no percentage, no "4/7", and the weekly
 *   target stays what it always was — a line to read against, never a
 *   verdict. The number of hits is visible *as damage*, which you can see
 *   roughly and cannot read exactly, and that is the point.
 * - **The good news is the damage.** A whole hull on a Thursday is a warship
 *   at anchor, waiting, not an empty bar. Nothing here goes red.
 * - **Every row opens.** The owner logs from memory as often as from the gym
 *   floor, so a session can be corrected — kind, minutes, how hard, and the
 *   day it was — rather than removed and re-entered.
 *
 * `tint` is the Armament light under the crew: crimson for Luffy, amethyst
 * for Zoro. It catches only on the fresh metal of a dent.
 */
export function BattleshipBag({
  sessions,
  tint,
}: {
  /** Recent sessions, newest first. */
  sessions: TrainingSessionRow[];
  tint: string;
}) {
  const { palette, plainMode, training, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const today = todayKey();
  const monday = startOfWeek(today);
  const hits = hitsThisWeek(sessions, today);
  const thisWeek = sessions.filter((s) => s.day >= monday && s.day <= today);
  const astern = sessions.filter((s) => s.day < monday).slice(0, 5);

  return (
    <View style={styles.wrap}>
      <Text style={styles.blurb}>{t.bagBlurb}</Text>

      {/* The hull. Plain mode keeps the picture — it is the app's own record
          of the week rather than an effect — and loses the lens glint. */}
      <View style={styles.dock}>
        <Battleship
          hits={hits}
          ink={palette.ink}
          faint={palette.inkFaint}
          tint={plainMode ? palette.inkFaint : tint}
          ground={palette.surface}
          deck={palette.surface2}
        />
      </View>

      <View style={styles.line}>
        <Text style={styles.week}>
          {training.sessionsThisWeek === 0
            ? t.trainingPlanned(training.weeklyTarget)
            : `${training.sessionsThisWeek}/${training.weeklyTarget} this week`}
        </Text>
        <Text style={styles.fresh}>{hits >= MAX_HITS ? t.bagFull : t.bagFresh}</Text>
      </View>

      <Pressable
        onPress={() => router.push('/session')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.log, { borderColor: tint }, pressed && styles.pressed]}
      >
        <Text style={[styles.logText, { color: tint }]}>{t.trainingLog}</Text>
        <Text style={[styles.logGo, { color: tint }]}>+</Text>
      </Pressable>

      <SectionLabel label={t.trainingThisWeek} style={styles.section} />
      {thisWeek.length === 0 ? (
        <Text style={styles.empty}>
          {plainMode ? 'Nothing this week yet.' : 'The hull is whole.'}
        </Text>
      ) : (
        thisWeek.map((s) => (
          <Row key={s.id} session={s} styles={styles} violet={palette.violet} />
        ))
      )}

      {astern.length > 0 ? (
        <>
          <SectionLabel label={plainMode ? 'Earlier' : 'Astern'} style={styles.section} />
          {astern.map((s) => (
            <Row key={s.id} session={s} styles={styles} violet={palette.violet} />
          ))}
        </>
      ) : null}
    </View>
  );
}

function Row({
  session,
  styles,
  violet,
}: {
  session: TrainingSessionRow;
  styles: ReturnType<typeof makeStyles>;
  violet: string;
}) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session', params: { id: String(session.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${session.kind} on ${shortDay(session.day)}. Open to change it.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowKind} numberOfLines={1}>
          {session.kind}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[
            shortDay(session.day),
            session.minutes ? `${session.minutes} min` : null,
            session.intensity ? `${session.intensity}/5` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {/* The Return keeps the signature violet under both crews: it is not
            a lens's light. */}
        {session.closedGap > 0 ? (
          <Text style={[styles.rowReturn, { color: violet }]}>
            {returnMessage(session.closedGap)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.rowGo}>›</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: space.sm },
    blurb: { ...type.body, color: c.inkDim, lineHeight: 22 },
    dock: {
      height: 150,
      marginTop: space.xs,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      overflow: 'hidden',
      paddingHorizontal: space.sm,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: space.md,
      paddingVertical: space.xs,
    },
    week: { ...type.body, color: c.ink },
    fresh: { ...type.mono, fontSize: 12, color: c.inkFaint },
    log: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      minHeight: 48,
    },
    logText: { ...type.heading, fontSize: 18 },
    logGo: { ...type.heading, fontSize: 18 },
    section: { marginTop: space.md },
    empty: { ...type.small, color: c.inkFaint },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingLeft: space.md,
      paddingRight: space.md,
      paddingVertical: space.sm,
      minHeight: 48,
    },
    rowBody: { flex: 1, gap: 1 },
    rowKind: { ...type.heading, color: c.ink },
    rowMeta: { ...type.small, fontSize: 14, color: c.inkDim },
    rowReturn: { ...type.small, fontSize: 14 },
    rowGo: { ...type.heading, fontSize: 18, color: c.inkFaint },
    pressed: { ...press },
  });
