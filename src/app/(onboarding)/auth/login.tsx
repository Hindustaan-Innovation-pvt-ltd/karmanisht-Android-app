// @ts-nocheck
import React, { useState } from 'react'
import { Text, TextInput, TouchableOpacity, View, Platform, KeyboardAvoidingView, Image, Alert, ActivityIndicator, useColorScheme } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Google } from '@/svg/Google'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { insforge } from '@/lib/insforge'

import { useAppContext } from '@/lib/context'

WebBrowser.maybeCompleteAuthSession();

function Login() {
    const router = useRouter()
    const { loginWithMobile, setUser, refreshProfile } = useAppContext()
    const [mobile, setMobile] = useState('')
    const [loading, setLoading] = useState(false)

    const handleGetOtp = async () => {
        if (mobile.length < 10) {
            Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        try {
            // Send actual OTP using backend edge function
            const { data, error } = await insforge.functions.invoke('send-otp', {
                body: { mobile }
            });
            if (error || (data && data.error)) {
                throw new Error(error?.message || data?.error || 'Failed to send OTP');
            }
            Alert.alert('OTP Sent', data.message || 'OTP sent successfully!');
            router.push({
                pathname: '/(onboarding)/auth/otp',
                params: { mobile }
            });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSuccess = async (code: string, codeVerifier?: string) => {
        const { data: sessionData, error: sessionError } = await insforge.auth.exchangeOAuthCode(code, codeVerifier);
        if (sessionError) {
            throw sessionError;
        }

        const { data: userData, error: userError } = await insforge.auth.getCurrentUser();
        const insforgeUser = userData?.user;
        if (userError || !insforgeUser) {
            throw userError || new Error('Failed to get current user info.');
        }

        // Check if user exists in the database
        // First check users (consumers)
        const { data: consumerData } = await insforge.database
            .from('users')
            .select('*')
            .eq('id', insforgeUser.id)
            .single();

        if (consumerData) {
            const profile = {
                id: consumerData.id,
                name: consumerData.full_name || insforgeUser.profile?.name || insforgeUser.email || 'Consumer',
                role: 'consumer' as const,
                phone: consumerData.mobile || '',
                isOnline: consumerData.is_active
            };
            await setUser(profile);
            await AsyncStorage.setItem('@@app_user', JSON.stringify(profile));
            await refreshProfile();
            router.replace('/(protected)/consumer');
            return;
        }

        // Check service_providers (workers)
        const { data: workerData } = await insforge.database
            .from('service_providers')
            .select('*')
            .eq('id', insforgeUser.id)
            .single();

        if (workerData) {
            const profile = {
                id: workerData.id,
                name: workerData.full_name || insforgeUser.profile?.name || insforgeUser.email || 'Provider',
                role: 'worker' as const,
                phone: workerData.mobile || '',
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

        // User is completely new! Redirect to complete registration.
        router.replace({
            pathname: '/(onboarding)/auth/register',
            params: {
                mobile: '',
                role: 'consumer',
                prefilledName: insforgeUser.profile?.name || '',
                prefilledEmail: insforgeUser.email || '',
                prefilledUserId: insforgeUser.id
            }
        });
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const redirectUrl = Linking.createURL('/auth/callback');
            const { data, error } = await insforge.auth.signInWithOAuth({
                provider: 'google',
                redirectTo: redirectUrl,
                skipBrowserRedirect: true
            });

            if (error) {
                throw error;
            }

            if (!data?.url) {
                throw new Error('Failed to get OAuth login URL from InsForge.');
            }

            if (data.codeVerifier) {
                await AsyncStorage.setItem('@@insforge_code_verifier', data.codeVerifier);
            }

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

            if (result.type === 'success' && result.url) {
                const parsed = Linking.parse(result.url);
                const code = parsed.queryParams?.insforge_code as string || parsed.queryParams?.code as string;
                if (code) {
                    await handleOAuthSuccess(code, data.codeVerifier);
                } else {
                    throw new Error('Authorization code not found in callback URL.');
                }
            } else if (result.type === 'cancel') {
                // User cancelled the login
            } else {
                throw new Error('Sign in flow was cancelled or failed.');
            }
        } catch (error: any) {
            console.error('Google Auth Error:', error);
            Alert.alert('Google Auth Error', error.message || 'An unexpected error occurred during sign in.');
        } finally {
            setLoading(false);
        }
    };

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
                            <TouchableOpacity
                                className='flex-row px-4 items-center border border-slate-300 dark:border-slate-700 w-full py-3 rounded-lg relative bg-white dark:bg-slate-900'
                                activeOpacity={0.7}
                                onPress={handleGoogleSignIn}
                                disabled={loading}
                            >
                                <Google className='absolute left-4' />
                                <Text className='w-full text-lg font-semibold text-center text-slate-900 dark:text-slate-100'>
                                    Sign in with Google
                                </Text>
                            </TouchableOpacity>

                            <Text className='text-center font-semibold text-slate-900 dark:text-slate-100'>OR</Text>
                        </View>
                        <View className='flex-col gap-4'>
                            <TextInput
                                className='rounded-lg outline p-4 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                                placeholder='Enter Mobile No.'
                                placeholderTextColor={useColorScheme() === 'dark' ? '#64748b' : '#94a3b8'}
                                keyboardType='phone-pad'
                                value={mobile}
                                onChangeText={setMobile}
                                maxLength={10}
                            />
                            <TouchableOpacity
                                className='bg-black dark:bg-slate-800 py-4 rounded-lg items-center'
                                activeOpacity={0.7}
                                onPress={handleGetOtp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className='text-white dark:text-slate-100 font-bold text-lg'>Get-OTP</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View className='flex-col gap-2'>
                            <Text className='text-center text-lg font-medium text-slate-500'>Don&apos;t Have a Account yet ?</Text>
                            <TouchableOpacity onPress={() => {
                                router.push("/(onboarding)/auth/register")
                            }}>
                                <Text className='text-center text-black dark:text-white font-bold'>Create new account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
    )
}

export default Login;

