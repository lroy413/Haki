import Svg, { Circle, G, Path } from 'react-native-svg';

/*
 * REPLACING THIS DRAWING
 * ----------------------
 * The Observation gauge: a pair of eyes that open as the tool is used.
 *
 * Keep for a redraw:
 *   - viewBox `0 0 200 64`, preserveAspectRatio "xMidYMid meet".
 *   - `openness` 0..1 is the entire interface: 0 is closed (a lash line), 1
 *     fully open. The mapping from the domain lives in
 *     `domain/observation.ts` (`openness()`), never in the drawing.
 *   - `lit` may only add — the fine ring and the second glint — and only
 *     arrives true at openness 1; the drawing must not invent its own
 *     threshold.
 *   - The composition: heavy, low, near-straight brows that knit toward the
 *     nose as the eyes open; a firm upper lid that still crops the top of the
 *     iris at full open; a shallow lower lid; one lash flick at each
 *     **temple-side** corner. Serious eyes, not startled ones.
 *
 * **An eye is an object, not a mood — so most of it is the same colour on
 * every palette.** The sclera is near-white and the lash line and pupil are
 * near-black on all four, exactly like the poneglyph's `onStone`: eyes look
 * like eyes at seven in the morning and at eleven at night. Only two things
 * move — the iris, which is 見聞色's own violet, and the *brow*, which sits
 * on the page rather than on the eye and so has to be legible against a
 * ground that changes.
 *
 * That split is the fix for the bug this drawing shipped with. The pupil was
 * `ink` and the glint was `bg` — and `palette.ink` is the *text* colour,
 * near-white on the three palettes the app spends its day on. So the pupil
 * was a white disc covering half the iris and the highlight was a black spot
 * beside it: an eye drawn correctly for paper, inverted everywhere else,
 * which is the exact failure CLAUDE.md's note on `darkest()` describes.
 *
 * The masking trick is worth keeping whatever the art becomes: the aperture
 * is filled, the iris drawn full on top of it, and then the ground colour
 * painted back over everything above the upper lid curve and below the lower
 * one. No ClipPath — a flat ground makes the cover-up exact, and it survives
 * every renderer.
 */

const W = 200;
const H = 64;
/** The corner line: where the two lids meet at both ends of the eye. */
const CY = 44;
const EYE_HALF = 26;
/**
 * Big. The aperture is wide and shallow, so a small iris leaves two broad
 * fields of sclera on either side of it and the eye reads as a startled one.
 * Cropped top and bottom by the lids at every openness, which is what a
 * looking eye does.
 */
const IRIS_R = 13;
/**
 * How far above the corner line the iris sits.
 *
 * Small. The first cut rode it eight points up, and at the middling openness
 * the app actually spends most of its time at, the lid came down *through the
 * pupil* — so the iris read as a violet hump with a bite out of the top of
 * it. The lid must crop the iris; it must never crop the pupil.
 */
const IRIS_RISE = 5;

/**
 * One eye. `temple` is +1 when the temple (outer corner, lash flick) is on
 * the right of this eye — the left eye of the face as you look at it has its
 * temple on the *left*, so it takes -1.
 */
