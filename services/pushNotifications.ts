import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = 'expoPushToken';

/**
 * Expo SDK 53+ removed remote push notifications from the Expo Go store app.
 * We detect if we are in Expo Go or if native modules are not linked, so the
 * app runs smoothly during development without crashing.
 */
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('[PushNotifications] expo-notifications native module not available:', error);
    Notifications = null;
  }

  try {
    Device = require('expo-device');
  } catch (error) {
    console.warn('[PushNotifications] expo-device native module not available:', error);
    Device = null;
  }
} else if (isExpoGo) {
  console.log('ℹ️ Running in Expo Go: Push notifications are disabled here (SDK 53+). They will activate when running a development or production build.');
}

/**
 * Requests native-notification permission and returns this installation's
 * Expo push token. The caller is responsible for securely saving it to the
 * authenticated student's account on the API.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (isExpoGo || Platform.OS === 'web' || !Notifications || !Device || !Device.isDevice) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SEÑAS notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0F3172',
      });
    }

    const permissions = await Notifications.getPermissionsAsync();
    let status = permissions.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }

    if (status !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[PushNotifications] Expo project ID is missing; skipping push registration.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.warn('[PushNotifications] Failed to retrieve Expo push token:', error);
    return null;
  }
}

/**
 * Listens for user taps on received push notifications.
 * Safe to call even in Expo Go or web (graceful no-op).
 */
export function subscribeToNotificationResponses(onActionUrl: (url: string) => void): () => void {
  if (!Notifications || typeof Notifications.addNotificationResponseReceivedListener !== 'function') {
    return () => {};
  }

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      let actionUrl = data?.action_url;
      if (data?.lesson_id && (!actionUrl || actionUrl === '/lessons')) {
        actionUrl = `/(tabs)/lessons?tab=modules&lessonId=${data.lesson_id}${data.module_id ? `&moduleId=${data.module_id}` : ''}`;
      }
      if (typeof actionUrl === 'string') {
        onActionUrl(actionUrl);
      }
    });

    return () => {
      subscription.remove();
    };
  } catch (error) {
    console.warn('[PushNotifications] Failed to add notification response listener:', error);
    return () => {};
  }
}

/**
 * Returns any notification action url from a cold-launch notification tap.
 * Safe to call even in Expo Go or web (returns null).
 */
export function getLastNotificationUrl(): string | null {
  if (!Notifications || typeof Notifications.getLastNotificationResponse !== 'function') {
    return null;
  }

  try {
    const lastResponse = Notifications.getLastNotificationResponse();
    const data = lastResponse?.notification.request.content.data;
    let actionUrl = data?.action_url;
    if (data?.lesson_id && (!actionUrl || actionUrl === '/lessons')) {
      actionUrl = `/(tabs)/lessons?tab=modules&lessonId=${data.lesson_id}${data.module_id ? `&moduleId=${data.module_id}` : ''}`;
    }
    return typeof actionUrl === 'string' ? actionUrl : null;
  } catch (error) {
    console.warn('[PushNotifications] Failed to get last notification response:', error);
    return null;
  }
}

export async function cacheExpoPushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

export async function getCachedExpoPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function clearCachedExpoPushToken(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}
