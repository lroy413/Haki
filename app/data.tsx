import { BackupCard } from '../src/components/BackupCard';
import { SettingsPage } from '../src/components/SettingsPage';
import { ShellSection } from '../src/components/ShellReport';

/**
 * Your data — the harbour. Export and import live here and nowhere else,
 * because this is the only place anything ever leaves the device or arrives
 * on it. The card itself (`BackupCard`) is unchanged from when it sat on the
 * settings scroll; the page header now names it.
 *
 * The shell readout sits under it because it is the same kind of thing: a
 * fact about this install rather than about the voyage. It is here at all
 * because the app not reaching the bottom of the phone has come back five
 * times, every round was diagnosed by inference from a screenshot, and the
 * only thing that knows what the viewport is doing is the phone.
 */
export default function DataScreen() {
  return (
    <SettingsPage kind="data">
      <BackupCard />
      <ShellSection />
    </SettingsPage>
  );
}
