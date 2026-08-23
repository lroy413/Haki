import { useEffect } from 'react';
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
  const { palette } = useHaki();
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
      </Stack>
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
