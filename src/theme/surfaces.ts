import type { ViewStyle } from 'react-native';
import type { HardeningLevel } from '../domain/hardening';
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

/**
 * The light a lens throws.
 *
 * A plate lit like this is the one place the app says *which* Haki you are
 * looking at without writing the word. The hardness readout burns crimson,
 * the reading violet, Foresight cyan, the Dream violet — the same colour
 * each of those lenses already uses for its own labels, spread into the air
 * around the card it belongs to.
 *
 * Two rules keep it from becoming decoration:
 *
 * 1. **Paper catches nothing.** At level 0 this returns the ordinary neutral
 *    shadow. Unhardened Haki does not glow — that is the whole conceit of
 *    the ramp, and an aura on parchment would say the opposite.
 * 2. **It grows with the day and stops there.** The strength follows the
 *    hardening level, the same curve the specular glint already climbs, and
 *    it is never a figure, a bar, or a count. It is the ground changing
 *    around you; you cannot read your score off a halo.
 *
 * One shadow per view is all React Native gives, so the aura *replaces* the
 * plate's drop shadow rather than stacking with it. That is the right trade:
 * a lit card still reads as lifted, because light around an edge is exactly
 * what lifted looks like.
 *
 * Applied inline at the call site rather than baked into a StyleSheet —
 * `makeStyles` takes a palette, and the level is a second fact. Call it with
 * a level of 0 in plain mode: plain mode is the switch that stops the app
 * performing, and an aura is a performance. (It cannot read that for itself,
 * because the level it is handed is already pinned to the settled dark
 * there — which is exactly the value that would glow brightest.)
 */
export function lit(tint: string, level: HardeningLevel): ViewStyle {
  if (level === 0) return {};
  const strength = { 1: 0.22, 2: 0.3, 3: 0.38 }[level];
  return {
    shadowColor: tint,
    shadowOpacity: strength,
    shadowRadius: 10 + level * 2,
    // Offset downward rather than centred. A halo of equal weight on all
    // four sides reads as *emission* — the card becomes a lamp, and at the
    // settled dark the Reserve plate was outshouting the number inside it.
    // Light that falls from above and pools under the card reads as
    // *weight*, which is what a plate under its lens's light should be.
    shadowOffset: { width: 0, height: 3 },
    elevation: 4 + level,
  };
}
