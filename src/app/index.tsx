// @ts-nocheck
import React, { useEffect } from 'react'
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/lib/store'
import { getOnboardingRoute } from '@/lib/utils'
import { LinearGradient } from 'expo-linear-gradient'

const BackgroundPattern = () => {
    return (
        <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Green Track - Top Right (top-first.png) */}
            <View style={{ position: 'absolute', top: 0, right: 15, width: '74%', height: 120 }}>
                <Image
                    source={require('@assets/images/top-first.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="stretch"
                />
                <Image
                    source={require('@assets/images/leaf.png')}
                    style={{ position: 'absolute', left: 30, bottom: 18, width: 36, height: 36 }}
                    resizeMode="contain"
                />
            </View>

            {/* Red Track - Upper Middle Left (second.png) */}
            <View style={{ position: 'absolute', top: '2%', left: 0, width: '68%', height: 220}}>
                <Image
                    source={require('@assets/images/second.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="stretch"
                />
                <Image
                    source={require('@assets/images/wheel.png')}
                    style={{ position: 'absolute', right: 30, bottom: 18, width: 36, height: 36 }}
                    resizeMode="contain"
                />
            </View>

            {/* Blue Track - Middle Right (third.png) */}
            <View style={{ position: 'absolute', top: '52%', left: 50, right: 1, height: 400 }}>
                <Image
                    source={require('@assets/images/third.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="stretch"
                />
                <Image
                    source={require('@assets/images/fan.png')}
                    style={{ position: 'absolute', left: 30, top: 26, width: 36, height: 36 }}
                    resizeMode="contain"
                />
            </View>

            {/* Yellow Track - Lower Left (forth.png) */}
            <View style={{ position: 'absolute', top: '75%', left: 0, width: '74%', height: 350 }}>
                <Image
                    source={require('@assets/images/forth.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="stretch"
                />
                <Image
                    source={require('@assets/images/elect.png')}
                    style={{ position: 'absolute', right: 30, top: 22, width: 36, height: 36 }}
                    resizeMode="contain"
                />
            </View>
        </View>
    )
}

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
                setTimeout(() => {
                    router.replace(nextRoute as any);
                }, 0);
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
            <View className='flex-1 opacity-90 dark:opacity-60'>
                <BackgroundPattern />
            </View>
            <View className='p-6'>
                <View className='items-center mb-8'>
                    <Image
                        source={require('@assets/images/logo.png')}
                        style={{ width: 100, height: 100, marginBottom: 16 }}
                        resizeMode="contain"
                    />
                    <Text className='text-5xl font-black text-center text-slate-900 dark:text-slate-100'>Karmanisht</Text>
                    <Text className='text-base font-bold text-center text-slate-500 dark:text-slate-400 mt-2'>Every service you need, at your screen</Text>
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