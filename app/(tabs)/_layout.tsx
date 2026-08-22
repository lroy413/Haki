import { Tabs } from 'expo-router';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useHaki } from '../../src/state/HakiProvider';
import type { Tab } from '../../src/theme/strings';
import { color, space } from '../../src/theme/tokens';

/**
 * Five tabs, each carrying the kanji above and the English word below.
 *
 * Both lines live in the *label* slot rather than using the icon slot for the
 * glyph. The icon container is narrower than a tab, which wrapped the
 * three-character names (見聞色, 武装色) onto a second line straight through the
 * English underneath. It also renders a placeholder when handed no icon, which
 * is what plain mode needs to avoid.
 *
 * Plain mode ships an empty glyph, so the tab collapses to the English word
 * alone with no second layout.
 *
 * Conqueror's (覇王色) is deliberately absent until v2 builds something to put
 * in it. Empty placeholder tabs are the classic unfinished-project smell, and
 * this app of all apps cannot afford it.
 */
export default function TabsLayout() {
  const { t } = useHaki();

  const options = (tab: Tab, headerTitle: string) => ({
    title: tab.label,
    headerTitle,
    tabBarLabel: ({ color: tint }: { color: ColorValue }) => (
      <View style={styles.tab}>
        {tab.glyph ? (
          <Text numberOfLines={1} style={[styles.glyph, { color: tint }]}>
            {tab.glyph}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={[styles.label, { color: tint }]}>
          {tab.label}
        </Text>
      </View>
    ),
  });

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.ink,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: color.bg },
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.line,
          paddingTop: space.sm,
        },
        tabBarActiveTintColor: color.violet,
        tabBarInactiveTintColor: color.inkFaint,
        // The label carries everything; an empty icon slot would still reserve
        // space and, given no icon, render a placeholder glyph.
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={options(t.tabs.home, t.appName)} />
      <Tabs.Screen name="log" options={options(t.tabs.log, t.logTitle)} />
      <Tabs.Screen name="training" options={options(t.tabs.training, t.trainingTitle)} />
      <Tabs.Screen name="carried" options={options(t.tabs.carried, t.carriedTitle)} />
      <Tabs.Screen name="settings" options={options(t.tabs.settings, t.tabs.settings.label)} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tab: { alignItems: 'center', justifyContent: 'center', width: '100%', gap: 1 },
  glyph: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  label: { fontSize: 10, lineHeight: 13, letterSpacing: 0.2, fontWeight: '600' },
});
