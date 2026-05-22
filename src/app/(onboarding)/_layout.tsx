// @ts-nocheck
import { Stack } from 'expo-router'
import React from 'react'

export default function OnboardingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/otp" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/google-onboarding" />
            <Stack.Screen name="worker" />
            <Stack.Screen name="all-set" />
        </Stack>
    )
}
