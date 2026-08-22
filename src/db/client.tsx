import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { bootstrap } from './bootstrap';
import { loadSettings, type Settings } from './settings';
import type { Db } from './repo';

export const DATABASE_NAME = 'haki.db';

type HakiStore = {
  db: Db;
  settings: Settings;
  /** Re-read settings after a change. */
  refreshSettings: () => Promise<void>;
};

const StoreContext = createContext<HakiStore | null>(null);

export function useStore(): HakiStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

export function useDb(): Db {
  return useStore().db;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const native = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await bootstrap(native);
        const drizzled = drizzle(native) as Db;
        const loaded = await loadSettings(drizzled);
        if (cancelled) return;
        setDb(drizzled);
        setSettings(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSettings = useCallback(async () => {
    if (!db) return;
    setSettings(await loadSettings(db));
  }, [db]);

  const value = useMemo(
    () => (db && settings ? { db, settings, refreshSettings } : null),
    [db, settings, refreshSettings],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>The database would not open.</Text>
        <Text style={styles.errorBody}>{error.message}</Text>
      </View>
    );
  }

  if (!value) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0A0B12',
    gap: 8,
  },
  errorTitle: { color: '#E9E7F3', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  errorBody: { color: '#9E9BB7', fontSize: 13, textAlign: 'center' },
});
