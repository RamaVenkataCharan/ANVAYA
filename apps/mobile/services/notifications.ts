import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

// Configure how notifications are presented when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests push notification permissions and retrieves the Expo Push Token.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    token = pushTokenData.data;
  } catch (error) {
    // When running in simulator or environment without push credentials, silently handle
    console.log('[PushNotifications] Could not get push token:', error);
  }

  return token;
}

/**
 * Registers the device push token with the ANVAYA backend for the logged-in user.
 */
export async function registerPushTokenWithBackend(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await api.post('/users/push-token', { token });
      console.log('[PushNotifications] Push token registered successfully with ANVAYA');
    }
  } catch (err: any) {
    console.log('[PushNotifications] Failed to save token on backend:', err.message);
  }
}
