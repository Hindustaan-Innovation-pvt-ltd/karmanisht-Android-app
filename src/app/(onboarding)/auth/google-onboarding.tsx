// @ts-nocheck
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAppStore } from '@/lib/store'
import { UserIcon, BriefcaseIcon, ClockIcon } from '@/svg/icons'
import ScalePressable from '@/components/scale-pressable'
import { useTranslation } from 'react-i18next'

type Role = 'worker' | 'consumer'

export default function GoogleOnboarding() {
    const { t } = useTranslation();
    const router = useRouter()
    const { updateDatabaseProfile, refreshProfile, signOut } = useAppStore()
    const colorScheme = useColorScheme()
    const isDark = colorScheme === 'dark'

    const {
        prefilledName,
        prefilledEmail,
        prefilledUserId,
    } = useLocalSearchParams<{
        prefilledName?: string,
        prefilledEmail?: string,
        prefilledUserId?: string,
    }>()

    const fullName = prefilledName || t('guest')
    const [role, setRole] = useState<Role | null>(null)
    const [experience, setExperience] = useState('')
    const [loading, setLoading] = useState(false)

    const canSubmit =
        role !== null &&
        (role === 'consumer' || experience.trim().length > 0)

    const handleCompleteOnboarding = async () => {
        if (!canSubmit) return;

        setLoading(true);
        try {
            const userId = prefilledUserId || useAppStore.getState().user.id;
            if (!userId) {
                throw new Error('User session not found. Please log in again.');
            }

            await updateDatabaseProfile({
                id: userId,
                name: fullName,
                email: prefilledEmail || undefined,
                phone: '', // Auto-generates placeholder google-${userId} in authSlice
                role: role!,
                experienceYears: role === 'worker' ? parseInt(experience) || 0 : undefined,
                experience: role === 'worker' ? `${experience} yrs` : undefined,
                isGoogleUser: true
            });

            await refreshProfile();

            // Direct route to location setup first
            router.replace('/(location)/locationinfo');
        } catch (err: any) {
            Alert.alert(t('onboardingError'), err.message || t('failedCompleteReg'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        Alert.alert(
            t('cancelOnboarding'),
            t('cancelOnboardingMsg'),
            [
                { text: t('no'), style: "cancel" },
                {
                    text: t('yesSignOut'),
                    onPress: async () => {
                        await signOut();
                        router.replace('/(onboarding)/auth/login');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
            {/* Header / Cancel bar */}
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-slate-100 dark:border-slate-900">
                <Text className="text-xl font-black text-slate-900 dark:text-slate-100">{t('setupAccount')}</Text>
                <TouchableOpacity onPress={handleCancel} className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('logout')}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                className='flex-1'
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={8}
            >
                <ScrollView
                    className='flex-1'
                    contentContainerStyle={{ padding: 24, gap: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View>
                        <Text className='text-3xl font-black text-slate-900 dark:text-white leading-tight'>
                            {t('welcomeName', { name: fullName })}
                        </Text>
                        <Text className='text-sm text-slate-500 mt-2 font-medium'>
                            {t('completeRegSelectRole')}
                        </Text>
                    </View>

                    {/* Role Selection */}
                    <View className='gap-3'>
                        <Text className='text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest'>{t('howWillYouUse')}</Text>
                        <View className='flex-row gap-4'>
                            {/* Worker */}
                            <TouchableOpacity
                                onPress={() => setRole('worker')}
                                activeOpacity={0.8}
                                className={`flex-1 p-5 rounded-3xl border-2 ${role === 'worker' ? 'border-black dark:border-blue-500 bg-slate-50 dark:bg-slate-900/60' : 'border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900'}`}
                            >
                                <View className={`size-12 rounded-2xl items-center justify-center mb-3 ${role === 'worker' ? 'bg-black dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    <BriefcaseIcon size={22} color={role === 'worker' ? '#fff' : '#64748b'} />
                                </View>
                                <Text className={`text-lg font-bold ${role === 'worker' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-350'}`}>{t('provider')}</Text>
                                <Text className='text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium'>{t('wantOfferServices')}</Text>
                            </TouchableOpacity>

                            {/* Consumer */}
                            <TouchableOpacity
                                onPress={() => setRole('consumer')}
                                activeOpacity={0.8}
                                className={`flex-1 p-5 rounded-3xl border-2 ${role === 'consumer' ? 'border-black dark:border-blue-500 bg-slate-50 dark:bg-slate-900/60' : 'border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900'}`}
                            >
                                <View className={`size-12 rounded-2xl items-center justify-center mb-3 ${role === 'consumer' ? 'bg-black dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    <UserIcon size={22} color={role === 'consumer' ? '#fff' : '#64748b'} />
                                </View>
                                <Text className={`text-lg font-bold ${role === 'consumer' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-350'}`}>{t('customer')}</Text>
                                <Text className='text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium'>{t('needHireServices')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Experience (workers only) */}
                    {role === 'worker' && (
                        <View className='gap-2 animate-fade-in'>
                            <Text className='text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest'>{t('yearsOfExperience')}</Text>
                            <View className='flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900 px-5'>
                                <ClockIcon size={18} color="#94A3B8" />
                                <TextInput
                                    value={experience}
                                    onChangeText={setExperience}
                                    placeholder='e.g. 5'
                                    placeholderTextColor="#94A3B8"
                                    keyboardType='number-pad'
                                    className='flex-1 py-4 ml-3 text-base font-semibold text-slate-900 dark:text-slate-100'
                                />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Complete Button */}
                <View className='p-6 pb-10 border-t border-slate-100 dark:border-slate-900'>
                    <ScalePressable
                        onPress={handleCompleteOnboarding}
                        disabled={!canSubmit || loading}
                        hapticType="medium"
                        scaleTo={0.97}
                        className={`py-4.5 rounded-2xl items-center justify-center ${canSubmit ? 'bg-black dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-900'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color={isDark ? "white" : "black"} />
                        ) : (
                            <Text className={`text-base font-black uppercase tracking-wider ${canSubmit ? 'text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                                {t('completeOnboarding')}
                            </Text>
                        )}
                    </ScalePressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
