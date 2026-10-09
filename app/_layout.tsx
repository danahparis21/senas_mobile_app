import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider } from '../contexts/SettingsContext';
import { NetworkAlertProvider } from '../contexts/NetworkAlertContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { CustomAlertModal } from '../components/CustomAlertModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initErrorHandler } from '../utils/errorHandler';
import { api } from '../services/api';
import {
  getExpoPushToken,
  cacheExpoPushToken,
  subscribeToNotificationResponses,
  getLastNotificationUrl,
} from '../services/pushNotifications';

function DeviceNotificationManager() {
  const router = useRouter();

  useEffect(() => {
    const registerDevice = async () => {
      try {
        const sessionToken = await AsyncStorage.getItem('userToken');
        if (!sessionToken) return;

        const token = await getExpoPushToken();
        if (!token) return;

        await api.registerPushToken(token);
        await cacheExpoPushToken(token);
      } catch (error) {
        // Device push must never prevent the app itself from working.
        console.warn('Push notification registration was skipped:', error);
      }
    };

    registerDevice();

    const unsubscribe = subscribeToNotificationResponses((actionUrl) => {
      if (typeof actionUrl === 'string' && actionUrl.startsWith('/')) {
        router.push(actionUrl as any);
      }
    });

    const lastUrl = getLastNotificationUrl();
    if (typeof lastUrl === 'string' && lastUrl.startsWith('/')) {
      router.push(lastUrl as any);
    }

    return () => {
      unsubscribe();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    initErrorHandler();
  }, []);

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <NetworkAlertProvider>
          <StatusBar style="dark" />
          <DeviceNotificationManager />
          <OfflineBanner />
          <CustomAlertModal />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="role" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="assessment" />
            <Stack.Screen name="tutorial" />
            <Stack.Screen name="lesson/[id]" />
            <Stack.Screen name="quiz/mc" />
            <Stack.Screen name="quiz/dnd" />
            <Stack.Screen name="gesture/alphabet1" options={{ headerShown: false }} />
            <Stack.Screen name="gesture/alphabet2" options={{ headerShown: false }} />
            <Stack.Screen name="gesture/webview-camera" options={{ headerShown: false }} />
            <Stack.Screen name="gesture/webview-greetings" options={{ headerShown: false }} />
            <Stack.Screen name="gesture/level2-gestures" options={{ headerShown: false }} />
            <Stack.Screen name="gesture/level3-gestures" options={{ headerShown: false }} />
          </Stack>
        </NetworkAlertProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
