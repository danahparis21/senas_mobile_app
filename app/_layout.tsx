import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider } from '../contexts/SettingsContext';
import { NetworkAlertProvider } from '../contexts/NetworkAlertContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { CustomAlertModal } from '../components/CustomAlertModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initErrorHandler } from '../utils/errorHandler';

export default function RootLayout() {
  useEffect(() => {
    initErrorHandler();
  }, []);

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <NetworkAlertProvider>
          <StatusBar style="dark" />
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

