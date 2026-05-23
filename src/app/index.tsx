// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react'
import {
    ActivityIndicator, Image, Text, TouchableOpacity, View,
    Modal, Pressable, Animated, Platform, useColorScheme
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useRootNavigationState } from 'expo-router'
import { useAppStore } from '@/lib/store'
import { getOnboardingRoute } from '@/lib/utils'
import { Vector as Leaf } from '@/svg/leaf'
import { Vector as Wheel } from '@/svg/wheel'
import { Vector as Fan } from '@/svg/fan'
import { Vector as Bolt } from '@/svg/bolt'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'


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
                <Leaf
                    size={42}
                    style={{ position: 'absolute', left: 30, bottom: 18, width: 42, height: 42 }}
                />
            </View>

            {/* Red Track - Upper Middle Left (second.png) */}
            <View style={{ position: 'absolute', top: '2%', left: 0, width: '68%', height: 220 }}>
                <Image
                    source={require('@assets/images/second.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="stretch"
                />
                <Wheel
                    size={42}
                    style={{ position: 'absolute', right: 20, bottom: 18, width: 42, height: 42 }}
                />
            </View>

            {/* Blue Track - Middle Right (third.png) */}
            <View style={{ position: 'absolute', top: '32%', left: 70, right: 1, height: 400 }}>
                <Image
                    source={require('@assets/images/third.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="stretch"
                />
                <Fan
                    size={42}
                    style={{ position: 'absolute', left: 30, top: 20, width: 42, height: 42 }}
                />
            </View>

            {/* Yellow Track - Lower Left (forth.png) */}
            <View style={{ position: 'absolute', top: '45%', left: 0, width: '74%', height: 350 }}>
                <Image
                    source={require('@assets/images/forth.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="stretch"
                />
                <Bolt
                    size={42}
                    style={{ position: 'absolute', right: 30, top: 15, width: 42, height: 42 }}
                />
            </View>
        </View>
    )
}

export default function Index() {
    const router = useRouter()
    const navigationState = useRootNavigationState()
    const isDark = useColorScheme() === 'dark'
    const { t, i18n } = useTranslation()
    const user = useAppStore(state => state.user)
    const isLoading = useAppStore(state => state.isLoading)
    const hasCheckedAuth = useAppStore(state => state.hasCheckedAuth)
    const changeLanguage = useAppStore(state => state.changeLanguage)
    const currentLanguage = useAppStore(state => state.currentLanguage)

    const [langPickerVisible, setLangPickerVisible] = useState(false)
    const [selectedLang, setSelectedLang] = useState<'en' | 'hi'>(
        (i18n.language === 'hi' ? 'hi' : 'en') as 'en' | 'hi'
    )
    const [applyingLang, setApplyingLang] = useState(false)

    // Sheet slide-up animation
    const slideAnim = useRef(new Animated.Value(400)).current

    useEffect(() => {
        if (langPickerVisible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 200,
            }).start()
        } else {
            slideAnim.setValue(400)
        }
    }, [langPickerVisible])

    useEffect(() => {
        if (!hasCheckedAuth || isLoading || !navigationState?.key) return;

        if (user?.id) {
            const nextRoute = getOnboardingRoute(user);
            if (nextRoute) {
                setTimeout(() => {
                    router.replace(nextRoute as any);
                }, 0);
            }
        }
        // If no user, fall through and render the landing page below
    }, [isLoading, hasCheckedAuth, user, router, navigationState?.key])

    // Keep selectedLang in sync if language was changed elsewhere (e.g. settings)
    useEffect(() => {
        setSelectedLang(currentLanguage === 'hi' ? 'hi' : 'en')
    }, [currentLanguage])

    const handleGetStarted = () => {
        setLangPickerVisible(true)
    }

    const handleContinue = async () => {
        if (applyingLang) return
        setApplyingLang(true)
        try {
            await changeLanguage(selectedLang)
        } catch (e) {
            console.warn('[LangPicker] Failed to apply language', e)
        } finally {
            setApplyingLang(false)
        }
        setLangPickerVisible(false)
        router.push('/(onboarding)/auth/login')
    }

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
            <BackgroundPattern />
            <View className='p-6 absolute bottom-4 w-full justify-center'>
                <View className='items-center mb-8'>
                    <Image
                        source={require('@assets/images/logo.png')}
                        style={{ width: 150, height: 150 }}
                        resizeMode="contain"
                    />

                    <Text className='text-[3rem] font-black text-center text-slate-900 dark:text-slate-100'>Karma<Text className='text-orange-500'>nisht</Text></Text>
                    <Text className='text-base font-bold text-center text-slate-500 dark:text-slate-400 mt-2'>{t('tagline')}</Text>
                </View>

                <View className='gap-4'>
                    <TouchableOpacity
                        className='bg-black dark:bg-slate-800 py-5 rounded-2xl items-center'
                        style={Platform.OS === 'web' ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } : {}}
                        activeOpacity={0.8}
                        onPress={handleGetStarted}
                    >
                        <Text className='text-xl font-bold text-white'>{t('getStarted')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Language Picker Bottom Sheet ── */}
            <Modal
                visible={langPickerVisible}
                transparent
                animationType="none"
                onRequestClose={() => setLangPickerVisible(false)}
                statusBarTranslucent
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
                    {/* Backdrop tap to dismiss */}
                    <Pressable
                        style={{ flex: 1 }}
                        onPress={() => setLangPickerVisible(false)}
                    />

                    <Animated.View
                        style={{
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: isDark ? '#0F172A' : 'white',
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            paddingHorizontal: 24,
                            paddingTop: 12,
                            paddingBottom: 40,
                        }}
                    >
                        {/* Handle bar */}
                        <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: isDark ? '#334155' : '#E2E8F0', alignSelf: 'center', marginBottom: 24 }} />

                        {/* Globe icon + title */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? '#1E293B' : '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="language" size={24} color="#3B82F6" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A' }}>{t('chooseLanguage')}</Text>
                                <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', fontWeight: '500', marginTop: 2 }}>{t('chooseLanguageDesc')}</Text>
                            </View>
                        </View>

                        <View style={{ height: 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', marginVertical: 20 }} />

                        {/* English option */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setSelectedLang('en')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 18,
                                borderRadius: 18,
                                borderWidth: 2,
                                borderColor: selectedLang === 'en' ? '#3B82F6' : (isDark ? '#334155' : '#F1F5F9'),
                                backgroundColor: selectedLang === 'en' ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#020617' : '#FAFAFA'),
                                marginBottom: 14,
                            }}
                        >
                            <View style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: selectedLang === 'en' ? '#3B82F6' : (isDark ? '#334155' : '#E2E8F0'),
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 14
                            }}>
                                <Text style={{
                                    fontSize: 20,
                                    fontWeight: 'bold',
                                    color: selectedLang === 'en' ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#0F172A')
                                }}>A</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 17, fontWeight: '700', color: selectedLang === 'en' ? '#3B82F6' : (isDark ? '#F8FAFC' : '#0F172A') }}>English</Text>
                                <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>Continue in English</Text>
                            </View>
                            {selectedLang === 'en' && (
                                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="checkmark" size={16} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Hindi option */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setSelectedLang('hi')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 18,
                                borderRadius: 18,
                                borderWidth: 2,
                                borderColor: selectedLang === 'hi' ? '#3B82F6' : (isDark ? '#334155' : '#F1F5F9'),
                                backgroundColor: selectedLang === 'hi' ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#020617' : '#FAFAFA'),
                                marginBottom: 28,
                            }}
                        >
                            <View style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: selectedLang === 'hi' ? '#3B82F6' : (isDark ? '#334155' : '#E2E8F0'),
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 14
                            }}>
                                <Text style={{
                                    fontSize: 20,
                                    fontWeight: 'bold',
                                    color: selectedLang === 'hi' ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#0F172A')
                                }}>अ</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 17, fontWeight: '700', color: selectedLang === 'hi' ? '#3B82F6' : (isDark ? '#F8FAFC' : '#0F172A') }}>हिंदी</Text>
                                <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>हिंदी में जारी रखें</Text>
                            </View>
                            {selectedLang === 'hi' && (
                                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="checkmark" size={16} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Continue button */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleContinue}
                            disabled={applyingLang}
                            style={{
                                backgroundColor: isDark ? '#F8FAFC' : '#000',
                                borderRadius: 18,
                                paddingVertical: 18,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: applyingLang ? 0.7 : 1,
                            }}
                        >
                            {applyingLang ? (
                                <ActivityIndicator color={isDark ? 'black' : 'white'} />
                            ) : (
                                <Text style={{ color: isDark ? '#0F172A' : 'white', fontSize: 16, fontWeight: '800' }}>
                                    {selectedLang === 'hi' ? 'जारी रखें →' : 'Continue →'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}