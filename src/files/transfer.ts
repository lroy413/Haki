/**
 * Native file transfer. The web build uses `transfer.web.ts` instead.
 *
 * Writes into the cache directory and hands the file straight to the system
 * share sheet, which is how you get a file out of an iOS app at all — there is
 * no user-visible "Downloads" folder to write to.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { PickOutcome, SaveOutcome, Transfer } from './types';

async function saveText(
  filename: string,
  content: string,
  mimeType: string,
): Promise<SaveOutcome> {
  try {
    const file = new File(Paths.cache, filename);
    // Overwrite rather than append; a stale half-file is worse than no file.
    if (file.exists) file.delete();
    file.create();
    file.write(content);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType,
        dialogTitle: 'Save your Haki backup',
        UTI: mimeType === 'application/json' ? 'public.json' : 'public.plain-text',
      });
      return { ok: true, how: 'shared' };
    }

    // No share sheet: the file still exists, so say where rather than pretend
    // it failed.
    return { ok: true, how: 'saved', detail: file.uri };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not write the file.' };
  }
}

async function pickText(): Promise<PickOutcome> {
  try {
    const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
    if (picked.canceled) return { ok: false, canceled: true };

    const file = picked.result;
    const text = await file.text();
    return { ok: true, text, name: file.name ?? 'backup.json' };
  } catch (e) {
    return {
      ok: false,
      canceled: false,
      error: e instanceof Error ? e.message : 'Could not read that file.',
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function copyText(_content: string): Promise<boolean> {
  // Native gets the share sheet, which is strictly better than a clipboard
  // dump. No clipboard dependency is pulled in just for a fallback path.
  // The parameter is kept so this matches `Transfer` at the call site.
  return false;
}

export const transfer = { saveText, pickText, copyText, canCopy: false } satisfies Transfer;
