// @ts-nocheck
import React, { useEffect } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAppContext } from '@/lib/context'

export default function Index() {
    const router = useRouter()
    const { user, isLoading, hasCheckedAuth, isSessionExpired } = useAppContext()

    console.log(user);
    

    useEffect(() => {
        if (hasCheckedAuth && !isLoading) {
            // Authenticated
            if (user?.id) {
                if (user.role === 'admin' || user.phone === '9999999999' || user.phone === '999999999' || user.phone === '+919999999999' || user.phone === '+91999999999') {
                    router.replace('/admin')
                } else if (user.role === 'worker') {
                    router.replace('/(protected)/worker')
                } else if (user.role === 'consumer') {
                    router.replace('/(protected)/consumer')
                } else {
                    router.replace('/(onboarding)/auth/register')
                }
            } 
            // Case 2: Session Expired
            else if (isSessionExpired) {
                router.replace('/(onboarding)/auth/login')
            }
        }
    }, [isLoading, hasCheckedAuth, isSessionExpired, router, user?.id, user?.role, user?.phone])

    if (isLoading) return null

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
                        <Text className='text-xl font-bold text-white'>
                            Log In
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className='bg-white border-2 border-black dark:border-slate-700 py-5 rounded-2xl items-center'
                        activeOpacity={0.8}
                        onPress={() => router.push('/(onboarding)/auth/register')}
                    >
                        <Text className='text-xl font-bold text-black dark:text-white'>
                            Sign Up
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    )
}