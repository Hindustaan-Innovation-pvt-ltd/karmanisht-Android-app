// @ts-nocheck
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "./global.css"
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';

// Suppress ExpoKeepAwake uncaught promise rejections on Android during startup/activity recreation
if (__DEV__) {
  try {
    const rejectionTracking = require('promise/setimmediate/rejection-tracking');
    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (id, error) => {
        const message = error?.message || (typeof error === 'string' ? error : '');
        if (message.includes('ExpoKeepAwake') || message.includes('KeepAwake')) {
          return;
        }
        console.warn(`[Unhandled Promise Rejection] ID: ${id}`, error);
      },
      onHandled: () => {},
    });
  } catch (e) {
    // Ignore if rejection tracking module is not available
  }
}

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const refreshProfile = useAppStore(state => state.refreshProfile);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(location)" />
          <Stack.Screen name="(protected)" />
          <Stack.Screen name="admin/index" />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? "light" : "dark"} backgroundColor={colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

