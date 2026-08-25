import { Circle, G, Line, Path, Rect } from 'react-native-svg';

/**
 * The six islands on the settings chart.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THESE DRAWINGS
 *
 * Hand-plotted, like the Sunny and the fist, and each island exists twice:
 *
 *   - **drawn** — the paper chart. Strokes, no fills except where a fill *is*
 *     the information. This is the chart as pencilled by day.
 *   - **lit** — the same island at night. The coastline closes and fills to a
 *     dark mass against its own pool of light, the skyline takes a rim of
 *     ink, and the island's landmark becomes its light source: the lamp
 *     burns, the jetty hangs lanterns, the summit keeps a beacon. Lamplight
 *     is always the `lume` colour — warm, one warmth for the whole chart.
 *
 * The contract per island:
 *
 *   - Drawn inside a local box of `ISLE_W × ISLE_H` (120 × 56), with the
 *     waterline at `ISLE_WATERLINE` (44). The chart translates the group to
 *     put that waterline on its own water, so an island that floats above 44
 *     hovers and one below it sinks.
 *   - Colours are props, never literals: `ink` for the landmass line and the
 *     night rim, `faint` for detail, `body` for the night mass, `lume` for
 *     lamplight, `accent` only where the colour itself carries meaning
 *     (today: the crew island's pennant, which flies whichever colour 覇王色
 *     currently burns).
 *   - Returns a `<G>`, not an `<Svg>` — these compose into the chart's own
 *     canvas rather than owning one.
 *
 * What makes each one legible at a glance is its *landmark* — the flagpole,
 * the lighthouse, the arch, the jetty. Keep the landmark; the coastline under
 * it is negotiable. At night, keep the landmark *lit*.
 * ---------------------------------------------------------------------------
 */

export const ISLE_W = 120;
export const ISLE_H = 56;
export const ISLE_WATERLINE = 44;

export type IsleKind = 'crew' | 'quiet' | 'daybreak' | 'keystone' | 'training' | 'data';

export type IsleMode = 'drawn' | 'lit';
type IsleColours = {
  ink: string;
  faint: string;
  accent: string;
  /** The night landmass fill. Unused when drawn. */
  body: string;
  /** Lamplight — every window, lantern, beam and beacon burns this. */
  lume: string;
};

/** A lamp and the air around it: a hot core in two soft shells. */
function Lamp({ cx, cy, r, lume }: { cx: number; cy: number; r: number; lume: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r * 3.2} fill={lume} fillOpacity={0.14} />
      <Circle cx={cx} cy={cy} r={r * 1.9} fill={lume} fillOpacity={0.3} />
      <Circle cx={cx} cy={cy} r={r} fill={lume} fillOpacity={0.95} />
    </G>
  );
}

