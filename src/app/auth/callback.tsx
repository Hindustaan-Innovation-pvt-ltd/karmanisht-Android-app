// @ts-nocheck
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insforge } from '@/lib/insforge';
import { Alert, ActivityIndicator, View } from 'react-native';
import { useAppStore } from '@/lib/store';
import { getOnboardingRoute } from '@/lib/utils';

export default function AuthCallback() {
    const router = useRouter();
    const processUserSession = useAppStore(state => state.processUserSession);
    const setUser = useAppStore(state => state.setUser);

    useEffect(() => {
        const handleDeepLink = async () => {
            try {
                const url = await Linking.getInitialURL();
                if (!url) {
                    router.replace('/(onboarding)/auth/login');
                    return;
                }

                const parsed = Linking.parse(url);
                const code = (parsed.queryParams?.insforge_code || parsed.queryParams?.code) as string;

                if (!code) {
                    router.replace('/(onboarding)/auth/login');
                    return;
                }

                const codeVerifier = await AsyncStorage.getItem('@@insforge_code_verifier') || undefined;

                // Exchange code for session
                const { data: sessionData, error: sessionError } = await insforge.auth.exchangeOAuthCode(code, codeVerifier);
                if (sessionError) throw sessionError;

                if (sessionData?.accessToken) {
                    await AsyncStorage.setItem('@@app_token', sessionData.accessToken);
                }
                if (sessionData?.refreshToken) {
                    await AsyncStorage.setItem('@@app_refresh_token', sessionData.refreshToken);
                }

                // Get authenticated user
                const { data: userData, error: userError } = await insforge.auth.getCurrentUser();
                const insforgeUser = userData?.user;
                if (userError || !insforgeUser) throw userError || new Error('Failed to get current user.');

                // Central DB lookup through the store
                const profile = await processUserSession(
                    insforgeUser.id,
                    insforgeUser.profile?.name || insforgeUser.email || ''
                );

                if (profile) {
                    const nextRoute = getOnboardingRoute(profile);
                    if (nextRoute) {
                        router.replace(nextRoute as any);
                    }
                } else {
                    // Populate local store state with the authenticated Google session details
                    await setUser({
                        id: insforgeUser.id,
                        name: insforgeUser.profile?.name || insforgeUser.email?.split('@')[0] || 'User',
                        email: insforgeUser.email || '',
                        isGoogleUser: true,
                        role: null,
                    });

                    // New user — route to google-onboarding
                    router.replace({
                        pathname: '/(onboarding)/auth/google-onboarding',
                        params: {
                            prefilledName: insforgeUser.profile?.name || insforgeUser.email?.split('@')[0] || '',
                            prefilledEmail: insforgeUser.email || '',
                            prefilledUserId: insforgeUser.id,
                        }
                    });
                }
            } catch (error: any) {
                console.error('[AuthCallback]', error);
                Alert.alert('Sign-In Error', error.message || 'Failed to complete Google Sign In');
                router.replace('/(onboarding)/auth/login');
            }
        };

        handleDeepLink();
    }, [processUserSession, router]);

    return (
        <View className='flex-1 bg-white dark:bg-slate-950 items-center justify-center'>
            <ActivityIndicator size="large" color="#000" />
        </View>
    );
}
