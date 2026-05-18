import { useAppContext } from '@/lib/context';
// @ts-nocheck
import React from 'react'
import { Text, TouchableOpacity, View, Image } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { UsersIcon, BriefcaseIcon, ChevronRightIcon } from '@/svg/icons'

export default function RoleSelection() {
    const { user, setUser, updateDatabaseProfile, refreshProfile, unlockedContacts, unlockedProviders, isUnlocked, unlockWorker, isOnline, setOnline, toggleOnlineStatus, isLoading, hasCheckedAuth, isSessionExpired, categories, userLocation, fetchCategories, sessionToken, workerStats, handleRazorpayPayment, updateProfile, updateWorkerSpecialties, signOut } = useAppContext();


    const router = useRouter()
    
    const handleSelectRole = (role: 'consumer' | 'worker') => {
        setUser({ role })
        router.push({
            pathname: '/(onboarding)/auth/register',
            params: { role }
        })
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <View className='p-6 pt-12'>
                    <Text className='text-3xl font-black text-slate-900 dark:text-slate-100'>Welcome to Utility</Text>
                    <Text className='text-lg text-slate-500 mt-2'>How would you like to use the app today?</Text>
                </View>

                <View className='flex-1 px-6 justify-center gap-6'>
                    {/* Consumer Option */}
                    <TouchableOpacity
                        onPress={() => handleSelectRole('consumer')}
                        activeOpacity={0.8}
                        className='bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex-row items-center gap-4'
                    >
                        <View className='bg-blue-100 dark:bg-blue-900/35 p-4 rounded-2xl'>
                            <UsersIcon size={32} color="#3B82F6" />
                        </View>
                        <View className='flex-1'>
                            <Text className='text-xl font-bold text-slate-900 dark:text-slate-100'>I want to hire</Text>
                            <Text className='text-sm text-slate-500 dark:text-slate-400 mt-1'>Find skilled professionals for your home or office services.</Text>
                        </View>
                        <ChevronRightIcon size={20} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Worker Option */}
                    <TouchableOpacity
                        onPress={() => handleSelectRole('worker')}
                        activeOpacity={0.8}
                        className='bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex-row items-center gap-4'
                    >
                        <View className='bg-green-100 dark:bg-green-900/35 p-4 rounded-2xl'>
                            <BriefcaseIcon size={32} color="#10B981" />
                        </View>
                        <View className='flex-1'>
                            <Text className='text-xl font-bold text-slate-900 dark:text-slate-100'>I want to work</Text>
                            <Text className='text-sm text-slate-500 dark:text-slate-400 mt-1'>List your services and get hired by customers in your area.</Text>
                        </View>
                        <ChevronRightIcon size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                <View className='p-6 items-center'>
                    <Text className='text-slate-400 text-sm text-center dark:text-slate-500'>
                        Logged in as <Text className='text-slate-600 dark:text-slate-350 font-bold'>{user?.name || user?.phone || "Guest"}</Text>
                    </Text>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}

