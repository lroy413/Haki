import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStore } from '../src/db/client';
import { readPose, rewordBearing, takeBearing } from '../src/db/repo';
import { carriedLine, poseLine, type EternalPose } from '../src/domain/eternal';
import { todayKey } from '../src/domain/date';
import { SectionLabel } from '../src/components/SectionLabel';
import { Rise } from '../src/components/Rise';
import { useHaki } from '../src/state/HakiProvider';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { font, radius, space, type } from '../src/theme/tokens';
import { lit, press, row } from '../src/theme/surfaces';
import { underCrew } from '../src/theme/palettes';
import type { Palette } from '../src/theme/palettes';

/**
 * The Eternal Pose — one bearing, and it does not recalibrate.
 *
 * See `domain/eternal.ts` for what this is and why it is not the Dream. The
 * screen's whole job is to make it feel like an instrument rather than a
 * field: the bearing is set in a plate under its own light, and the things
 * you used to steer by are kept below it as a record with no verdict in it.
 *
 * There is deliberately nothing here to tick. No "kept today", no calendar,
 * no count of days you managed it — the only number on the screen counts
 * days since it was taken, and nothing anybody does can make that smaller.
 * A non-negotiable with a breakable streak attached would be the cruellest
 * screen in the app.
 */
export default function EternalScreen() {
  const { db } = useStore();
  const { t, palette, plainMode, hardening, crew } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);

  const [pose, setPose] = useState<EternalPose>({ held: null, carried: [] });
  const [mode, setMode] = useState<'idle' | 'taking' | 'rewording'>('idle');
  const [draft, setDraft] = useState('');
  const [why, setWhy] = useState('');

  const load = useCallback(async () => {
    setPose(await readPose(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const held = pose.held;
  // Replacing a bearing you hold costs a written line; the first one is
  // free, because a blank Eternal Pose helps nobody.
  const ready = draft.trim().length > 0 && (!held || why.trim().length > 0);

  const committing = useSingleFlight();
  async function commitTake() {
    if (!ready) return;
    const text = draft;
    const reason = why;
    await committing(async () => {
      setDraft('');
      setWhy('');
      setMode('idle');
      await takeBearing(db, text, reason);
      await load();
    });
  }

  async function commitReword() {
    const text = draft.trim();
    if (!text) return;
    await committing(async () => {
      setDraft('');
      setMode('idle');
      await rewordBearing(db, text);
      await load();
    });
  }

  function begin(next: 'taking' | 'rewording') {
    setDraft(next === 'rewording' ? (held?.text ?? '') : '');
    setWhy('');
    setMode(next);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Rise>
          <Text style={styles.blurb}>{t.eternalBlurb}</Text>
        </Rise>

        <Rise delay={60}>
          <View style={[styles.plate, lit(lens.violet, plainMode ? 0 : hardening)]}>
            {plainMode ? null : <Text style={styles.watermark}>不変</Text>}

            {held ? (
              <>
                <Text style={styles.bearing}>{held.text}</Text>
                <Text style={styles.meta}>{poseLine(pose, todayKey(), plainMode)}</Text>
              </>
            ) : (
              <Text style={styles.offer}>{poseLine(pose, todayKey(), plainMode)}</Text>
            )}

            {mode === 'idle' ? (
              <View style={styles.row}>
                {held ? (
                  <>
                    {/* Rewording is not replacing: the days it has been held
                        are the same days, because the commitment did not
                        change — only the sentence did. */}
                    <Pressable
                      onPress={() => begin('rewording')}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                    >
                      <Text style={styles.ghostText}>Reword</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => begin('taking')}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                    >
                      <Text style={styles.ghostText}>{t.eternalTakeNew}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => begin('taking')}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.filled, pressed && styles.pressed]}
                  >
                    <Text style={styles.filledText}>{t.eternalSetCta}</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.fieldLabel}>{t.eternalField}</Text>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  autoFocus={Platform.OS !== 'web'}
                  style={[styles.input, styles.inputTall]}
                  placeholder={t.eternalPlaceholder}
                  placeholderTextColor={palette.inkFaint}
                  accessibilityLabel={t.eternalField}
                />

                {mode === 'taking' && held ? (
                  <>
                    <Text style={styles.fieldLabel}>{t.eternalLetGoField}</Text>
                    <TextInput
                      value={why}
                      onChangeText={setWhy}
                      multiline
                      style={[styles.input, styles.inputTall]}
                      placeholder="It stopped being the one."
                      placeholderTextColor={palette.inkFaint}
                      accessibilityLabel={t.eternalLetGoField}
                    />
                  </>
                ) : null}

                <View style={styles.row}>
                  <Pressable
                    onPress={() => setMode('idle')}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                  >
                    <Text style={styles.ghostText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void (mode === 'rewording' ? commitReword() : commitTake())}
                    disabled={mode === 'rewording' ? !draft.trim() : !ready}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.filled,
                      (mode === 'rewording' ? !draft.trim() : !ready) && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.filledText}>
                      {mode === 'rewording' ? 'Save' : t.eternalSetCta}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </Rise>

        {pose.carried.length > 0 ? (
          <Rise delay={120} style={styles.section}>
            <SectionLabel label={t.eternalCarriedLabel} />
            {pose.carried.map((bearing) => (
              <View key={bearing.id} style={styles.past}>
                <Text style={styles.pastText}>{bearing.text}</Text>
                <Text style={styles.pastMeta}>{carriedLine(bearing)}</Text>
                {bearing.reason ? (
                  <Text style={styles.pastReason}>{bearing.reason}</Text>
                ) : null}
              </View>
            ))}
          </Rise>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl },

    blurb: { ...type.small, color: c.inkDim, lineHeight: 21 },

    plate: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.lg,
      padding: space.lg,
      gap: space.sm,
      overflow: 'hidden',
    },
    watermark: {
      position: 'absolute',
      right: -6,
      top: -10,
      fontFamily: font.display,
      fontSize: 74,
      color: c.violetSoft,
      opacity: 0.55,
    },
    bearing: { fontFamily: font.body, fontSize: 22, lineHeight: 31, color: c.ink },
    offer: { ...type.body, fontSize: 16, color: c.inkDim, lineHeight: 23 },
    meta: { ...type.mono, fontSize: 12, color: c.inkFaint },

    form: { gap: space.sm, marginTop: space.xs },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 11 },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    inputTall: { minHeight: 76, textAlignVertical: 'top' },

    row: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
    filled: {
      flex: 1,
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filledText: { ...type.heading, fontSize: 15, color: c.onAccent },
    ghost: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: { ...type.heading, fontSize: 15, color: c.inkDim },
    disabled: { opacity: 0.4 },

    section: { gap: space.sm },
    past: { ...row(c), padding: space.md, gap: space.xs },
    pastText: { ...type.body, fontSize: 16, color: c.inkDim, lineHeight: 22 },
    pastMeta: { ...type.mono, fontSize: 12, color: c.inkFaint },
    pastReason: { ...type.small, fontSize: 13, color: c.inkFaint, lineHeight: 18 },
    pressed: { ...press },
  });
