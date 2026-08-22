import { Tabs } from 'expo-router';
import { GlassTabBar } from '../../src/components/GlassTabBar';
import { useHaki } from '../../src/state/HakiProvider';
import { color, font } from '../../src/theme/tokens';

/**
 * Five tabs, rendered by the floating glass bar in `GlassTabBar`.
 *
 * The header is transparent and the scene runs underneath it, so the dark
 * ground is continuous from the status bar to the home indicator.
 *
 * Conqueror's (覇王色) is deliberately absent until v2 builds something to put
 * in it. Empty placeholder tabs are the classic unfinished-project smell, and
 * this app of all apps cannot afford it.
 */
export default function TabsLayout() {
  const { t } = useHaki();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerShadowVisible: false,
        headerTintColor: color.ink,
        headerTitleStyle: { fontFamily: font.displayBold, fontSize: 20, letterSpacing: -0.4 },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.tabs.home.label, headerTitle: t.appName }}
      />
      <Tabs.Screen name="log" options={{ title: t.tabs.log.label, headerTitle: t.logTitle }} />
      <Tabs.Screen
        name="training"
        options={{ title: t.tabs.training.label, headerTitle: t.trainingTitle }}
      />
      <Tabs.Screen
        name="carried"
        options={{ title: t.tabs.carried.label, headerTitle: t.carriedTitle }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t.tabs.settings.label, headerTitle: t.tabs.settings.label }}
      />
    </Tabs>
  );
}
