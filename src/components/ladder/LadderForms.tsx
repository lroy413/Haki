import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useHaki } from '../../state/HakiProvider';
import {
  KINDS,
  MAX_TITLE,
  MAX_TRACK_NAME,
  TARGET_CHOICES,
  UNITS,
  type ItemKind,
  type Unit,
} from '../../domain/ladder';
import { formatMinutes } from '../../domain/tasks';
import { press } from '../../theme/surfaces';
import { radius, space, type } from '../../theme/tokens';
import type { Palette } from '../../theme/palettes';

/**
 * The two forms the ladder needs: a track (a thing being mastered) and an
 * item under it (a practice with a weekly target, or a goal).
 *
 * Both are small on purpose. A track is a name. An item is a name, which of
 * two kinds it is, and — for a practice — what a week of it looks like, in
 * times or in minutes, chosen from a row rather than typed. The owner asked
 * for "very customizable", and the customisation is in what you name and how
 * much you ask of it, not in a settings page per item.
 *
 * Every Save closes in the same frame as the tap; the caller holds the
 * single-flight guard. `tint` is the screen's light and has no default.
 */

export type ItemDraftState = {
  title: string;
  kind: ItemKind;
  unit: Unit;
  target: number;
};

export const EMPTY_ITEM: ItemDraftState = {
  title: '',
  kind: 'practice',
  unit: 'times',
  target: 3,
};

export function isItemReady(d: ItemDraftState): boolean {
  return d.title.trim().length > 0 && d.target >= 1;
}

export function ItemForm({
  draft,
  onChange,
  onSave,
  onCancel,
  onRetire,
  tint,
}: {
  draft: ItemDraftState;
  onChange: (next: ItemDraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  /** Present when editing an existing item. */
  onRetire?: () => void;
  tint: string;
}) {
  const { palette, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const ready = isItemReady(draft);

  return (
    <View style={styles.card}>
      <Text style={styles.fieldLabel}>{t.ladderItemName}</Text>
      <TextInput
        value={draft.title}
        onChangeText={(title) => onChange({ ...draft, title: title.slice(0, MAX_TITLE) })}
        autoFocus={Platform.OS !== 'web'}
        style={styles.input}
        placeholder="Practice scales"
        placeholderTextColor={palette.inkFaint}
        accessibilityLabel={t.ladderItemName}
      />

      <View style={styles.kinds}>
        {KINDS.map((kind) => {
          const on = draft.kind === kind;
          return (
            <Pressable
              key={kind}
              onPress={() => onChange({ ...draft, kind })}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.kind,
                on && { borderColor: tint, backgroundColor: palette.surface },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.kindText, on && { color: tint }]}>
                {kind === 'goal' ? t.ladderGoal : t.ladderPractice}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {draft.kind === 'practice' ? (
        <>
          <View style={styles.kinds}>
            {UNITS.map((unit) => {
              const on = draft.unit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() =>
                    onChange({
                      ...draft,
                      unit,
                      // A target chosen in one unit means nothing in the other.
                      target: TARGET_CHOICES[unit].includes(draft.target)
                        ? draft.target
                        : TARGET_CHOICES[unit][unit === 'times' ? 2 : 1],
                    })
                  }
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [
                    styles.kind,
                    on && { borderColor: tint, backgroundColor: palette.surface },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.kindText, on && { color: tint }]}>
                    {unit === 'times' ? t.ladderTimes : t.ladderMinutes}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.chips}>
            {TARGET_CHOICES[draft.unit].map((n) => {
              const on = draft.target === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => onChange({ ...draft, target: n })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={
                    draft.unit === 'times' ? `${n} times a week` : `${n} minutes a week`
                  }
                  style={({ pressed }) => [
                    styles.chip,
                    on && { borderColor: tint, backgroundColor: palette.surface },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, on && { color: tint }]}>
                    {draft.unit === 'times' ? String(n) : formatMinutes(n)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <Text style={styles.hint}>Met once, and it leaves the list when its week is over.</Text>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
        >
          <Text style={styles.ghostText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={!ready}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.filled,
            { backgroundColor: tint },
            !ready && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.filledText, { color: palette.onAccent }]}>Save</Text>
        </Pressable>
      </View>

      {onRetire ? (
        <Pressable
          onPress={onRetire}
          accessibilityRole="button"
          style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
        >
          <Text style={styles.quietText}>{t.ladderRetire}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TrackForm({
  name,
  onChange,
  onSave,
  onCancel,
  onRetire,
  tint,
}: {
  name: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  /** Present when editing an existing track. */
  onRetire?: () => void;
  tint: string;
}) {
  const { palette, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const ready = name.trim().length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.fieldLabel}>{t.ladderTrackName}</Text>
      <TextInput
        value={name}
        onChangeText={(next) => onChange(next.slice(0, MAX_TRACK_NAME))}
        autoFocus={Platform.OS !== 'web'}
        style={styles.input}
        placeholder="Main career"
        placeholderTextColor={palette.inkFaint}
        accessibilityLabel={t.ladderTrackName}
      />
      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
        >
          <Text style={styles.ghostText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={!ready}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.filled,
            { backgroundColor: tint },
            !ready && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.filledText, { color: palette.onAccent }]}>Save</Text>
        </Pressable>
      </View>
      {onRetire ? (
        <Pressable
          onPress={onRetire}
          accessibilityRole="button"
          style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
        >
          <Text style={styles.quietText}>{t.ladderTrackRetire}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.sm,
    },
    fieldLabel: { ...type.label, color: c.inkFaint },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      height: 44,
    },
    kinds: { flexDirection: 'row', gap: space.sm },
    kind: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.bg,
      paddingHorizontal: space.sm,
    },
    kindText: { ...type.mono, fontSize: 13, color: c.inkDim },
    chips: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' },
    chip: {
      minWidth: 44,
      minHeight: 44,
      paddingHorizontal: space.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.bg,
    },
    chipText: { ...type.mono, fontSize: 13, color: c.inkDim },
    hint: { ...type.small, color: c.inkFaint, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
    ghost: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
    },
    ghostText: { ...type.heading, fontSize: 16, color: c.inkDim },
    filled: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    filledText: { ...type.heading, fontSize: 16 },
    disabled: { opacity: 0.45 },
    quiet: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    quietText: { ...type.mono, fontSize: 13, color: c.inkDim },
    pressed: { ...press },
  });
