// @ts-nocheck
import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export type TabName = 'home' | 'services' | 'contact' | 'profile';

interface ConsumerNavbarProps {
    activeTab?: TabName;
}

export default function ConsumerNavbar({ activeTab = 'home' }: ConsumerNavbarProps) {
    const router = useRouter();
    const { t } = useTranslation();

    const tabs: { name: TabName; icon: any; library: any; labelKey: string }[] = [
        { name: 'home', icon: 'home', library: Ionicons, labelKey: 'home' },
        { name: 'services', icon: 'briefcase', library: Feather, labelKey: 'services' },
        { name: 'contact', icon: 'clipboard-outline', library: Ionicons, labelKey: 'contact' },
        { name: 'profile', icon: 'person-outline', library: Ionicons, labelKey: 'profile' },
    ];

    return (
        <View 
            className="absolute bottom-0 left-0 right-0 h-28 bg-white dark:bg-slate-900 flex-row items-center justify-around border-t border-gray-100 dark:border-slate-800 px-2 pb-4"
            style={Platform.OS === 'web' ? { boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.1)' } : { elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 }}
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.name;
                const IconLib = tab.library;
                
                return (
                    <TouchableOpacity 
                        key={tab.name}
                        className={`${isActive ? 'bg-black dark:bg-slate-700 rounded-2xl' : ''} items-center justify-center px-3 py-2 min-w-[60px]`}
                        style={isActive ? (Platform.OS === 'web' ? { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } : { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 }) : {}}
                        onPress={() => {
                            if (tab.name === 'home') router.replace('/(protected)/consumer');
                            else if (tab.name === 'services') router.replace('/(protected)/consumer/services');
                            else if (tab.name === 'contact') router.replace('/(protected)/consumer/contact' as any); 
                            else if (tab.name === 'profile') router.replace('/(protected)/consumer/profile' as any);
                        }}
                    >
                        <IconLib 
                            name={tab.icon} 
                            size={isActive ? 24 : 22} 
                            color={isActive ? 'white' : '#9CA3AF'} 
                        />
                        <Text 
                            style={{ fontSize: 10, marginTop: 2, fontWeight: isActive ? '700' : '500', color: isActive ? 'white' : '#9CA3AF' }}
                        >
                            {t(tab.labelKey)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
