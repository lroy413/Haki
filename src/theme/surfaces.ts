import type { ViewStyle } from 'react-native';
import type { Palette } from './palettes';
import { radius } from './tokens';

/**
 * The three surfaces a block of this app can sit on.
 *
 * Before these existed every container was the same recipe — surface fill,
 * hairline border, specular top, six-point corners — and a screen of them
 * read as a template: the day's identity card, a list row and an untaken
 * offer all carried identical weight. The fix is not more chrome, it is
 * *unequal* chrome. Three surfaces, in descending weight:
 *
 * - `plate` — raised. The one or two blocks a screen is actually about: the
 *   hardness header, the reserve, the dream. It casts a shadow (`c.shadow`,
 *   tuned per palette) and keeps the specular glint along its top edge.
 * - `row` — flat. Working material: tasks, entries, sessions, settings. No
 *   shadow, no specular — a row is not an object, it is a line in a list.
 * - `offer` — dashed and unfilled. A thing that does not exist yet: a
 *   rhythm standing for today, an island not yet named. The dash is the
 *   point — an offer drawn like a row looks like a commitment, and the
 *   whole rhythm model exists to avoid manufacturing those.
 *
 * A screen should hold at most a couple of plates. If everything is raised,
 * nothing is — which is the exact bug this file replaces.
 *
 * Padding and gap stay at the call site: they vary legitimately, and a
 * factory that sets them makes every caller override it back.
 */

export function plate(c: Palette): ViewStyle {
  return {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
    borderTopColor: c.specular,
    borderRadius: radius.lg,
    shadowColor: c.shadow,
    // The alpha lives in the token, so opacity stays 1 — halving it here
    // would double-count and the paper shadow would all but vanish.
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  };
}

export function row(c: Palette): ViewStyle {
  return {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.lineSoft,
    borderRadius: radius.md,
  };
}

export function offer(c: Palette): ViewStyle {
  return {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.line,
    borderRadius: radius.md,
  };
}

/**
 * What a press looks like, anywhere.
 *
 * Bare opacity reads as "the row went grey", which is ambiguous with
 * disabled. A slight sink plus a smaller dim reads as the surface giving
 * under the finger. One object so every screen presses the same way.
 */
export const press: ViewStyle = {
  opacity: 0.85,
  transform: [{ scale: 0.98 }],
};
