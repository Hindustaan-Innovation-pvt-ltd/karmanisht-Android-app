// @ts-nocheck
import { Tabs, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export default function ConsumerLayout() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const pathname = usePathname();

  // Show the native tab bar only on top-level entry tabs
  const isMainTab = pathname === '/consumer' || 
                    pathname === '/consumer/' ||
                    pathname === '/consumer/services' || 
                    pathname === '/consumer/services/' || 
                    pathname === '/consumer/contact' || 
                    pathname === '/consumer/contact/' || 
                    pathname === '/consumer/profile' ||
                    pathname === '/consumer/profile/';

  useEffect(() => {
    const onBackPress = () => {
      if (isMainTab) {
        // Exit app instead of returning to onboarding screens
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [isMainTab]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 90 : 90,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 10,
          display: isMainTab ? 'flex' : 'none',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      {/* Top Level Tabs */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome', 'Home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t('tabExplore', 'Explore'),
          tabBarIcon: ({ color, focused }) => (
            <Feather name="briefcase" size={24} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('services', { screen: 'index' });
          },
        })}
      />
      <Tabs.Screen
        name="contact/index"
        options={{
          title: t('tabContacts', 'Contacts'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile', 'Profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('profile', { screen: 'index' });
          },
        })}
      />
    </Tabs>
  );
}
