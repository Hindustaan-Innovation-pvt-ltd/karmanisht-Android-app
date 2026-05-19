import { useAppStore } from '@/lib/store';
// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';

const MENU_ITEMS = [
    { id: 'profile', title: 'Profile Info', icon: 'person', library: Octicons, color: '#6366F1', bg: '#EEF2FF', darkBg: '#312E81' },
    { id: 'payments', title: 'Payment History', icon: 'currency-rupee', library: MaterialCommunityIcons, color: '#10B981', bg: '#ECFDF5', darkBg: '#064E3B' },
    { id: 'help', title: 'Help and Support', icon: 'headphones', library: Feather, color: '#3B82F6', bg: '#EFF6FF', darkBg: '#1E3A8A' },
    { id: 'settings', title: 'Settings', icon: 'settings', library: Ionicons, color: '#64748B', bg: '#F8FAFC', darkBg: '#334155' },
    { id: 'logout', title: 'Logout', icon: 'logout', library: MaterialCommunityIcons, color: '#EF4444', bg: '#FEF2F2', darkBg: '#7F1D1D' },
];

export default function ProfileScreen() {
    const { colors, isDark } = useTheme();
    const user = useAppStore(state => state.user);
    const signOut = useAppStore(state => state.signOut);
    const unlockedContacts = useAppStore(state => state.unlockedContacts || []);
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
                {/* Header Background */}
                <View className="h-56 bg-slate-900 dark:bg-slate-900 w-full justify-end px-8 pb-16">
                    <Text className="text-white text-3xl font-black tracking-tight">Your Account</Text>
                    <Text className="text-slate-400 font-medium text-sm mt-1">Manage profiles, transactions, and settings</Text>
                </View>

                {/* Profile Section */}
                <View className="px-6 -mt-12">
                    <View className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex-row items-center">
                        <View className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-md">
                            <Image
                                source={{ uri: profileImage }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        </View>
                        <View className="ml-5 flex-1 justify-center">
                            <View className="flex-row items-center flex-wrap">
                                <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mr-2" numberOfLines={1}>
                                    {user?.name || 'User'}
                                </Text>
                            </View>
                            <Text className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-0.5">
                                {user?.phone || 'No mobile linked'}
                            </Text>
                            <View className="flex-row mt-2.5">
                                <View className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/30 px-2.5 py-1 rounded-lg">
                                    <Text className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                        {user?.role || 'Consumer'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>


                {/* Menu List Card */}
                <View className="px-6 mt-8">
                    <Text className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">Account Options</Text>
                    <View className="bg-slate-50 dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm p-2">
                        {MENU_ITEMS.map((item, idx) => {
                            const IconLib = item.library;
                            return (
                                <TouchableOpacity 
                                    key={item.id} 
                                    onPress={() => handleMenuPress(item.id)}
                                    className={`flex-row items-center justify-between py-5 px-4 ${idx !== MENU_ITEMS.length - 1 ? 'border-b border-slate-150 dark:border-slate-800/80' : ''}`}
                                >
                                    <View className="flex-row items-center">
                                        <View 
                                            style={{ backgroundColor: isDark ? item.darkBg : item.bg }} 
                                            className="w-11 h-11 rounded-2xl items-center justify-center"
                                        >
                                            <IconLib name={item.icon as any} size={20} color={item.color} />
                                        </View>
                                        <Text className={`ml-4 text-base font-bold ${item.id === 'logout' ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                            {item.title}
                                        </Text>
                                    </View>
                                    <Ionicons 
                                        name="chevron-forward" 
                                        size={18} 
                                        color={item.id === 'logout' ? '#EF4444' : colors.inactive} 
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

