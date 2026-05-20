import { useAppStore } from '@/lib/store';
// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';

const MENU_ITEMS = [
    { id: 'profile', title: 'Profile Info', description: 'Name, photo, and account details', icon: 'person', library: Octicons },
    { id: 'payments', title: 'Payment History', description: 'View transaction and unlock records', icon: 'currency-rupee', library: MaterialCommunityIcons },
    { id: 'help', title: 'Help and Support', description: 'Contact our support team', icon: 'headphones', library: Feather },
    { id: 'settings', title: 'Settings', description: 'Manage language and visual options', icon: 'settings', library: Ionicons },
    { id: 'logout', title: 'Logout', description: 'Sign out of your session', icon: 'logout', library: MaterialCommunityIcons, isDestructive: true },
];

export default function ProfileScreen() {
    const { colors, isDark } = useTheme();
    const user = useAppStore(state => state.user);
    const signOut = useAppStore(state => state.signOut);
    const router = useRouter();

    const handleMenuPress = async (id: string) => {
        if (id === 'logout') {
            await signOut();
            router.replace('/');
        } else if (id === 'settings') {
            router.push('/(protected)/consumer/profile/settings');
        } else if (id === 'profile') {
            router.push('/(protected)/consumer/profile/info');
        } else if (id === 'payments') {
            router.push('/(protected)/consumer/profile/payments');
        } else if (id === 'help') {
            router.push('/(protected)/consumer/profile/help');
        }
    };

    // Customer profile image (Unsplash portrait or uploaded user picture)
    const profileImage = user?.profile_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Profile Header Section */}
                <View className="pt-16 px-6 pb-6">
                    <Text className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Profile</Text>
                </View>

                {/* Consumer Account Info (Clean Flat Row) */}
                <View className="px-6 pb-6">
                    <View className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-905 rounded-[24px] border border-slate-100 dark:border-slate-900">
                        <View className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                            <Image
                                source={{ uri: profileImage }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        </View>
                        <View className="ml-4 flex-1 justify-center">
                            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                {user?.name || 'User'}
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">
                                {user?.phone || 'No mobile linked'}
                            </Text>
                        </View>
                        <View className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1 rounded-full">
                            <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {user?.role || 'Consumer'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Account Options List */}
                <View className="px-6 mt-4">
                    <Text className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                        Account Options
                    </Text>
                    
                    <View className="border-t border-slate-100 dark:border-slate-900">
                        {MENU_ITEMS.map((item) => {
                            const IconLib = item.library;
                            const isDestructive = item.isDestructive;
                            return (
                                <TouchableOpacity 
                                    key={item.id} 
                                    onPress={() => handleMenuPress(item.id)}
                                    className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-900"
                                >
                                    <View className="flex-row items-center flex-1 mr-4">
                                        <View className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center border border-slate-100/50 dark:border-slate-800/30">
                                            <IconLib 
                                                name={item.icon as any} 
                                                size={18} 
                                                color={isDestructive ? '#EF4444' : (isDark ? '#94A3B8' : '#475569')} 
                                            />
                                        </View>
                                        <View className="ml-3 flex-1">
                                            <Text className={`text-base font-semibold ${isDestructive ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                                {item.title}
                                            </Text>
                                            <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                {item.description}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons 
                                        name="chevron-forward" 
                                        size={16} 
                                        color={isDestructive ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1')} 
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Bottom padding for scroll */}
                <View className="h-32" />
            </ScrollView>
        </View>
    );
}
