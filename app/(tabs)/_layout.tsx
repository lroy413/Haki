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
 * The three lenses are the three tools, in canon's own order, and each tab is
 * labelled with its lens: 見聞色 Observation is the mental-health space (the
 * journal, the sits, the reading), 武装色 Armament is the productivity one
 * (tasks, workouts, the schedule), 覇王色 Conqueror's is the dreams. Inherited
 * Will lives inside Conqueror's rather than in a drawer of its own, which
 * keeps this at five tabs. Gears are on neither: Haki is will and a Devil
 * Fruit is ability, so they wait on a pushed screen for the ability page to
 * form.
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
      <Tabs.Screen name="observation" options={{ title: t.tabs.observation.label }} />
      <Tabs.Screen name="armament" options={{ title: t.tabs.armament.label }} />
      <Tabs.Screen name="conquerors" options={{ title: t.tabs.conquerors.label }} />
      <Tabs.Screen name="settings" options={{ title: t.tabs.settings.label }} />
    </Tabs>
  );
}
