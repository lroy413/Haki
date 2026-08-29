import { BackupCard } from '../src/components/BackupCard';
import { SettingsPage } from '../src/components/SettingsPage';
import { HoldSection } from '../src/components/HoldReport';
import { ShellSection } from '../src/components/ShellReport';

/**
 * Your data — the harbour. Export and import live here and nowhere else,
 * because this is the only place anything ever leaves the device or arrives
 * on it. The card itself (`BackupCard`) is unchanged from when it sat on the
 * settings scroll; the page header now names it.
 *
 * The hold and the shell readouts sit under it because they are the same
 * kind of thing: facts about this install rather than about the voyage. The
 * hold answers the question the export exists for — whether the browser has
 * promised to keep the database at all, which for a long time it had never
 * been asked. It is here at all
 * because the app not reaching the bottom of the phone has come back five
 * times, every round was diagnosed by inference from a screenshot, and the
 * only thing that knows what the viewport is doing is the phone.
 */
export default function DataScreen() {
  return (
    <SettingsPage kind="data">
      <BackupCard />
      {/* Directly under the export, because when this says the browser has
          not promised to keep the data, the thing to do about it is the card
          above. */}
      <HoldSection />
      <ShellSection />
    </SettingsPage>
  );
}
