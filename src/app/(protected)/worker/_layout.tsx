// @ts-nocheck
import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { HomeIcon, BriefcaseIcon, SettingsIcon } from '@/svg/icons';
import { useTheme } from '@/lib/theme';

export default function WorkerProtectedLayout() {
    const { colors } = useTheme();
    const pathname = usePathname();

    const isMainTab = pathname === '/worker' || 
                      pathname === '/worker/' ||
                      pathname === '/worker/leads' || 
                      pathname === '/worker/leads/' || 
                      pathname === '/worker/settings' ||
                      pathname === '/worker/settings/';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.active,
                tabBarInactiveTintColor: colors.inactive,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: colors.background,
                    height: 100,
                    paddingBottom: 16,
                    paddingTop: 16,
                    display: isMainTab ? 'flex' : 'none',
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                },
            }}
        >

            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="leads"
                options={{
                    title: 'Leads',
                    tabBarIcon: ({ color }) => <BriefcaseIcon size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <SettingsIcon size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="edit-profile"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="edit-profession"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="premium-plans"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="premium-payment"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="verify-identity"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
