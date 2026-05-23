// @ts-nocheck
import '@/lib/i18n';
import React, { useState, useEffect } from 'react';
import { Text, TextInput, View, Platform, KeyboardAvoidingView, Image, Alert, ActivityIndicator, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Google } from '@/svg/Google'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { insforge } from '@/lib/insforge'
import { useAppStore } from '@/lib/store'
import { getOnboardingRoute } from '@/lib/utils'
import ScalePressable from '@/components/scale-pressable'
import auth from '@react-native-firebase/auth';
import { useTranslation } from 'react-i18next';
import CustomAlert from '@/components/ui/custom-alert';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
    const { t } = useTranslation();
    const router = useRouter()
    const processUserSession = useAppStore(state => state.processUserSession)
    const setUser = useAppStore(state => state.setUser)
    const [mobile, setMobile] = useState('')
    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'error' | 'success' | 'info' | 'warning';
        onClose?: () => void;
    } | null>(null);

    const showAlert = (
        title: string,
        message: string,
        type: 'error' | 'success' | 'info' | 'warning' = 'error',
        onClose?: () => void
    ) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            type,
            onClose: () => {
                setAlertConfig(null);
                if (onClose) onClose();
            }
        });
    };

    // ── OTP countdown timer ──────────────────────────────────────────────────
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    // ── Helper: route a profile to the right screen based on onboarding status 
    const routeProfile = (profile: any) => {
        const nextRoute = getOnboardingRoute(profile);
        if (nextRoute) {
            router.replace(nextRoute as any);
        }
    }

    // ── Mobile OTP: verify account exists then send OTP ──────────────────────
    const handleGetOtp = async () => {
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            showAlert(t('invalidMobile'), t('invalidMobileMsg'), 'error');
            return;
        }

        if (cooldown > 0) {
            showAlert(t('pleaseWait'), t('cooldownMsg', { time: cooldown }), 'warning');
            return;
        }

        setLoading(true);
        try {
            // Ensure an account exists with this number before sending OTP
            const { data: checkRes, error: checkError } = await insforge.database.rpc('check_mobile_exists', {
                target_mobile: mobile
            });

            if (checkError) {
                console.error('Error checking account existence:', checkError);
                throw new Error(checkError.message || 'Failed to verify account status.');
            }

            if (!checkRes || !checkRes.exists) {
                const title = t('accountNotFound');
                const message = t('accountNotFoundMsg');
                showAlert(title, message, 'error');
                return;
            }

            // Firebase Phone Auth using native RN Firebase (no Recaptcha required)
            const isDev = process.env.EXPO_PUBLIC_APP_MODE === 'development';
            let verificationId = 'mock-verification-id';

            if (!isDev) {
                const confirmation = await auth().signInWithPhoneNumber('+91' + mobile);
                verificationId = confirmation.verificationId;
            }

            setCooldown(30); // 30 seconds cooldown
            showAlert(t('otpSent'), t('otpSentMsg'), 'success', () => {
                // Pass the confirmation object's verificationId to the next screen
                router.push({
                    pathname: '/(onboarding)/auth/otp',
                    params: { mobile, initialCooldown: '30', verificationId: verificationId }
                });
            });
        } catch (err: any) {
            console.error('[Firebase OTP Error]', err);
            showAlert(t('error'), err.message || 'Failed to send OTP', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Google OAuth ─────────────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const redirectUrl = Linking.createURL('/auth/callback');
            const { data, error } = await insforge.auth.signInWithOAuth({
                provider: 'google',
                redirectTo: redirectUrl,
                skipBrowserRedirect: true
            });

            if (error || !data?.url) {
                throw error || new Error('Failed to get OAuth login URL.');
            }

            if (data.codeVerifier) {
                await AsyncStorage.setItem('@@insforge_code_verifier', data.codeVerifier);
            }

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

            if (result.type === 'success' && result.url) {
                const parsed = Linking.parse(result.url);
                const code = (parsed.queryParams?.insforge_code || parsed.queryParams?.code) as string;

                if (!code) throw new Error('Authorization code not found in callback URL.');

                // Exchange the code for a session
                const { data: sessionData, error: sessionError } = await insforge.auth.exchangeOAuthCode(code, data.codeVerifier);
                if (sessionError) throw sessionError;

                if (sessionData?.accessToken) {
                    await AsyncStorage.setItem('@@app_token', sessionData.accessToken);
                    insforge.setAccessToken(sessionData.accessToken);
                }
                if (sessionData?.refreshToken) {
                    await AsyncStorage.setItem('@@app_refresh_token', sessionData.refreshToken);
                    insforge.getHttpClient().setRefreshToken(sessionData.refreshToken);
                }
                if (sessionData?.csrfToken) {
                    await AsyncStorage.setItem('@@app_csrf_token', sessionData.csrfToken);
                    if (typeof document !== 'undefined') {
                        document.cookie = `insforge_csrf_token=${sessionData.csrfToken}`;
                    }
                }

                // Get the authenticated user
                const { data: userData, error: userError } = await insforge.auth.getCurrentUser();
                const insforgeUser = userData?.user;
                if (userError || !insforgeUser) throw userError || new Error('Failed to get current user.');

                // Central lookup through the store
                const profile = await processUserSession(
                    insforgeUser.id,
                    insforgeUser.profile?.name || insforgeUser.email || ''
                );

                if (profile) {
                    routeProfile(profile);
                } else {
                    // Populate local store state with the authenticated Google session details
                    await setUser({
                        id: insforgeUser.id,
                        name: insforgeUser.profile?.name || insforgeUser.email?.split('@')[0] || 'User',
                        email: insforgeUser.email || '',
                        isGoogleUser: true,
                        role: null,
                    });

                    // Brand new Google user — send to google-onboarding
                    router.replace({
                        pathname: '/(onboarding)/auth/google-onboarding',
                        params: {
                            prefilledName: insforgeUser.profile?.name || insforgeUser.email?.split('@')[0] || '',
                            prefilledEmail: insforgeUser.email || '',
                            prefilledUserId: insforgeUser.id,
                        }
                    });
                }
            } else if (result.type === 'cancel' || result.type === 'dismiss') {
                showAlert(t('error'), 'Google sign-in was cancelled.', 'warning');
            } else {
                throw new Error('Sign in flow failed.');
            }
        } catch (error: any) {
            console.error('[Google Auth]', error);
            showAlert(t('error'), error.message || 'An unexpected error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const colorScheme = useColorScheme();

    return (
        <SafeAreaView className='flex-col flex-1 relative bg-white dark:bg-slate-950'>
            <View className='flex-1'>
                <Image source={require('@assets/images/background.png')} className='w-full h-full' />
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                enabled
                keyboardVerticalOffset={0}
            >
                <View className='p-4 flex-col gap-6'>
                    <View className='flex-col gap-4 items-center'>
                        <ScalePressable
                            className='flex-row px-4 items-center border border-slate-300 dark:border-slate-700 w-full py-3 rounded-lg relative bg-white dark:bg-slate-900'
                            onPress={handleGoogleSignIn}
                            disabled={loading}
                            hapticType="light"
                            scaleTo={0.97}
                        >
                            <Google className='absolute left-4' />
                            <Text className='w-full text-lg font-semibold text-center text-slate-900 dark:text-slate-100 -ms-4'>
                                {t('signInWithGoogle')}
                            </Text>
                        </ScalePressable>
                        <Text className='text-center font-semibold text-slate-900 dark:text-slate-100'>{t('or')}</Text>
                    </View>

                    <View className='flex-col gap-4'>
                        <TextInput
                            className='rounded-lg outline p-4 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                            placeholder={t('enterMobileNo')}
                            placeholderTextColor={colorScheme === 'dark' ? '#64748b' : '#94a3b8'}
                            keyboardType='phone-pad'
                            value={mobile}
                            onChangeText={setMobile}
                            maxLength={10}
                        />
                        <ScalePressable
                            className={`py-4 rounded-lg items-center ${cooldown > 0 ? 'bg-slate-200 dark:bg-slate-800' : 'bg-black dark:bg-slate-700'}`}
                            onPress={handleGetOtp}
                            disabled={loading || cooldown > 0}
                            hapticType="medium"
                            scaleTo={0.96}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className={`font-bold text-lg ${cooldown > 0 ? 'text-slate-400 dark:text-slate-550' : 'text-white'}`}>
                                    {cooldown > 0 ? t('resendIn', { time: `${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}` }) : t('getOtp')}
                                </Text>
                            )}
                        </ScalePressable>
                    </View>

                    <View className='flex-col gap-2'>
                        <Text className='text-center text-lg font-medium text-slate-500'>{t('dontHaveAccount')}</Text>
                        <ScalePressable
                            onPress={() => router.push('/(onboarding)/auth/register')}
                            hapticType="light"
                            scaleTo={0.98}
                        >
                            <Text className='text-center text-black dark:text-white font-bold'>{t('createNewAccount')}</Text>
                        </ScalePressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
            
            {alertConfig && (
                <CustomAlert
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    onClose={alertConfig.onClose || (() => setAlertConfig(null))}
                />
            )}
        </SafeAreaView>
    )
}
