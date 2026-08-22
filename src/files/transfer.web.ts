/**
 * Web file transfer.
 *
 * Ordering matters here, and it is not the obvious one. An `<a download>` click
 * is the standard trick, but inside an iOS standalone PWA — exactly how Haki is
 * meant to be used — it is unreliable and can silently do nothing. The Web
 * Share API does work there and hands the file to Files, AirDrop, or Mail.
 *
 * So: share first, download second, clipboard third. Getting three weeks of
 * journal entries out of the app is not a place to have a single point of
 * failure.
 */

import type { PickOutcome, SaveOutcome, Transfer } from './types';

async function saveText(
  filename: string,
  content: string,
  mimeType: string,
): Promise<SaveOutcome> {
  const file = new File([content], filename, { type: mimeType });

  // 1. Share sheet — the only reliable route in an installed iOS PWA.
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: filename });
      return { ok: true, how: 'shared' };
    }
  } catch (e) {
    // A cancelled share throws AbortError. That is a choice, not a failure —
    // report it as such instead of falling through to a surprise download.
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, error: 'Cancelled.' };
    }
    // Anything else: fall through and try the download.
  }

  // 2. Ordinary download.
  try {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { ok: true, how: 'downloaded' };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not save the file.',
    };
  }
}

function pickText(): Promise<PickOutcome> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';

    let settled = false;
    const finish = (outcome: PickOutcome) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(outcome);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return finish({ ok: false, canceled: true });
      file
        .text()
        .then((text) => finish({ ok: true, text, name: file.name }))
        .catch(() =>
          finish({ ok: false, canceled: false, error: 'Could not read that file.' }),
        );
    };

    // Not every browser fires `cancel`; when it does, this resolves the promise
    // so the UI never hangs on a spinner after the user backs out.
    input.oncancel = () => finish({ ok: false, canceled: true });

    document.body.appendChild(input);
    input.click();
  });
}

async function copyText(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}

export const transfer = { saveText, pickText, copyText, canCopy: true } satisfies Transfer;