/** Banner Isle — a peak flying whichever colour the will currently burns. */
function CrewIsle({ ink, faint, accent }: IsleColours) {
  return (
    <G>
      <Path
        d="M 14 44 L 44 14 L 60 28 L 70 23 L 106 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* The pole on the summit, and the pennant. The fill is the one place
          the chart uses colour: it is data — whose will is flying. */}
      <Line
        x1={44}
        y1={14}
        x2={44}
        y2={3}
        stroke={ink}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path d="M 44 3 L 60 6.5 L 44 10 Z" fill={accent} />
      {/* A contour on the face, so the peak reads as ground rather than a
          tent. Trees were tried here and drew as circles at this size. */}
      <Path
        d="M 38 26 L 47 26"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** The atoll — low, with a lagoon. Nothing on it stands up. */
function QuietIsle({ ink, faint }: IsleColours) {
  return (
    <G>
      <Path
        d="M 12 44 Q 30 33 48 36 Q 58 37.5 66 34 Q 88 27 108 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* The lagoon: a still edge of water inside the reef. An ellipse here
          read as an eye; a shallow arc reads as a pool. */}
      <Path
        d="M 40 40.5 Q 52 43.5 64 40.5"
        fill="none"
        stroke={faint}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      {/* One palm, leaning. A quiet island is not an empty one. */}
      <Path
        d="M 86 32 Q 88 24 86 18"
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <Path
        d="M 86 18 q -7 -3 -11 1 M 86 18 q 7 -3 11 1 M 86 18 q -2 -6 -7 -7 M 86 18 q 2 -6 7 -7"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** The light — a tower on a rock, marking where the day turns over. */
function DaybreakIsle({ ink, faint }: IsleColours) {
  return (
    <G>
      <Path
        d="M 26 44 Q 42 35 58 38 Q 74 40 88 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* The tower, tapering, with its gallery and lamp. */}
      <Path
        d="M 52 38 L 54.5 12 L 61.5 12 L 64 38"
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Line
        x1={52.5}
        y1={12}
        x2={63.5}
        y2={12}
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path d="M 55 12 L 55.5 6 L 60.5 6 L 61 12" fill="none" stroke={ink} strokeWidth={1.4} />
      {/* Bands on the tower — what makes it a lighthouse from a distance. */}
      <Line x1={53.6} y1={22} x2={62.4} y2={22} stroke={faint} strokeWidth={1.2} />
      <Line x1={53.1} y1={29} x2={62.9} y2={29} stroke={faint} strokeWidth={1.2} />
      {/* The beam, thrown seaward. */}
      <Path
        d="M 53 8 L 40 4 M 63 8 L 76 4"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** The arch — a keystone holding its own weight over the water. */
function KeystoneIsle({ ink, faint }: IsleColours) {
  return (
    <G>
      <Path
        d="M 24 44 L 28 22 Q 60 2 92 22 L 96 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d="M 42 44 L 44 27 Q 60 16 76 27 L 78 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* The keystone itself, set into the crown between the two arcs. */}
      <Path
        d="M 56.5 11 L 63.5 11 L 62 21 L 58 21 Z"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
      />
    </G>
  );
}

/** Twin crags — sharpened, the whetstone island. */
function TrainingIsle({ ink, faint }: IsleColours) {
  return (
    <G>
      <Path
        d="M 14 44 L 36 10 L 48 28 L 54 20 L 62 30 L 82 6 L 104 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Scree lines down the faces. */}
      <Path
        d="M 36 10 L 40 22 M 82 6 L 76 20"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** The harbour — a jetty out into the water. Where cargo comes and goes. */
function DataIsle({ ink, faint }: IsleColours) {
  return (
    <G>
      <Path
        d="M 52 44 Q 64 27 82 30 Q 98 33 106 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* The jetty: deck and piles. */}
      <Line
        x1={16}
        y1={37.5}
        x2={56}
        y2={37.5}
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M 22 37.5 L 22 44 M 34 37.5 L 34 44 M 46 37.5 L 46 44"
        fill="none"
        stroke={faint}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      {/* The warehouse on the shore. */}
      <Path
        d="M 78 30 L 78 24 L 86 20.5 L 94 24 L 94 31.5"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </G>
  );
}

/* ------------------------------------------------------------------ night */

/** Banner Isle by night: the peak dark, the col keeping a beacon. */
function CrewIsleLit({ ink, accent, body, lume }: IsleColours) {
  return (
    <G>
      <Path d="M 14 44 L 44 14 L 60 28 L 70 23 L 106 44 Z" fill={body} />
      <Path
        d="M 14 44 L 44 14 L 60 28 L 70 23 L 106 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
      />
      <Lamp cx={51} cy={24} r={1.8} lume={lume} />
      <Line
        x1={44}
        y1={14}
        x2={44}
        y2={3}
        stroke={ink}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path d="M 44 3 L 60 6.5 L 44 10 Z" fill={accent} />
    </G>
  );
}

/** The atoll by night: the lagoon holds a soft shimmer, the palm stands dark. */
function QuietIsleLit({ ink, faint, body, lume }: IsleColours) {
  return (
    <G>
      <Path d="M 12 44 Q 30 33 48 36 Q 58 37.5 66 34 Q 88 27 108 44 Z" fill={body} />
      <Path
        d="M 12 44 Q 30 33 48 36 Q 58 37.5 66 34 Q 88 27 108 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* The quietest light on the chart — a shimmer, not a lamp. */}
      <Path
        d="M 40 40.5 Q 52 43.5 64 40.5"
        fill="none"
        stroke={lume}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.55}
      />
      <Path
        d="M 86 32 Q 88 24 86 18"
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <Path
        d="M 86 18 q -7 -3 -11 1 M 86 18 q 7 -3 11 1 M 86 18 q -2 -6 -7 -7 M 86 18 q 2 -6 7 -7"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** The light, doing its job: lamp burning, beams thrown, rock dark. */
function DaybreakIsleLit({ ink, faint, body, lume }: IsleColours) {
  return (
    <G>
      <Path d="M 26 44 Q 42 35 58 38 Q 74 40 88 44 Z" fill={body} />
      <Path
        d="M 26 44 Q 42 35 58 38 Q 74 40 88 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* The tower as a mass, not a wireframe — night flattens detail. */}
      <Path d="M 52 38 L 54.5 12 L 61.5 12 L 64 38 Z" fill={body} />
      <Path
        d="M 52 38 L 54.5 12 L 61.5 12 L 64 38"
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        strokeLinejoin="round"
        opacity={0.9}
      />
      <Line
        x1={53.6}
        y1={22}
        x2={62.4}
        y2={22}
        stroke={faint}
        strokeWidth={1.1}
        opacity={0.7}
      />
      <Line
        x1={53.1}
        y1={29}
        x2={62.9}
        y2={29}
        stroke={faint}
        strokeWidth={1.1}
        opacity={0.7}
      />
      {/* The lamp room, lit, and the beams it actually throws. */}
      <Rect x={55} y={6} width={5.5} height={6} rx={1} fill={lume} fillOpacity={0.95} />
      <Lamp cx={57.8} cy={9} r={2.2} lume={lume} />
      <Path
        d="M 53 8 L 34 2.5 M 63 8 L 82 2.5"
        fill="none"
        stroke={lume}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.35}
      />
    </G>
  );
}

/** The arch by night: a lantern hung under the keystone, water through it. */
function KeystoneIsleLit({ ink, faint, body, lume }: IsleColours) {
  return (
    <G>
      {/* The mass with the opening cut out, so the pool shows through. */}
      <Path
        d="M 24 44 L 28 22 Q 60 2 92 22 L 96 44 L 78 44 L 76 27 Q 60 16 44 27 L 42 44 Z"
        fill={body}
      />
      <Path
        d="M 24 44 L 28 22 Q 60 2 92 22 L 96 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
      />
      <Path
        d="M 42 44 L 44 27 Q 60 16 76 27 L 78 44"
        fill="none"
        stroke={faint}
        strokeWidth={1.1}
        strokeLinejoin="round"
        opacity={0.7}
      />
      <Path
        d="M 56.5 11 L 63.5 11 L 62 21 L 58 21 Z"
        fill="none"
        stroke={faint}
        strokeWidth={1.1}
      />
      <Line x1={60} y1={21} x2={60} y2={25.5} stroke={faint} strokeWidth={1} opacity={0.8} />
      <Lamp cx={60} cy={27} r={1.9} lume={lume} />
    </G>
  );
}

/** Twin crags by night: dark blades, a forge kept burning in the col. */
function TrainingIsleLit({ ink, body, lume }: IsleColours) {
  return (
    <G>
      <Path d="M 14 44 L 36 10 L 48 28 L 54 20 L 62 30 L 82 6 L 104 44 Z" fill={body} />
      <Path
        d="M 14 44 L 36 10 L 48 28 L 54 20 L 62 30 L 82 6 L 104 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
      />
      <Lamp cx={55} cy={33} r={1.9} lume={lume} />
    </G>
  );
}

/** The harbour after dark: lanterns down the jetty, one window still on. */
function DataIsleLit({ ink, faint, body, lume }: IsleColours) {
  return (
    <G>
      <Path d="M 52 44 Q 64 27 82 30 Q 98 33 106 44 Z" fill={body} />
      <Path
        d="M 52 44 Q 64 27 82 30 Q 98 33 106 44"
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* The warehouse as a mass, its door lit from inside. */}
      <Path d="M 78 31.5 L 78 24 L 86 20.5 L 94 24 L 94 31.5 Z" fill={body} />
      <Path
        d="M 78 30 L 78 24 L 86 20.5 L 94 24 L 94 31.5"
        fill="none"
        stroke={faint}
        strokeWidth={1.1}
        strokeLinejoin="round"
        opacity={0.8}
      />
      <Rect x={84} y={26} width={4} height={5.5} rx={0.8} fill={lume} fillOpacity={0.9} />
      {/* The jetty, and its lanterns. */}
      <Line
        x1={16}
        y1={37.5}
        x2={56}
        y2={37.5}
        stroke={ink}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.9}
      />
      <Path
        d="M 22 37.5 L 22 44 M 34 37.5 L 34 44 M 46 37.5 L 46 44"
        fill="none"
        stroke={faint}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.8}
      />
      <Lamp cx={22} cy={35} r={1.4} lume={lume} />
      <Lamp cx={34} cy={35} r={1.4} lume={lume} />
      <Lamp cx={46} cy={35} r={1.4} lume={lume} />
    </G>
  );
}

const LIT: Record<IsleKind, (c: IsleColours) => React.JSX.Element> = {
  crew: CrewIsleLit,
  quiet: QuietIsleLit,
  daybreak: DaybreakIsleLit,
  keystone: KeystoneIsleLit,
  training: TrainingIsleLit,
  data: DataIsleLit,
};

const ISLES: Record<IsleKind, (c: IsleColours) => React.JSX.Element> = {
  crew: CrewIsle,
  quiet: QuietIsle,
  daybreak: DaybreakIsle,
  keystone: KeystoneIsle,
  training: TrainingIsle,
  data: DataIsle,
};

export function Isle({
  kind,
  mode = 'drawn',
  ...colours
}: { kind: IsleKind; mode?: IsleMode } & IsleColours) {
  return (mode === 'lit' ? LIT : ISLES)[kind](colours);
}
