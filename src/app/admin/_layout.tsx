// @ts-nocheck
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/lib/store';
import { getOnboardingRoute } from '@/lib/utils';

export default function AdminLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const hasCheckedAuth = useAppStore(state => state.hasCheckedAuth);
  const isLoading = useAppStore(state => state.isLoading);

  useEffect(() => {
    if (!hasCheckedAuth || isLoading) return;

    const nextRoute = getOnboardingRoute(user);
    if (nextRoute && !nextRoute.startsWith('/admin')) {
      setTimeout(() => {
        router.replace(nextRoute as any);
      }, 0);
    }
  }, [user, hasCheckedAuth, isLoading, router]);

  if (!hasCheckedAuth || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint || '#6366F1'} />
      </View>
    );
  }

  const nextRoute = getOnboardingRoute(user);
  if (nextRoute && !nextRoute.startsWith('/admin')) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint || '#6366F1'} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint || '#1619c7ff',
        tabBarInactiveTintColor: colors.inactive || '#94A3B8',
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
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="pie-chart" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="users" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit Logs',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="shield" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="alert-triangle" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="grid" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

