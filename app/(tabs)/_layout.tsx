import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useHaki } from '../../src/state/HakiProvider';
import { color, space } from '../../src/theme/tokens';

/**
 * Four tabs, all of them real.
 *
 * Armament (武装色) and Conqueror's (覇王色) are deliberately absent until v1
 * and v2 build something to put in them. Empty placeholder tabs are the
 * classic unfinished-project smell, and this app of all apps cannot afford it.
 */
export default function TabsLayout() {
  const { t, plainMode } = useHaki();

  const icon = (glyph: string) => ({ color: tint }: { color: ColorValue }) => (
    <Text style={{ color: tint, fontSize: plainMode ? 11 : 15, fontWeight: '700' }}>{glyph}</Text>
  );

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
          height: 64,
          paddingTop: space.sm,
        },
        tabBarActiveTintColor: color.violet,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.tabHome, headerTitle: t.appName, tabBarIcon: icon(t.tabHome) }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: t.tabLog, headerTitle: t.logTitle, tabBarIcon: icon(t.tabLog) }}
      />
      <Tabs.Screen
        name="carried"
        options={{
          title: t.tabCarried,
          headerTitle: t.carriedTitle,
          tabBarIcon: icon(t.tabCarried),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t.tabSettings, headerTitle: t.tabSettings, tabBarIcon: icon(t.tabSettings) }}
      />
    </Tabs>
  );
}
