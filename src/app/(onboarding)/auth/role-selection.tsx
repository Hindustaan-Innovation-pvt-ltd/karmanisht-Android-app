// @ts-nocheck
import React from 'react'
import { Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { UsersIcon, BriefcaseIcon, ChevronRightIcon } from '@/svg/icons'
import ScalePressable from '@/components/scale-pressable'
import { useAppStore } from '@/lib/store'
import { useTranslation } from 'react-i18next'

export default function RoleSelection() {
    const { t } = useTranslation();
    const user = useAppStore(state => state.user);
    const setUser = useAppStore(state => state.setUser);

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
                    <Text className='text-3xl font-black text-slate-900 dark:text-slate-100'>{t('welcomeToUtility')}</Text>
                    <Text className='text-lg text-slate-500 mt-2'>{t('howUseAppToday')}</Text>
                </View>

                <View className='flex-1 px-6 justify-center gap-6'>
                    {/* Consumer Option */}
                    <ScalePressable
                        onPress={() => handleSelectRole('consumer')}
                        hapticType="medium"
                        scaleTo={0.96}
                        className='bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex-row items-center gap-4'
                    >
                        <View className='bg-blue-100 dark:bg-blue-900/35 p-4 rounded-2xl'>
                            <UsersIcon size={32} color="#3B82F6" />
                        </View>
                        <View className='flex-1'>
                            <Text className='text-xl font-bold text-slate-900 dark:text-slate-100'>{t('iWantToHire')}</Text>
                            <Text className='text-sm text-slate-500 dark:text-slate-400 mt-1'>{t('findSkilledProfessionals')}</Text>
                        </View>
                        <ChevronRightIcon size={20} color="#94A3B8" />
                    </ScalePressable>

                    {/* Worker Option */}
                    <ScalePressable
                        onPress={() => handleSelectRole('worker')}
                        hapticType="medium"
                        scaleTo={0.96}
                        className='bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex-row items-center gap-4'
                    >
                        <View className='bg-green-100 dark:bg-green-900/35 p-4 rounded-2xl'>
                            <BriefcaseIcon size={32} color="#10B981" />
                        </View>
                        <View className='flex-1'>
                            <Text className='text-xl font-bold text-slate-900 dark:text-slate-100'>{t('iWantToWork')}</Text>
                            <Text className='text-sm text-slate-500 dark:text-slate-400 mt-1'>{t('listYourServices')}</Text>
                        </View>
                        <ChevronRightIcon size={20} color="#94A3B8" />
                    </ScalePressable>
                </View>

                <View className='p-6 items-center'>
                    <Text className='text-slate-400 text-sm text-center dark:text-slate-500'>
                        {t('loggedInAs', { user: user?.name || user?.phone || t('guest') })}
                    </Text>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
