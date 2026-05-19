import { Stack, useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAppStore } from '@/lib/store'
import { getOnboardingRoute } from '@/lib/utils'

export default function ProtectedLayout() {
    const router = useRouter()
    const user = useAppStore(state => state.user)
    const hasCheckedAuth = useAppStore(state => state.hasCheckedAuth)
    const isLoading = useAppStore(state => state.isLoading)

    useEffect(() => {
        if (!hasCheckedAuth || isLoading) return;

        const nextRoute = getOnboardingRoute(user);
        if (nextRoute && !nextRoute.startsWith('/(protected)')) {
            setTimeout(() => {
                router.replace(nextRoute as any);
            }, 0);
        }
    }, [user, hasCheckedAuth, isLoading, router])

    if (!hasCheckedAuth || isLoading) {
        return (
            <View className="flex-1 bg-white dark:bg-slate-950 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    const nextRoute = getOnboardingRoute(user);
    if (nextRoute && !nextRoute.startsWith('/(protected)')) {
        return (
            <View className="flex-1 bg-white dark:bg-slate-950 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="worker" />
            <Stack.Screen name="consumer" />
        </Stack>
    )
}
