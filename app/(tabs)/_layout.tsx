import { Tabs } from 'expo-router';
import { GlassTabBar } from '../../src/components/GlassTabBar';
import { useHaki } from '../../src/state/HakiProvider';

/**
 * Five tabs, rendered by the floating glass bar in `GlassTabBar`.
 *
 * **No header on any of them.** It used to say the tab's name in a fixed band
 * across the top — 64pt on the web, about 103 on an iPhone once the notch
 * inset was added, on every screen, for one word that never changed. The band
 * was painted in the ground colour so it looked continuous, and it was still a
 * twelfth of the display nobody could use.
 *
 * Each screen carries its own title in its scroll content instead
 * (`PageHeading`), which scrolls away, and pads its top by the notch itself
 * (`useTabInsets`). So the scene starts at y=0 and the ground genuinely runs
 * from the top of the display to the home indicator rather than merely
 * appearing to.
 *
 * `title` stays: the bar reads it for each tab's accessible name.
 *
 * Conqueror's (覇王色) is deliberately absent until v2 builds something to put
 * in it. Empty placeholder tabs are the classic unfinished-project smell, and
 * this app of all apps cannot afford it.
 */
export default function TabsLayout() {
  const { t, palette } = useHaki();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home.label }} />
      <Tabs.Screen name="log" options={{ title: t.tabs.log.label }} />
      <Tabs.Screen name="training" options={{ title: t.tabs.training.label }} />
      <Tabs.Screen name="carried" options={{ title: t.tabs.carried.label }} />
      <Tabs.Screen name="settings" options={{ title: t.tabs.settings.label }} />
    </Tabs>
  );
}
