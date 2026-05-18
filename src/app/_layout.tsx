// @ts-nocheck
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "./global.css"
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/lib/context';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AppProvider>
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
      </AppProvider>
    </SafeAreaProvider>
  );
}

