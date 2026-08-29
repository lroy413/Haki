import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../src/db/client';
import { crewFor } from '../../src/domain/crew';
import { describeDayStart } from '../../src/domain/date';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { ChartSky, IslandRow, MOON_X, SeaLife, anchorX } from '../../src/components/IslandRow';
import { moonPhase } from '../../src/domain/moon';
import type { IsleKind } from '../../src/components/instruments/Isles';
import { useHaki } from '../../src/state/HakiProvider';
import { space, type } from '../../src/theme/tokens';
import { press, row } from '../../src/theme/surfaces';
import type { Palette } from '../../src/theme/palettes';

/**
 * Settings, drawn as a chart.
 *
 * Every category is an island; pressing one goes ashore to its page. The sea
 * between them is the Sunny's own sea — flat calm on paper, running when the
 * day has hardened — and the course is pencilled from island to island in
 * the order you would sail them. `IslandRow` owns the water and the plotted
 * line; `instruments/Isles.tsx` owns the landmasses.
 *
 * Plain mode drops the whole performance and renders the same six categories
 * as a plain list. Same names, same order, same pages.
 */

type Island = { kind: IsleKind; name: string; value: string; route: string };

export default function SettingsScreen() {
  const { settings } = useStore();
  const { t, palette, hardening, plainMode, conquerors, day } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();

  // The chart's width, measured once — the water spans it and the islands
  // anchor to its edges, neither of which a percentage can do in an SVG.
  const [w, setW] = useState(0);

  // Tonight's actual moon — the plain Date is deliberate; see domain/moon.
  const moon = useMemo(() => moonPhase(new Date()), []);

  const islands: Island[] = [
    {
      kind: 'crew',
      name: t.crewTitle,
      value: crewFor(settings.crew).label,
      route: '/crew',
    },
    {
      kind: 'quiet',
      name: t.quietTitle,
      value: plainMode
        ? `Plain on · Sound ${settings.soundOn ? 'on' : 'off'}`
        : settings.soundOn
          ? 'Sound on'
          : 'Sound off',
      route: '/quiet',
    },
    {
      kind: 'daybreak',
      name: t.dayTurnTitle,
      value: describeDayStart(settings.dayStartHour),
      route: '/daybreak',
    },
    {
      kind: 'keystone',
      name: t.keystoneTitle,
      value: `${settings.keystone.targetHours} hours`,
      route: '/keystone',
    },
    {
      kind: 'training',
      name: t.trainingTitle,
      value: `${settings.training.weeklyTarget} a week`,
      route: '/training',
    },
    { kind: 'data', name: t.dataTitle, value: 'On this device', route: '/data' },
  ];

  const sides = islands.map((_, i) => (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right');
  const anchors = islands.map((_, i) => anchorX(sides[i], w));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, pad]}>
      {/* The dateline over the title, the way a camp knows its day on the
          route. Part of the chart's performance, so plain mode skips it. */}
      {plainMode ? null : <Text style={styles.kicker}>Day {day} at sea</Text>}
      <PageHeading
        title={t.tabs.settings.label}
        trailing={t.tabs.settings.glyph || undefined}
      />
      <Text style={styles.blurb}>{t.settingsBlurb}</Text>

      {plainMode ? (
        <View style={styles.list}>
          {islands.map((island) => (
            <Pressable
              key={island.kind}
              onPress={() => router.push(island.route)}
              accessibilityRole="button"
              accessibilityLabel={`${island.name}. ${island.value}.`}
              style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
            >
              <Text style={styles.listName}>{island.name}</Text>
              <Text style={styles.listValue}>{island.value}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.chart} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {/* The sky, the moon and the far shore, before the first leg. */}
          {w > 0 ? <ChartSky w={w} level={hardening} moon={moon} /> : null}
          {/* The rows, over a sea with life in it: haze off the far shore,
              the moon's glimmer, and small craft riding between islands. */}
          {w > 0 ? (
            <View>
              <SeaLife
                w={w}
                rows={islands.length}
                level={hardening}
                moonX={MOON_X * w}
                moonGlow={moon.fraction}
              />
              {islands.map((island, i) => (
                <IslandRow
                  key={island.kind}
                  kind={island.kind}
                  name={island.name}
                  value={island.value}
                  side={sides[i]}
                  w={w}
                  prevX={i === 0 ? null : anchors[i - 1]}
                  level={hardening}
                  accent={conquerors}
                  onPress={() => router.push(island.route)}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}

      <Text style={styles.footer}>
        Everything lives on this device. Nothing is uploaded anywhere.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },

    blurb: { ...type.small, color: c.inkDim, lineHeight: 20 },
    kicker: { ...type.label, color: c.warn, marginBottom: -space.xs },

    // Full bleed: the sea runs to the screen edges, like the band the Sunny
    // sails in. The rows stack with no gap so the course legs join up.
    chart: { marginHorizontal: -space.lg },

    list: { gap: space.sm },
    listRow: {
      ...row(c),
      minHeight: 56,
      paddingHorizontal: space.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
    },
    listName: { ...type.body, color: c.ink, flex: 1 },
    listValue: { ...type.mono, color: c.inkDim },
    chevron: { ...type.body, fontSize: 20, color: c.inkFaint },
    pressed: { ...press },

    footer: { ...type.small, color: c.inkFaint, textAlign: 'center' },
  });
