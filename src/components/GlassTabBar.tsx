import { useEffect, useMemo, useState } from 'react';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useHaki } from '../state/HakiProvider';
import type { Tab } from '../theme/strings';
import { font, radius, space } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The floating glass bar.
 *
 * It hovers over the content rather than sitting in a docked strip, so the
 * ground and the Reserve glow carry all the way to the bottom of the display.
 * Every tab screen takes its bottom padding from `useTabInsets`, which asks
 * this bar what it measured and leaves exactly that plus one gap — so nothing
 * is trapped underneath it and nothing is stranded above it. The tabs have no
 * header for the same reason at the other end: the scene runs from the top of
 * the display down to here.
 *
 * Each tab carries the kanji above and the English word below. Plain mode
 * ships an empty glyph, which collapses a tab to the English word alone.
 */
/**
 * What the bar actually measures, published to whoever has to clear it.
 *
 * It cannot be a constant. The bar carries a kanji above each label in Haki
 * mode and only the label in plain mode, so it is about twenty points shorter
 * there — and a fixed number is wrong in one mode by construction. It was also
 * wrong on every device: the old `TAB_BAR_CLEARANCE` of 108 left 39 points of
 * dead ground under the last item on the web and around 51 on a phone with a
 * home indicator.
 *
 * So the bar measures itself once it has laid out and tells the screens. A
 * module-level store rather than a context, matching how the sound and impact
 * channels already work here: one publisher, many subscribers, no provider to
 * thread through a navigator that is not ours.
 */
let measured = 57;
const listeners = new Set<(height: number) => void>();

/** Used for the first frame only, before the bar has laid out. */
export function tabBarHeight(): number {
  return measured;
}

export function useTabBarHeight(): number {
  const [height, setHeight] = useState(measured);
  useEffect(() => {
    setHeight(measured);
    listeners.add(setHeight);
    return () => {
      listeners.delete(setHeight);
    };
  }, []);
  return height;
}

function publish(height: number): void {
  // Sub-point noise on a re-layout is not worth a re-render of every screen.
  if (Math.abs(height - measured) < 0.5) return;
  measured = height;
  for (const listener of listeners) listener(height);
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const tabs: Tab[] = [
    t.tabs.home,
    t.tabs.observation,
    t.tabs.armament,
    t.tabs.conquerors,
    t.tabs.settings,
  ];

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.md) }]}
      pointerEvents="box-none"
    >
      <View style={styles.shadow} onLayout={(e) => publish(e.nativeEvent.layout.height)}>
        <BlurView
          intensity={Platform.OS === 'android' ? 24 : 40}
          // Blurring dark over paper is what makes a light bar read as mud.
          tint={palette.lightSurface ? 'light' : 'dark'}
          style={styles.bar}
          accessibilityRole="tablist"
        >
          {/* Typed structurally rather than against react-navigation's route
              generics, which resolve to `any` through expo-router's re-export. */}
          {state.routes.map((route: { key: string; name: string }, index: number) => {
            const focused = state.index === index;
            const tab = tabs[index];
            if (!tab) return null;

            const { options } = descriptors[route.key];
            const tint = focused ? palette.violet : palette.inkFaint;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (focused || event.defaultPrevented) return;
              void Haptics.selectionAsync();
              navigation.navigate(route.name);
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.title ?? tab.label}
                style={({ pressed }) => [
                  styles.tab,
                  focused && styles.tabActive,
                  pressed && styles.pressed,
                ]}
              >
                {tab.glyph ? (
                  <Text numberOfLines={1} style={[styles.glyph, { color: tint }]}>
                    {tab.glyph}
                  </Text>
                ) : null}
                <Text numberOfLines={1} style={[styles.label, { color: tint }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space.md,
    },
    // The shadow lives on a wrapper: BlurView clips its own overflow, so a
    // shadow set on it would be cut off at the rounded corners.
    shadow: {
      borderRadius: radius.xl,
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 16,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderRadius: radius.xl,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.glassEdge,
      // The blur alone reads muddy over a near-black ground; this tints it back
      // toward the app's own surface colour.
      backgroundColor: c.glass,
      paddingVertical: space.sm,
      paddingHorizontal: space.xs,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      paddingVertical: space.xs,
      borderRadius: radius.lg,
    },
    tabActive: { backgroundColor: c.glassActive },
    pressed: { ...press },
    glyph: { fontFamily: font.displayBold, fontSize: 14, lineHeight: 19 },
    label: { fontFamily: font.mono, fontSize: 9, letterSpacing: 0.6 },
  });
