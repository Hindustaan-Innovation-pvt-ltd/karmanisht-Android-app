// @ts-nocheck
import { Tabs, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { HomeIcon, BriefcaseIcon, SettingsIcon } from '@/svg/icons';
import { useTheme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export default function WorkerProtectedLayout() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const pathname = usePathname();

    const isMainTab = pathname === '/worker' || 
                      pathname === '/worker/' ||
                      pathname === '/worker/leads' || 
                      pathname === '/worker/leads/' || 
                      pathname === '/worker/settings' ||
                      pathname === '/worker/settings/';

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
                    title: t('tabHome', 'Home'),
                    tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="leads"
                options={{
                    title: t('tabLeads', 'Leads'),
                    tabBarIcon: ({ color }) => <BriefcaseIcon size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t('tabSettings', 'Settings'),
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
