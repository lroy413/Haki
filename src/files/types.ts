/**
 * The file-transfer surface, implemented twice: `transfer.ts` for native and
 * `transfer.web.ts` for the browser. Metro picks the right one per platform.
 *
 * Both files declare `satisfies Transfer`, so a signature that drifts on one
 * platform fails the typecheck rather than failing on someone's phone.
 */

export type SaveOutcome =
  | { ok: true; how: 'shared' | 'downloaded' | 'saved'; detail?: string }
  | { ok: false; error: string };

export type PickOutcome =
  | { ok: true; text: string; name: string }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string };

export type Transfer = {
  saveText(filename: string, content: string, mimeType: string): Promise<SaveOutcome>;
  pickText(): Promise<PickOutcome>;
  /** Clipboard as a last-resort escape hatch. False when the platform has none. */
  copyText(content: string): Promise<boolean>;
  /** Whether to offer the copy button at all. */
  canCopy: boolean;
};
