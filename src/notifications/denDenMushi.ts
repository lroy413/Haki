/**
 * Den Den Mushi — the notification layer.
 *
 * Canon already contains a complete notification hierarchy, so v0 uses the two
 * channels it actually needs and leaves the rest declared for later:
 *
 *   Regular  — ordinary nudges. Daily Read reminder, keystone warnings.
 *   Black    — passive logging. Records, never notifies. (v1)
 *   White    — privacy mode. Records nothing. (v1)
 *   Baby     — background sync from a watch or health app. (v2)
 *   Golden   — Buster Call. One trigger only: a crisis pattern in the Sea
 *              Prism Log. Fires maybe twice a year, which is exactly why it
 *              will never be ignored. (v3, with the Sea Prism Log)
 *
 * Drop a `denden.wav` into `assets/sounds/` and set it in app.json to get the
 * purupuru. Without it the channel falls back to the system default — the app
 * works either way, it just sounds like everything else.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CascadeVerdict } from '../domain/cascade';

export const CHANNEL_REGULAR = 'den-den-regular';

const KEYSTONE_TAG = 'keystone-warning';

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_REGULAR, {
      name: 'Den Den Mushi',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#B14CFF',
      // sound: 'denden.wav',  // uncomment once the file is in assets/sounds
    });
  }
}

/** Ask once. A refusal is respected — the app works fully without notifications. */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * Keep the keystone warning in sync with the current verdict.
 *
 * Idempotent: it clears any previous warning before posting, so re-running on
 * every refresh cannot stack duplicates. A cleared breach removes the notice
 * rather than leaving a stale alarm sitting in the tray.
 */
export async function syncKeystoneWarning(verdict: CascadeVerdict): Promise<void> {
  try {
    await configureNotifications();

    const existing = await Notifications.getPresentedNotificationsAsync();
    for (const notification of existing) {
      if (notification.request.content.data?.tag === KEYSTONE_TAG) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }

    if (verdict.level !== 'breach' || !verdict.message) return;

    const granted = await requestPermission();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Keystone slipping',
        body: verdict.message,
        data: { tag: KEYSTONE_TAG },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_REGULAR } : {}),
      },
      trigger: null,
    });
  } catch {
    // Notifications are a convenience, never a dependency. If the platform
    // refuses, the same warning is still on the home screen.
  }
}
