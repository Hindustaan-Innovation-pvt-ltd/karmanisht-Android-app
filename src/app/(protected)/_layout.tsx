// @ts-nocheck
import { Stack } from 'expo-router'
import React from 'react'

export default function ProtectedLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="worker" />
            <Stack.Screen name="consumer" />
        </Stack>
    )
}
