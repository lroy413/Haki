import { BackupCard } from '../src/components/BackupCard';
import { SettingsPage } from '../src/components/SettingsPage';

/**
 * Your data — the harbour. Export and import live here and nowhere else,
 * because this is the only place anything ever leaves the device or arrives
 * on it. The card itself (`BackupCard`) is unchanged from when it sat on the
 * settings scroll; the page header now names it.
 */
export default function DataScreen() {
  return (
    <SettingsPage kind="data">
      <BackupCard />
    </SettingsPage>
  );
}
