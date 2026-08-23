import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../db/client';
import { exportBackup, importBackup } from '../db/backup';
import { countRows, entriesToMarkdown, parseBackup, serializeBackup } from '../domain/backup';
import { todayKey } from '../domain/date';
import { transfer } from '../files/transfer';
import { useHaki } from '../state/HakiProvider';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * Export and import.
 *
 * This is the bridge between the PWA and the native app — two separate
 * databases that share no storage. Three weeks of data crosses over here or
 * not at all.
 */
export function BackupCard() {
  const { db } = useStore();
  const { refresh, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function withBusy(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const exportJson = () =>
    withBusy(async () => {
      const backup = await exportBackup(db, Date.now());
      const rows = countRows(backup.data);
      const result = await transfer.saveText(
        `haki-${todayKey()}.json`,
        serializeBackup(backup),
        'application/json',
      );
      setStatus(
        result.ok
          ? `${rows} ${rows === 1 ? 'row' : 'rows'} exported.`
          : `Export failed: ${result.error}`,
      );
    });

  const exportMarkdown = () =>
    withBusy(async () => {
      const backup = await exportBackup(db, Date.now());
      const entries = backup.data.entry;
      if (entries.length === 0) {
        setStatus('No journal entries to export yet.');
        return;
      }
      const result = await transfer.saveText(
        `haki-log-${todayKey()}.md`,
        entriesToMarkdown(entries, backup.exportedAt),
        'text/markdown',
      );
      setStatus(
        result.ok
          ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} exported.`
          : `Export failed: ${result.error}`,
      );
    });

  const copyJson = () =>
    withBusy(async () => {
      const backup = await exportBackup(db, Date.now());
      const copied = await transfer.copyText(serializeBackup(backup));
      setStatus(copied ? 'Copied to the clipboard.' : 'The clipboard is not available here.');
    });

  const runImport = () =>
    withBusy(async () => {
      const picked = await transfer.pickText();
      if (!picked.ok) {
        setStatus(picked.canceled ? null : picked.error);
        return;
      }

      const parsed = parseBackup(picked.text);
      if (!parsed.ok) {
        setStatus(parsed.error);
        return;
      }

      const report = await importBackup(db, parsed.backup.data);
      await refresh();

      const parts = [
        `${report.totalInserted} added`,
        report.totalSkipped > 0 ? `${report.totalSkipped} already here` : null,
      ].filter(Boolean);

      const dropped = Object.values(parsed.rejected).reduce((a, b) => a + b, 0);
      if (dropped > 0) parts.push(`${dropped} unreadable and skipped`);

      setStatus(parts.join(', ') + '.');
    });

  function confirmImport() {
    const message =
      'Importing adds anything missing and leaves what you already have alone. Nothing is deleted, and importing the same file twice is safe.';

    if (Platform.OS === 'web') {
      void runImport();
      return;
    }

    Alert.alert('Import a backup?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose file', onPress: () => void runImport() },
    ]);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your data</Text>
      <Text style={styles.blurb}>
        Everything lives on this device and nothing is uploaded anywhere — so this is the only
        way it moves. Export before you switch phones or move to the native app.
      </Text>

      <View style={styles.row}>
        <Action
          label="Export data"
          hint=".json · re-importable"
          onPress={exportJson}
          busy={busy}
          primary
        />
        <Action
          label="Export journal"
          hint=".md · readable"
          onPress={exportMarkdown}
          busy={busy}
        />
      </View>

      <View style={styles.row}>
        <Action
          label="Import"
          hint="merges, never deletes"
          onPress={confirmImport}
          busy={busy}
        />
        {transfer.canCopy ? (
          <Action label="Copy" hint="if saving fails" onPress={copyJson} busy={busy} />
        ) : null}
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

function Action({
  label,
  hint,
  onPress,
  busy,
  primary,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        busy && styles.actionBusy,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>
      <Text style={[styles.actionHint, primary && styles.actionHintPrimary]}>{hint}</Text>
    </Pressable>
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
      gap: space.md,
    },
    title: { ...type.title, color: c.ink },
    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },

    row: { flexDirection: 'row', gap: space.sm },
    action: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface2,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      paddingHorizontal: space.sm,
      alignItems: 'center',
      gap: 2,
    },
    actionPrimary: { backgroundColor: c.violet, borderColor: c.violet },
    actionBusy: { opacity: 0.5 },
    actionLabel: { ...type.body, color: c.ink },
    actionLabelPrimary: { color: c.onAccent },
    actionHint: { ...type.small, fontSize: 11, color: c.inkFaint },
    actionHintPrimary: { color: c.onAccent, opacity: 0.7 },

    status: { ...type.small, color: c.cyan, lineHeight: 19 },
    pressed: { opacity: 0.75 },
  });
