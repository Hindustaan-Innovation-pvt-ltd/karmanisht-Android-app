import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="info" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="help" />
    </Stack>
  );
}
