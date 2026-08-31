import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useHaki } from '../state/HakiProvider';
import { Excerpt } from './SearchField';
import { radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The Logbook, bound.
 *
 * The archive was a column of cards — the same rectangle the rest of the app
 * is made of, stacked eight deep, and the owner's verdict on it was _"Not sure
 * I like this. I'm trying to make things more visually interesting. Can we make
 * the old entries look like an actual journal that I can flip through the
 * pages?"_
 *
 * So it is a book: one entry to a page, swiped rather than scrolled, with a
 * sewn gutter down the left, ruled lines under the writing and the depth of
 * the remaining leaves showing at the fore-edge. **You flip to the right to go
 * back in time**, because the newest page is the one lying open — which is
 * what a log looks like when you put it down.
 *
 * Two decisions worth keeping if this is redrawn:
 *
 * **The page is made of the palette, not of paper.** A cream leaf would be
 * right at level 0 and a lit rectangle at eleven at night, in an app whose
 * whole identity is that it hardens as the day is used. The book-ness comes
 * from the furniture — the gutter, the stitching, the ruling, the fore-edge —
 * so it reads as paper in the morning and as a dark bound journal after dark,
 * which is what a real one does. (The poneglyph is the exception to this rule
 * and stays fixed across all four palettes, because a poneglyph is eight
 * hundred years old and indifferent to what time it is. A logbook is a thing
 * you are holding.)
 *
 * **No page numbers, no leaf count, nothing that totals.** The fore-edge draws
 * a fixed few leaves — a book's edge — rather than one line per entry. A
 * figure there would be a tally of how much you have written, which is a
 * streak in a different costume, and this app does not keep those.
 */
export function Volume({
  pages,
  tint,
  query,
  onOpen,
  emptyLine,
}: {
  pages: { id: number; head: string; body: string }[];
  /** The screen's own light. No default — see the one-light rule. */
  tint: string;
  /** When searching, the matched text is marked in the excerpt. */
  query: string;
  onOpen: (id: number) => void;
  emptyLine: string;
}) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  // Plain mode draws no ruling, and an unruled page of that height is not a
  // page — it is a large empty card. The pages keep their shape; the paper
  // is what goes.
  const height = plainMode ? PLAIN_HEIGHT : HEIGHT;
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState(0);
  const list = useRef<FlatList<{ id: number; head: string; body: string }>>(null);

  const measure = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 0.5) setWidth(w);
  };

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    setAt(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.wrap} onLayout={measure}>
      {width > 0 ? (
        pages.length === 0 ? (
          <Leaf styles={styles} width={width} height={height}>
            <Text style={styles.empty}>{emptyLine}</Text>
          </Leaf>
        ) : (
          <>
            <FlatList
              ref={list}
              data={pages}
              keyExtractor={(p) => String(p.id)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={settle}
              scrollEventThrottle={32}
              onMomentumScrollEnd={settle}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onOpen(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open the entry from ${item.head}`}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Leaf styles={styles} width={width} height={height}>
                    <Text style={styles.head}>{item.head}</Text>
                    <View style={styles.text}>
                      {query ? (
                        <Excerpt
                          text={item.body}
                          query={query}
                          tint={tint}
                          fallback={item.body.trim() || 'Empty entry'}
                        />
                      ) : (
                        <Text style={styles.body} numberOfLines={linesIn(height)}>
                          {item.body.trim() || 'Empty entry'}
                        </Text>
                      )}
                    </View>
                  </Leaf>
                </Pressable>
              )}
            />
            {/* How to move, and never where you are.
                "4 / 112" is a page count, which is a tally of how much you
                have written — a streak in a different costume. And the day is
                already at the head of the page, so repeating it here would be
                the tab-labels-drawn-twice bug one line lower. What is left is
                the one thing the picture cannot say by itself: which way is
                home. */}
            <Text style={styles.foot}>
              {at === 0
                ? plainMode
                  ? 'The latest. Swipe back through the others.'
                  : 'The page you left open. Swipe to go astern.'
                : plainMode
                  ? 'Swipe the other way for the latest.'
                  : 'Astern. Swipe the other way to come back.'}
            </Text>
          </>
        )
      ) : null}
    </View>
  );
}

/** How much of an entry a page holds before it wants opening. */
function linesIn(height: number): number {
  return Math.max(3, Math.floor((height - FIRST_RULE) / RULE_STEP) + 1);
}

const HEIGHT = 300;
/** Plain mode's page: no ruling, so no empty ruled half to justify the height. */
const PLAIN_HEIGHT = 216;
/** The sewn gutter's width, and where the ruling starts. */
const GUTTER = 26;
/** Leaves drawn at the fore-edge. Fixed — a book's edge, never a count. */
const EDGE = 3;
/** How much of the block the fore-edge shows. */
const FORE = 12;

/**
 * One leaf: the gutter, the stitching, the ruling and the fore-edge.
 *
 * The ruling is drawn rather than styled because a row of `borderBottomWidth`
 * views would sit *in* the layout and push the writing around; these lie under
 * it, on their own, at the body's own line height so the words land on them.
 */
function Leaf({
  styles,
  width,
  height,
  children,
}: {
  styles: ReturnType<typeof makeStyles>;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const { palette, plainMode } = useHaki();
  const rules = Math.floor((height - FIRST_RULE) / RULE_STEP);
  return (
    <View style={[styles.leaf, { width, height }]}>
      {/* The stack behind: two leaves peeking at the fore-edge, so the page
          being read is visibly the top of something. */}
      {Array.from({ length: EDGE }, (_, i) => (
        <View
          key={i}
          style={[
            styles.edge,
            { right: FORE - (i + 1) * 4, top: 5 + i * 3, bottom: 5 + i * 3 },
          ]}
        />
      ))}

      <View style={styles.page}>
        {/* The ruling, and the gutter rule down the left. Plain mode keeps
            the page and loses the paper: the lines are a performance. */}
        {plainMode ? null : (
          <Svg
            width={width}
            height={height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {Array.from({ length: rules }, (_, i) => (
              <Line
                key={i}
                x1={GUTTER}
                x2={width - space.md}
                y1={FIRST_RULE + i * RULE_STEP}
                y2={FIRST_RULE + i * RULE_STEP}
                stroke={palette.lineSoft}
                strokeWidth={1}
              />
            ))}
            {/* The fold. One hard line is a border; a sewn gutter is a
                shadow, so it is drawn as rules of falling opacity running out
                from the spine. Opacity rather than a second colour, because a
                drawing takes its colours and never mixes one. */}
            {[0, 1, 2, 3, 4].map((i) => (
              <Line
                key={`fold-${i}`}
                x1={GUTTER - 8 + i * 2.5}
                x2={GUTTER - 8 + i * 2.5}
                y1={0}
                y2={height}
                stroke={palette.line}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeOpacity={0.9 - i * 0.18}
              />
            ))}
          </Svg>
        )}

        {/* The stitching. Five short marks down the fold — the one detail
            that says "bound" rather than "a card with lines on it". */}
        {plainMode ? null : (
          <View style={styles.stitches}>
            {Array.from({ length: 5 }, (_, i) => (
              <View key={i} style={styles.stitch} />
            ))}
          </View>
        )}

        <View style={styles.written}>{children}</View>
      </View>
    </View>
  );
}

/** The body's own line height, so the words sit on the rules. */
const RULE_STEP = 27;
/**
 * Where the first rule falls: under the first line of writing, not through it.
 *
 * The block starts at the page's own top padding plus the head plus the gap
 * under it (12 + 20 + 12), and the rule belongs one line height below that —
 * which is the difference between ruled paper and a line struck through a
 * sentence. It was fifteen points high in the first cut and the screenshot is
 * the only thing that showed it.
 */
const FIRST_RULE = space.md + 20 + space.md + RULE_STEP;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: space.sm },
    leaf: { justifyContent: 'center', paddingRight: FORE },
    edge: {
      position: 'absolute',
      width: 10,
      borderTopRightRadius: radius.md,
      borderBottomRightRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface2,
    },
    page: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      // Square at the gutter and rounded at the fore-edge: a bound page is
      // held on one side and free on the other.
      borderTopLeftRadius: radius.sm,
      borderBottomLeftRadius: radius.sm,
      borderTopRightRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
      overflow: 'hidden',
    },
    stitches: {
      position: 'absolute',
      left: GUTTER - 5,
      top: 30,
      bottom: 30,
      justifyContent: 'space-between',
    },
    stitch: { width: 3, height: 9, borderRadius: 2, backgroundColor: c.line },
    written: {
      flex: 1,
      paddingLeft: GUTTER + space.sm,
      paddingRight: space.md,
      paddingTop: space.md,
    },
    head: { ...type.mono, fontSize: 12, color: c.inkFaint, height: 20 },
    text: { flex: 1, paddingTop: space.md },
    body: { ...type.body, fontSize: 18, lineHeight: RULE_STEP, color: c.ink },
    empty: { ...type.body, fontSize: 17, color: c.inkDim, textAlign: 'center' },
    foot: { ...type.mono, fontSize: 12, color: c.inkFaint, textAlign: 'center' },
    pressed: { ...press },
  });
