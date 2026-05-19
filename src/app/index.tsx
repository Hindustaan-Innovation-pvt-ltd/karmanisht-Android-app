// @ts-nocheck
import React, { useEffect } from 'react'
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/lib/store'
import { getOnboardingRoute } from '@/lib/utils'

export default function Index() {
    const router = useRouter()
    const user = useAppStore(state => state.user)
    const isLoading = useAppStore(state => state.isLoading)
    const hasCheckedAuth = useAppStore(state => state.hasCheckedAuth)

    useEffect(() => {
        if (!hasCheckedAuth || isLoading) return;

        if (user?.id) {
            const nextRoute = getOnboardingRoute(user);
            if (nextRoute) {
                router.replace(nextRoute as any);
            }
        }
        // If no user, fall through and render the landing page below
    }, [isLoading, hasCheckedAuth, user, router])

    // Show a spinner while checking auth on app boot
    if (isLoading) {
        return (
            <View className='flex-1 bg-white dark:bg-slate-950 items-center justify-center'>
                <ActivityIndicator size="large" color="#000" />
            </View>
        )
    }

    // User is not logged in — show the landing / welcome screen
    if (user?.id) return null

    return (
        <SafeAreaView className='flex-1 relative bg-white dark:bg-slate-950'>
            <View className='flex-1 opacity-80 dark:opacity-60'>
                <Image
                    source={require('@assets/images/firstBg.png')}
                    className='w-full h-full'
                    resizeMode="cover"
                />
            </View>
            <View className='p-6'>
                <View className='space-y-2'>
                    <Text className='text-6xl font-black text-center text-slate-900 dark:text-slate-100'>Utility</Text>
                    <Text className='text-lg font-bold text-center text-slate-600 dark:text-slate-400'>Every service you need, at your screen</Text>
                </View>

                <View className='gap-4 mt-8'>
                    <TouchableOpacity
                        className='bg-black dark:bg-slate-800 py-5 rounded-2xl items-center'
                        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        activeOpacity={0.8}
                        onPress={() => router.push('/(onboarding)/auth/login')}
                    >
                        <Text className='text-xl font-bold text-white'>Log In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className='bg-white border-2 border-black dark:border-slate-700 py-5 rounded-2xl items-center'
                        activeOpacity={0.8}
                        onPress={() => router.push('/(onboarding)/auth/register')}
                    >
                        <Text className='text-xl font-bold text-black dark:text-white'>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    )
}