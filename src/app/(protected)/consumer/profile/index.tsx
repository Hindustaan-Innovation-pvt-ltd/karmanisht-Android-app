import { useAppContext } from '@/lib/context';
// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, Octicons } from '@expo/vector-icons';
import ConsumerNavbar from '@/components/consumer-navbar';
import { useRouter } from 'expo-router';

const MENU_ITEMS = [
    { id: 'profile', title: 'Profile Info', icon: 'person', library: Octicons },
    { id: 'payments', title: 'Payment History', icon: 'currency-rupee', library: MaterialCommunityIcons },
    { id: 'help', title: 'Help and Support', icon: 'headphones', library: Feather },
    { id: 'settings', title: 'Settings', icon: 'settings', library: Ionicons },
    { id: 'logout', title: 'Logout', icon: 'logout', library: MaterialCommunityIcons, color: '#EF4444' },
];

export default function ProfileScreen() {
    const { user, setUser, updateDatabaseProfile, refreshProfile, unlockedContacts, unlockedProviders, isUnlocked, unlockWorker, isOnline, setOnline, toggleOnlineStatus, isLoading, hasCheckedAuth, isSessionExpired, categories, userLocation, fetchCategories, sessionToken, workerStats, handleRazorpayPayment, updateProfile, updateWorkerSpecialties, signOut } = useAppContext();


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

    const initials = user?.name 
        ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header Background */}
                <View className="h-48 bg-slate-900 w-full" />

                {/* Profile Section */}
                <View className="px-8 -mt-16">
                    <View className="w-32 h-32 rounded-[28px] border-4 border-white shadow-xl bg-slate-100 items-center justify-center overflow-hidden">
                        {user?.name ? (
                            <View className="w-full h-full bg-blue-600 items-center justify-center">
                                <Text className="text-4xl font-black text-white">{initials}</Text>
                            </View>
                        ) : (
                            <Ionicons name="person" size={60} color="#CBD5E1" />
                        )}
                    </View>
                    <View className="mt-4">
                        <Text className="text-3xl font-bold text-gray-900">{user?.name || 'User'}</Text>
                        <Text className="text-lg text-gray-500 font-medium">{user?.phone || 'No phone set'}</Text>
                    </View>
                </View>

                {/* Menu List */}
                <View className="px-8 mt-10">
                    {MENU_ITEMS.map((item) => {
                        const IconLib = item.library;
                        return (
                            <TouchableOpacity 
                                key={item.id} 
                                onPress={() => handleMenuPress(item.id)}
                                className="flex-row items-center justify-between py-6 border-b border-gray-50"
                            >
                                <View className="flex-row items-center">
                                    <View className="w-10 items-center">
                                        <IconLib name={item.icon as any} size={24} color={item.color || 'black'} />
                                    </View>
                                    <Text className={`ml-4 text-xl font-bold ${item.id === 'logout' ? 'text-red-500' : 'text-gray-900'}`}>
                                        {item.title}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={item.id === 'logout' ? '#EF4444' : 'black'} />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Bottom padding for scroll */}
                <View className="h-32" />
            </ScrollView>

            <ConsumerNavbar activeTab="profile" />
        </View>
    );
}

