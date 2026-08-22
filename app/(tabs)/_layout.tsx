import { Tabs } from 'expo-router';
import { useHaki } from '../../src/state/HakiProvider';
import { color, space } from '../../src/theme/tokens';

/**
 * Five tabs, all of them real.
 *
 * Conqueror's (覇王色) is deliberately absent until v2 builds something to put
 * in it. Empty placeholder tabs are the classic unfinished-project smell, and
 * this app of all apps cannot afford it.
 */
export default function TabsLayout() {
  const { t, plainMode } = useHaki();

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
        // The kanji IS the label — no icon, or it renders twice.
        tabBarLabelStyle: { fontSize: plainMode ? 11 : 15, fontWeight: '700', letterSpacing: 0.5 },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.tabHome, headerTitle: t.appName }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: t.tabLog, headerTitle: t.logTitle }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: t.tabTraining,
          headerTitle: t.trainingTitle,
        }}
      />
      <Tabs.Screen
        name="carried"
        options={{
          title: t.tabCarried,
          headerTitle: t.carriedTitle,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t.tabSettings, headerTitle: t.tabSettings }}
      />
    </Tabs>
  );
}
