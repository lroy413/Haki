import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../src/db/client';
import { HakiProvider } from '../src/state/HakiProvider';
import { color } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <HakiProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: color.bg },
              headerTintColor: color.ink,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: color.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="read"
              options={{ presentation: 'modal', title: 'Daily Read' }}
            />
            <Stack.Screen
              name="session"
              options={{ presentation: 'modal', title: 'Log a session' }}
            />
            <Stack.Screen name="entry/[id]" options={{ title: '' }} />
          </Stack>
        </HakiProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
