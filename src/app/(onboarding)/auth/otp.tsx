// @ts-nocheck
import BackButton from '@/components/back-button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { insforge } from '@/lib/insforge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '@/lib/store';
import { getOnboardingRoute } from '@/lib/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';

export default function Otp() {
    const router = useRouter()
    const { mobile, initialCooldown, verificationId } = useLocalSearchParams<{ mobile: string, initialCooldown?: string, verificationId?: string }>()
    const processUserSession = useAppStore(state => state.processUserSession)
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(initialCooldown ? parseInt(initialCooldown) : 30)
    const [currentVerificationId, setCurrentVerificationId] = useState(verificationId || '')


    // ── Cooldown countdown timer ─────────────────────────────────────────────
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        setLoading(true);
        try {
            const confirmation = await auth().signInWithPhoneNumber('+91' + mobile);
            setCurrentVerificationId(confirmation.verificationId);
            Alert.alert('OTP Sent', 'OTP resent successfully!');
            setCooldown(30); // restart cooldown
        } catch (err: any) {
            console.error('[Firebase OTP Error]', err);
            Alert.alert('Error', err.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length < 6) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
            return;
        }
        setLoading(true);
        try {
            const credential = auth.PhoneAuthProvider.credential(currentVerificationId, otp);
            await auth().signInWithCredential(credential);

            // 2. Establish auth session via mock email/password
            const mockEmail = `${mobile}@mock-mobile.local`;
            const mockPassword = `Static_Auth_${mobile}`;
            const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
                email: mockEmail,
                password: mockPassword
            });

            if (authError || !authData?.user) {
                throw new Error(authError?.message || 'Could not establish auth session.');
            }

            if (authData.accessToken) {
                await AsyncStorage.setItem('@@app_token', authData.accessToken);
                insforge.setAccessToken(authData.accessToken);
            }
            if (authData.refreshToken) {
                await AsyncStorage.setItem('@@app_refresh_token', authData.refreshToken);
                insforge.getHttpClient().setRefreshToken(authData.refreshToken);
            }
            if (authData.csrfToken) {
                await AsyncStorage.setItem('@@app_csrf_token', authData.csrfToken);
                if (typeof document !== 'undefined') {
                    document.cookie = `insforge_csrf_token=${authData.csrfToken}`;
                }
            }

            // 3. Central DB lookup — builds and syncs the user profile
            const profile = await processUserSession(authData.user.id, '');

            if (profile) {
                const nextRoute = getOnboardingRoute(profile);
                if (nextRoute) {
                    router.replace(nextRoute as any);
                }
            } else {
                // No DB record — shouldn't reach OTP without registering
                await insforge.auth.signOut();
                Alert.alert('Account Not Found', 'No account found for this number. Please sign up first.');
                router.replace('/(onboarding)/auth/login');
            }
        } catch (err: any) {
            console.error('[OTP Verify]', err);
            Alert.alert('Error', err?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>

            <View className='absolute top-12 left-2 z-10'><BackButton /></View>
            <View className='flex-1'>
                <Image source={require('@assets/images/background.png')} className='w-full h-full' />
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                enabled
                keyboardVerticalOffset={0}
            >
                <View className='p-4 flex-col gap-6'>
                    <Text className='text-2xl text-center font-semibold text-slate-900 dark:text-slate-100'>
                        One step and you&apos;re in
                    </Text>
                    <Text className='text-center text-slate-500 dark:text-slate-400 text-sm -mt-3'>
                        Enter the 6-digit code sent to <Text className='font-bold text-slate-900 dark:text-slate-100'>{mobile}</Text>
                    </Text>

                    <InputOTP maxLength={6} onChangeText={setOtp} value={otp} autoFocus>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>

                    <View className='flex-col gap-2 -mt-2'>
                        <Text className='text-center text-slate-400 dark:text-slate-500 text-xs'>
                            Hint: Use <Text className='font-bold'>123456</Text> if you didn&apos;t receive an SMS.
                        </Text>

                        <View className='flex-row justify-center items-center h-6'>
                            {cooldown > 0 ? (
                                <Text className='text-slate-500 dark:text-slate-400 text-sm font-medium'>
                                    Resend code in {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleResendOtp} disabled={loading} activeOpacity={0.7}>
                                    <Text className='text-blue-600 dark:text-blue-400 font-bold text-sm'>
                                        Resend OTP
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        className='bg-black dark:bg-slate-800 py-4 rounded-xl items-center'
                        activeOpacity={0.7}
                        onPress={handleVerifyOtp}
                        disabled={loading || otp.length < 6}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className='text-center text-lg font-semibold text-white'>Verify OTP</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push('/(onboarding)/auth/register')}>
                        <Text className='text-xl font-semibold text-center mt-3 text-slate-900 dark:text-slate-300'>
                            Create New Account
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
