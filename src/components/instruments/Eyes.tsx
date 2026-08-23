import Svg, { Circle, G, Path } from 'react-native-svg';

/*
 * REPLACING THIS DRAWING
 * ----------------------
 * The Observation gauge: a pair of eyes that open as the tool is used.
 *
 * Keep for a redraw:
 *   - viewBox `0 0 200 64`, preserveAspectRatio "xMidYMid meet".
 *   - Props: `ink` (lines and lids), `iris` (Observation's violet), `ground`
 *     (the exact colour behind the band — it masks the iris outside the
 *     lids), `openness` 0..1, `lit` for the future-sight glint.
 *   - `openness` is the entire interface: 0 is closed (a lash line), 1 fully
 *     open. The mapping from the domain lives in `domain/observation.ts`
 *     (`openness()`), never in the drawing.
 *   - `lit` may only add — the glint and the fine ring — and only arrives
 *     true at openness 1; the drawing must not invent its own threshold.
 *   - The composition from the reference: heavy, low, near-straight brows
 *     that knit slightly toward the nose; a firm upper lid that still crops
 *     the top of the iris at full open; a light lower lash line; one flick
 *     at each **temple-side** corner. Serious eyes, not startled ones.
 *
 * The masking trick, worth keeping whatever the art becomes: the iris is
 * drawn full, then the ground colour is painted back over everything above
 * the upper lid curve and below the lower one. No ClipPath — a flat ground
 * makes cover-up exact, and it survives every renderer.
 */

const W = 200;
const H = 64;
const CY = 40;
const EYE_HALF = 28;
const IRIS_R = 12.5;

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
  ground,
  openness,
}: {
  cx: number;
  temple: 1 | -1;
  ink: string;
  iris: string;
  ground: string;
  openness: number;
}) {
  const nose = cx - EYE_HALF * temple;
  const out = cx + EYE_HALF * temple;
  const open = openness > 0.02;

  // Control points for the two lid curves. Quadratic apex sits half-way to
  // the control, so a control 30 above the corners opens the aperture 15 —
  // enough to show most of the iris while the lid still crops its top, which
  // is what keeps the eyes serious rather than startled.
  const upCtrl = CY + 5 - (5 + 30) * openness;
  const lowCtrl = CY + 8;

  const upper = `M ${nose} ${CY} Q ${cx} ${upCtrl} ${out} ${CY}`;
  const lower = `M ${nose} ${CY} Q ${cx} ${lowCtrl} ${out} ${CY}`;

  // The brow: a relaxed arch at rest that lowers and knits as the eyes open —
  // the nose end drops further than the temple end, which is the whole
  // difference between attention and surprise.
  const browNoseY = 16 + 9 * openness;
  const browTempleY = 14 + 3 * openness;
  const browCtrlY = 8 + 7 * openness;

  return (
    <G>
      {open ? (
        <>
          <Circle cx={cx} cy={CY + 1} r={IRIS_R} fill={iris} />
          <Circle cx={cx} cy={CY + 1} r={IRIS_R * 0.4} fill={ink} />
          {/* The resting highlight, high on the nose side. */}
          <Circle cx={cx - 4.5 * temple} cy={CY - 4} r={2.6} fill={ground} />

          {/* The ground painted back over everything outside the lids. */}
          <Path d={`${upper} L ${out} 0 L ${nose} 0 Z`} fill={ground} />
          <Path d={`${lower} L ${out} ${H} L ${nose} ${H} Z`} fill={ground} />

          <Path d={upper} fill="none" stroke={ink} strokeWidth={3.6} strokeLinecap="round" />
          <Path d={lower} fill="none" stroke={ink} strokeWidth={1.3} strokeLinecap="round" />
        </>
      ) : (
        <Path
          d={`M ${nose} ${CY} Q ${cx} ${CY + 5} ${out} ${CY}`}
          fill="none"
          stroke={ink}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}

      {/* The lash flick, temple side, up and out. */}
      <Path
        d={`M ${out} ${CY - openness * 2} l ${7 * temple} ${-4 - 3 * openness}`}
        fill="none"
        stroke={ink}
        strokeWidth={2.8}
        strokeLinecap="round"
      />

      <Path
        d={`M ${nose + 2 * temple} ${browNoseY} Q ${cx} ${browCtrlY} ${out + 3 * temple} ${browTempleY}`}
        fill="none"
        stroke={ink}
        strokeWidth={4.2}
        strokeLinecap="round"
      />
    </G>
  );
}

export function Eyes({
  ink,
  iris,
  ground,
  openness,
  lit,
}: {
  ink: string;
  iris: string;
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
      <Eye cx={58} temple={-1} ink={ink} iris={iris} ground={ground} openness={openness} />
      <Eye cx={142} temple={1} ink={ink} iris={iris} ground={ground} openness={openness} />

      {/* Future sight. Additive only: a fine ring just inside the iris and a
          second, lower glint — the eye catching light it was not given. */}
      {lit
        ? [58, 142].map((cx) => (
            <G key={cx}>
              <Circle
                cx={cx}
                cy={CY + 1}
                r={IRIS_R - 2}
                fill="none"
                stroke={ground}
                strokeWidth={1.2}
                opacity={0.9}
              />
              <Circle cx={cx + 4.5} cy={CY + 4.5} r={1.7} fill={ground} />
            </G>
          ))
        : null}
    </Svg>
  );
}
