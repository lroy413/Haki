import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
} from '@expo-google-fonts/newsreader';
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import { StoreProvider } from '../src/db/client';
import { HakiProvider, useHaki } from '../src/state/HakiProvider';
import { AmbientHaki } from '../src/components/AmbientHaki';
import { ImpactLayer } from '../src/components/ImpactLayer';
import { ConquerorsLayer } from '../src/components/ConquerorsLayer';
import { font } from '../src/theme/tokens';

// Hold the splash until the faces are ready. Type is most of this app's
// identity; a flash of the system font on every cold start reads as cheap.
void SplashScreen.preventAutoHideAsync();

/**
 * The navigator, and everything about it that follows the palette.
 *
 * Split out from the root because the chrome has to sit *inside*
 * `HakiProvider` to read how far the day has hardened — a component cannot use
 * a context it is itself rendering.
 */
function Chrome() {
  const { palette, t, crew } = useHaki();

  // The theme-color meta — the strip behind the clock, now that the app
  // starts below the status bar — is owned by HakiProvider alone. This file
  // used to carry a second writer of the same value; two writers of one tag
  // is drift waiting for a palette to change shape.

  return (
    <>
      {/* On paper the status-bar icons have to be dark or they vanish. */}
      <StatusBar style={palette.lightSurface ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.bg },
          headerShadowVisible: false,
          headerTintColor: palette.ink,
          headerTitleStyle: { fontFamily: font.displayBold, fontSize: 20 },
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="read" options={{ presentation: 'modal', title: 'Daily Read' }} />
        <Stack.Screen
          name="session"
          options={{ presentation: 'modal', title: 'Log a session' }}
        />
        <Stack.Screen name="entry/[id]" options={{ title: '' }} />
        {/* No header and no back arrow: leaving is the Ease off button, which
            has to be a deliberate press rather than a stray swipe. */}
        <Stack.Screen name="gear" options={{ headerShown: false, gestureEnabled: false }} />
        {/* A sit keeps its header: unlike a gear it has no cost to abandon,
            so backing out of one needs no ceremony. */}
        <Stack.Screen name="sit" options={{ title: t.stillnessTitle }} />
        {/* The Gears' waiting room — off the Armament tab, ahead of the
            ability page. See the note at the top of app/gears.tsx. */}
        <Stack.Screen
          name="gears"
          options={{ title: crew.name === 'zoro' ? t.stylesTitle : t.gearsTitle }}
        />
        {/* The workshop behind the day's offers. See app/rhythms.tsx. */}
        <Stack.Screen name="rhythms" options={{ title: t.rhythmTitle }} />
        {/* The weekly ritual. See app/sail.tsx. */}
        <Stack.Screen name="sail" options={{ title: t.sailTitle }} />
        {/* 未来視 — the full readout and its method. See app/foresight.tsx. */}
        <Stack.Screen name="foresight" options={{ title: t.foresightTitle }} />
        <Stack.Screen name="course" options={{ presentation: 'modal', title: t.courseTitle }} />
        {/* One Road Poneglyph. The title is set from the pillar itself once
            it loads, so the header carries its name rather than a category. */}
        <Stack.Screen name="pillar" options={{ title: '' }} />
        <Stack.Screen name="flag" options={{ title: t.flagTitle }} />
        {/* 不変 — the one bearing. See app/eternal.tsx. */}
        <Stack.Screen name="eternal" options={{ title: t.eternalTitle }} />
        <Stack.Screen name="carried" options={{ title: t.carriedTitle }} />
        <Stack.Screen name="bells" options={{ title: t.bellsTitle }} />
        <Stack.Screen name="dayend" options={{ title: t.dayEndTitle }} />
        {/* Loose pages — writing that is not about a day. See app/notes.tsx. */}
        <Stack.Screen name="notes" options={{ title: t.notesTitle }} />
        <Stack.Screen name="note/[id]" options={{ title: '' }} />
        {/* The settings archipelago — six islands off the settings chart,
            each a page. See app/(tabs)/settings.tsx. */}
        <Stack.Screen name="crew" options={{ title: t.crewTitle }} />
        <Stack.Screen name="quiet" options={{ title: t.quietTitle }} />
        <Stack.Screen name="daybreak" options={{ title: t.dayTurnTitle }} />
        <Stack.Screen name="keystone" options={{ title: t.keystoneTitle }} />
        <Stack.Screen name="training" options={{ title: t.trainingTitle }} />
        <Stack.Screen name="data" options={{ title: t.dataTitle }} />
      </Stack>
      {/* The weather, over the content and under the frame: distant sky
          rather than interface. Silent until the day hardens. */}
      <AmbientHaki />
      {/* Above everything, including the tab bar: an impact frame is the whole
          screen or it is nothing. */}
      <ImpactLayer />
      {/* 覇王色, and the only thing that fires it is an island reached on the
          Log Pose. Above even the impact frame — nothing outranks this, and
          the two can only meet if a task is struck in the same second. */}
      <ConquerorsLayer />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    // A font that fails to load is not worth a blank screen — fall back to the
    // system face and let the app open.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <HakiProvider>
          <Chrome />
        </HakiProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
