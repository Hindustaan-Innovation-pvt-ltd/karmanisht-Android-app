import { useAppStore } from '@/lib/store';
// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
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
    const { isDark } = useTheme();
    const user = useAppStore(state => state.user);
    const signOut = useAppStore(state => state.signOut);
    const unlockedProviders = useAppStore(state => state.unlockedProviders);
    const router = useRouter();

    const menuItems = React.useMemo(() => {
        const items = [...MENU_ITEMS];
        if (user?.role === 'admin') {
            items.unshift({
                id: 'admin',
                title: 'Admin Console',
                description: 'Manage users, categories, tags and audit logs',
                icon: 'shield-checkmark',
                library: Ionicons
            });
        }
        return items;
    }, [user?.role]);

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
        } else if (id === 'admin') {
            router.push('/admin');
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
                <View className="px-6 pb-4">
                    <View className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800">
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

                {/* Minimalist Stats Row */}
                <View className="px-6 pb-6">
                    <View className="flex-row justify-between bg-slate-50 dark:bg-slate-900/50 rounded-[24px] border border-slate-100 dark:border-slate-800 p-4">
                        <View className="flex-1 items-center">
                            <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                {unlockedProviders?.length || 0}
                            </Text>
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                                Connected Pros
                            </Text>
                        </View>
                        <View className="w-[1px] bg-slate-200 dark:bg-slate-800" />
                        <View className="flex-1 items-center">
                            <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                {user?.searchRadiusKm || 5} KM
                            </Text>
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                                Search Scope
                            </Text>
                        </View>
                        <View className="w-[1px] bg-slate-200 dark:bg-slate-800" />
                        <View className="flex-1 items-center">
                            <View className="flex-row items-center gap-1">
                                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                                <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    Verified
                                </Text>
                            </View>
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                                Trust Badge
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Account Options List */}
                <View className="px-6 mt-2">
                    <Text className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                        Account Options
                    </Text>

                    <View className="border-t border-slate-100 dark:border-slate-900">
                        {menuItems.map((item) => {
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
                                            <Text className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">
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

                {/* Trust & Security Section */}
                <View className="px-6 mt-8">
                    <Text className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                        Trust & Platform Safety
                    </Text>
                    <View className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-4 rounded-[24px] gap-3">
                        <View className="flex-row items-start">
                            <View className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/20 items-center justify-center mt-0.5 border border-emerald-100 dark:border-emerald-900/40">
                                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                            </View>
                            <View className="ml-3 flex-1">
                                <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">Verified Consumer Status</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 mt-0.5 leading-relaxed">
                                    Your phone and device identity are securely verified to prevent fake bookings and spam listings.
                                </Text>
                            </View>
                        </View>
                        <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50" />
                        <View className="flex-row items-start">
                            <View className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/20 items-center justify-center mt-0.5 border border-blue-100 dark:border-blue-900/40">
                                <Ionicons name="lock-closed" size={16} color="#3B82F6" />
                            </View>
                            <View className="ml-3 flex-1">
                                <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">Privacy Shield Enabled</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 mt-0.5 leading-relaxed">
                                    Your contact number is masked. It is only shared with service providers you explicitly unlock.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Bottom padding for scroll */}
                <View className="h-32" />
            </ScrollView>
        </View>
    );
}