function Eye({
  cx,
  temple,
  ink,
  iris,
  sclera,
  lash,
  ground,
  openness,
}: {
  cx: number;
  temple: 1 | -1;
  ink: string;
  iris: string;
  sclera: string;
  lash: string;
  ground: string;
  openness: number;
}) {
  const nose = cx - EYE_HALF * temple;
  const out = cx + EYE_HALF * temple;
  const span = out - nose;
  const open = openness > 0.02;

  // The two lids, and the asymmetry between them is the whole thing. A lens
  // with the same curve top and bottom is a leaf; an eye has a deep upper lid
  // whose apex sits toward the temple and a shallow lower one whose lowest
  // point sits toward the nose. Cubics rather than quadratics, because a
  // quadratic's apex is always dead centre and cannot be biased.
  const lidTop = CY - (8 + 12 * openness);
  const lidBot = CY + (3 + 4 * openness);
  const upper =
    `M ${nose} ${CY} C ${nose + span * 0.3} ${lidTop - 2}` +
    ` ${nose + span * 0.72} ${lidTop} ${out} ${CY}`;
  const lower =
    `M ${nose} ${CY} C ${nose + span * 0.25} ${lidBot}` +
    ` ${nose + span * 0.62} ${lidBot} ${out} ${CY}`;
  // The aperture: down the upper lid and back along the lower one.
  const aperture = `${upper} ${lower.replace(/^M [^C]+C/, 'L')}`;

  const irisY = CY - IRIS_RISE;

  // The brow lowers and knits as the eyes open — the nose end drops further
  // than the temple end, which is the whole difference between attention and
  // surprise. Drawn as a filled shape rather than a stroke so it can taper:
  // a brow is thick at the nose and thin at the temple, and a constant-width
  // stroke reads as a painted bar.
  const browNoseY = 12 + 6 * openness;
  const browTempleY = 10 + 2 * openness;
  const browCtrlY = 3 + 6 * openness;
  const bn = nose + 3 * temple;
  const bo = out + 4 * temple;
  const bmid = (bn + bo) / 2;
  const brow =
    `M ${bn} ${browNoseY - 2} Q ${bmid} ${browCtrlY - 1.2} ${bo} ${browTempleY - 0.7}` +
    ` L ${bo} ${browTempleY + 0.7} Q ${bmid} ${browCtrlY + 1.2} ${bn} ${browNoseY + 2} Z`;

  return (
    <G>
      {open ? (
        <>
          <Path d={aperture} fill={sclera} />
          <Circle cx={cx} cy={irisY} r={IRIS_R} fill={iris} />
          <Circle cx={cx} cy={irisY} r={IRIS_R * 0.42} fill={lash} />
          {/* The catchlight: small, high on the nose side, and kept wholly
              *inside* the pupil. The one this replaced was nearly the size of
              the iris and dead centre, which reads as a rolled eye rather
              than a wet one — and the first attempt at fixing it straddled
              the pupil's edge, which at this size reads as a bite taken out
              of the pupil rather than as light landing on it. */}
          <Circle cx={cx - 1.9 * temple} cy={irisY - 2} r={1.8} fill={sclera} />
          <Circle cx={cx + 6 * temple} cy={irisY + 6} r={1.1} fill={sclera} opacity={0.6} />

          {/* The ground painted back over everything outside the lids. */}
          <Path d={`${upper} L ${out} 0 L ${nose} 0 Z`} fill={ground} />
          <Path d={`${lower} L ${out} ${H} L ${nose} ${H} Z`} fill={ground} />

          {/* Two strokes, and the outer one is the whole reason the eye has
              an outline at all. The lid is near-black on every palette, which
              reads beautifully against the sclera and not one bit against a
              near-black ground — so it carries a slightly wider `ink` edge
              underneath it, which is the colour that follows the page. Same
              construction the impact burst and the charge both use, for the
              same reason: one stroke cannot be visible on two grounds. */}
          <Path d={upper} fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round" />
          <Path d={upper} fill="none" stroke={lash} strokeWidth={3.2} strokeLinecap="round" />
          <Path d={lower} fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
          <Path d={lower} fill="none" stroke={lash} strokeWidth={1.4} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Path
            d={`M ${nose} ${CY} Q ${cx} ${CY + 4} ${out} ${CY}`}
            fill="none"
            stroke={ink}
            strokeWidth={4.6}
            strokeLinecap="round"
          />
          <Path
            d={`M ${nose} ${CY} Q ${cx} ${CY + 4} ${out} ${CY}`}
            fill="none"
            stroke={lash}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </>
      )}

      {/* The lash flick. It starts *on* the lid a few points inside the outer
          corner and sweeps through it — the one this replaced began at the
          corner and left at an angle, so it read as a whisker floating beside
          the eye rather than as the lid line ending in lashes. */}
      {(() => {
        // Short and fine. The first cut ran fifteen points at four wide,
        // which under the double stroke came out as a pale horn on each
        // temple — bigger than the lash line it is supposed to be the end of.
        const flick =
          `M ${out - 5 * temple} ${CY - 1.5} Q ${out} ${CY - 0.5}` +
          ` ${out + 5 * temple} ${CY - 4 - 2 * openness}`;
        return (
          <>
            <Path d={flick} fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
            <Path d={flick} fill="none" stroke={lash} strokeWidth={1.8} strokeLinecap="round" />
          </>
        );
      })()}

      {/* Ink, not lash: the brow sits on the page rather than on the eye, so
          it is the one part that has to follow the ground. */}
      <Path d={brow} fill={ink} />
    </G>
  );
}

export function Eyes({
  ink,
  iris,
  sclera,
  lash,
  ground,
  openness,
  lit,
}: {
  /** The brow only. Follows the palette, because it sits on the ground. */
  ink: string;
  /** 見聞色's own violet — the one part of the eye that carries a lens. */
  iris: string;
  /** Near-white on every palette. The eye is an object, not a mood. */
  sclera: string;
  /** Near-black on every palette: the lid lines, the lashes, the pupil. */
  lash: string;
  /** The exact colour behind the band — it masks the iris outside the lids. */
  ground: string;
  /** 0..1 from `domain/observation.ts`. The whole interface. */
  openness: number;
  /** Future sight: the glint. Only ever true at openness 1. */
  lit: boolean;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* The face's left eye has its temple on the left. */}
      <Eye
        cx={58}
        temple={-1}
        ink={ink}
        iris={iris}
        sclera={sclera}
        lash={lash}
        ground={ground}
        openness={openness}
      />
      <Eye
        cx={142}
        temple={1}
        ink={ink}
        iris={iris}
        sclera={sclera}
        lash={lash}
        ground={ground}
        openness={openness}
      />

      {/* Future sight. Additive only: a fine ring just inside the iris — the
          eye catching light it was not given. */}
      {lit
        ? [58, 142].map((cx) => (
            <Circle
              key={cx}
              cx={cx}
              cy={CY - IRIS_RISE}
              r={IRIS_R - 2}
              fill="none"
              stroke={sclera}
              strokeWidth={1.1}
              opacity={0.85}
            />
          ))
        : null}
    </Svg>
  );
}
