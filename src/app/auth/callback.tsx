import { useAppContext } from '@/lib/context';
// @ts-nocheck
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insforge } from '@/lib/insforge';
import { Alert } from 'react-native';

export default function AuthCallback() {
  const { setUser, refreshProfile } = useAppContext();
  const router = useRouter();
  
  useEffect(() => {
    const handleDeepLink = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (!url) {
          router.replace('/(onboarding)/auth/login');
          return;
        }

        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.insforge_code as string || parsed.queryParams?.code as string;
        
        if (code) {
          const codeVerifier = await AsyncStorage.getItem('@@insforge_code_verifier') || undefined;
          
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
              .maybeSingle();

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
              .maybeSingle();

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

          // User is completely new! Redirect to complete registration and ASK them for their role.
          router.replace({
              pathname: '/(onboarding)/auth/register',
              params: {
                  mobile: '',
                  prefilledName: insforgeUser.profile?.name || '',
                  prefilledEmail: insforgeUser.email || '',
                  prefilledUserId: insforgeUser.id
              }
          });
        } else {
          router.replace('/(onboarding)/auth/login');
        }
      } catch (error: any) {
        console.error('Callback error:', error);
        Alert.alert('Google Auth Callback Error', error.message || 'Failed to complete Google Sign In');
        router.replace('/(onboarding)/auth/login');
      }
    };

    handleDeepLink();
  }, [refreshProfile, router, setUser]);

  return null; 
}
