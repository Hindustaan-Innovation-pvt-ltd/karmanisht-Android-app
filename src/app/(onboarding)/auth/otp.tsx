import { useAppContext } from '@/lib/context';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function Otp() {
    const { user, setUser, updateDatabaseProfile, refreshProfile, unlockedContacts, unlockedProviders, isUnlocked, unlockWorker, isOnline, setOnline, toggleOnlineStatus, isLoading, hasCheckedAuth, isSessionExpired, categories, userLocation, fetchCategories, sessionToken, workerStats, handleRazorpayPayment, updateProfile, updateWorkerSpecialties, signOut } = useAppContext();


    const router = useRouter()
    const { mobile } = useLocalSearchParams<{ mobile: string }>()
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)

    const handleVerifyOtp = async () => {
        if (otp.length < 6) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
            return;
        }
        setLoading(true);
        try {
            // 1. Verify OTP using backend edge function
            const { data: verifyData, error: verifyError } = await insforge.functions.invoke('verify-otp', {
                body: { mobile, otp_code: otp }
            });

            if (verifyError || !verifyData || verifyData.error) {
                throw new Error(verifyError?.message || verifyData?.error || 'Verification failed');
            }

            // 2. Perform local authentication to establish session
            const mockEmail = `${mobile}@mock-mobile.local`;
            const mockPassword = `Static_Auth_${mobile}`;
            const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
                email: mockEmail,
                password: mockPassword
            });

            if (authError || !authData?.user) {
                throw new Error(authError?.message || 'Authentication session could not be established');
            }

            // 2.5 Check if it is the admin phone number
            if (mobile === '9999999999' || mobile === '999999999' || mobile === '+919999999999' || mobile === '+91999999999') {
                const adminProfile = {
                    id: authData.user.id || 'admin_user',
                    name: 'Administrator',
                    role: 'admin' as const,
                    phone: mobile,
                    isOnline: true
                };
                await setUser(adminProfile);
                await AsyncStorage.setItem('@@app_user', JSON.stringify(adminProfile));
                await refreshProfile();
                router.replace('/admin');
                return;
            }

            // 3. Check database to see if a consumer profile exists
            const { data: consumerData } = await insforge.database
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (consumerData && consumerData.role === 'consumer') {
                const profile = {
                    id: consumerData.id,
                    name: consumerData.full_name || 'Consumer',
                    role: 'consumer' as const,
                    phone: mobile,
                    isOnline: consumerData.is_active
                };
                await setUser(profile);
                await AsyncStorage.setItem('@@app_user', JSON.stringify(profile));
                await refreshProfile();
                router.replace('/(protected)/consumer');
                return;
            }

            // 4. Check database to see if a worker profile exists
            const { data: workerData } = await insforge.database
                .from('service_providers')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (workerData) {
                const profile = {
                    id: workerData.id,
                    name: workerData.full_name || 'Provider',
                    role: 'worker' as const,
                    phone: mobile,
                    profession: workerData.business_name,
                    bio: workerData.bio,
                    experienceYears: workerData.experience_years,
                    isOnline: workerData.is_active
                };
                await setUser(profile);
                await AsyncStorage.setItem('@@app_user', JSON.stringify(profile));
                await refreshProfile();
                router.replace('/(protected)/worker');
                return;
            }

            // 5. User is completely new: redirect to choose role and finalize registration!
            const tempProfile = {
                id: authData.user.id,
                name: '',
                role: null,
                phone: mobile,
                isOnline: true
            };
            await setUser(tempProfile);
            await AsyncStorage.setItem('@@app_user', JSON.stringify(tempProfile));
            await refreshProfile();

            router.replace({
                pathname: '/(onboarding)/auth/register',
                params: { mobile }
            });
        } catch (err: any) {
            console.error('[OTP] Verification error:', err);
            Alert.alert('Error', err?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className='flex-1 bg-white dark:bg-slate-950'>
                <BackButton />
                <View className='flex-1'>
                    <Image source={require('@assets/images/background.png')} className='w-full h-full' />
                </View>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    enabled
                    keyboardVerticalOffset={0}
                >
                    <View className='p-4 flex-col gap-6'>
                        <Text className='text-2xl text-center font-semibold text-slate-900 dark:text-slate-100'>One Step and you are in</Text>
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
                        <Text className='text-center text-slate-400 dark:text-slate-500 text-xs'>
                            Hint: Use <Text className='font-bold'>123456</Text> if you didn&apos;t receive an SMS.
                        </Text>
                        <TouchableOpacity
                            className='bg-black dark:bg-slate-800 py-4 rounded-xl items-center'
                            activeOpacity={0.7}
                            onPress={handleVerifyOtp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className='text-center text-lg font-semibold text-white dark:text-slate-100'>Verify OTP</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            router.push("/(onboarding)/auth/register")
                        }}>
                            <Text className='text-xl font-semibold text-center mt-3 text-slate-900 dark:text-slate-300'>Create New Account</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
    )
}

