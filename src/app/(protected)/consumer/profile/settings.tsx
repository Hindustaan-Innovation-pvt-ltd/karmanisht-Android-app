// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, Image, Platform } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user, signOut, updateDatabaseProfile, refreshProfile } = useAppStore();
    const [notifications, setNotifications] = useState(true);
    const [location, setLocation] = useState(true);
    const [radiusKm, setRadiusKm] = useState(user?.searchRadiusKm || 5);
    const [updatingRadius, setUpdatingRadius] = useState(false);
    
    // Modal states for policies
    const [policyVisible, setPolicyVisible] = useState(false);
    const [policyType, setPolicyType] = useState<'privacy' | 'terms'>('privacy');

    // Sync state if user context updates
    useEffect(() => {
        if (user?.searchRadiusKm) {
            setRadiusKm(user.searchRadiusKm);
        }
    }, [user]);

    const handleRadiusChange = async (opt: number) => {
        setRadiusKm(opt);
        setUpdatingRadius(true);
        try {
            await updateDatabaseProfile({ searchRadiusKm: opt });
            await refreshProfile();
        } catch (error) {
            console.error("Error updating radius:", error);
            Alert.alert("Update Failed", "Could not sync your distance settings.");
        } finally {
            setUpdatingRadius(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account Permanently",
            "Are you sure you want to permanently delete your consumer account? This action cannot be undone and all active requests, history, and records will be deleted forever.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete My Account", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (user?.id) {
                                // 1. Clean up unlocked contact transactions and reviews
                                await insforge.database.from('reviews').delete().eq('user_id', user.id);
                                await insforge.database.from('unlock_transactions').delete().eq('user_id', user.id);
                                
                                // Create account deletion audit requests log
                                await insforge.database.from('account_deletion_requests').insert([{
                                    user_id: user.id,
                                    user_type: 'consumer',
                                    mobile: user.phone || '',
                                    full_name: user.name || 'Anonymous Consumer',
                                    reason: 'Self-deleted from Consumer Settings',
                                    status: 'processed',
                                    processed_at: new Date().toISOString(),
                                    processed_by: 'user',
                                    admin_notes: 'Self-deletion completed successfully.'
                                }]);

                                // 2. Delete the core user record
                                const { error } = await insforge.database.from('users').delete().eq('id', user.id);
                                if (error) {
                                    Alert.alert("Error", "Failed to delete account: " + error.message);
                                    return;
                                }
                            }
                            await signOut();
                            Alert.alert("Account Deleted", "Your consumer profile has been permanently removed.");
                            router.replace('/');
                        } catch (err) {
                            console.error(err);
                            Alert.alert("Error", "Failed to complete account deletion.");
                        }
                    }
                }
            ]
        );
    };

    const handleItemPress = (itemId: string) => {
        if (itemId === 'delete') {
            handleDeleteAccount();
        } else if (itemId === 'privacy') {
            setPolicyType('privacy');
            setPolicyVisible(true);
        } else if (itemId === 'terms') {
            setPolicyType('terms');
            setPolicyVisible(true);
        }
    };

    // Customer profile image (Unsplash portrait or uploaded user picture)
    const profileImage = user?.profile_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            {/* Header */}
            <View className="pt-14 pb-6 px-6 flex-row items-center border-b border-slate-50 dark:border-slate-800">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl items-center justify-center border border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Consumer Account Profile Box */}
                <View className="bg-slate-50 dark:bg-slate-900 p-5 rounded-[28px] flex-row items-center border border-slate-100 dark:border-slate-800 mb-8 shadow-sm">
                    <Image
                        source={{ uri: profileImage }}
                        className="w-16 h-16 rounded-[20px] bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700"
                        resizeMode="cover"
                    />
                    <View className="ml-4 flex-1">
                        <Text className="text-xl font-bold text-slate-900 dark:text-slate-100" numberOfLines={1}>
                            {user?.name || 'Consumer Profile'}
                        </Text>
                        <Text className="text-slate-400 dark:text-slate-500 font-bold text-sm mt-0.5">
                            {user?.phone || 'Linked via Mobile'}
                        </Text>
                    </View>
                    <View className="bg-green-100 dark:bg-green-900/30 px-3.5 py-1.5 rounded-full border border-green-200/50 dark:border-green-800/30">
                        <Text className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Active</Text>
                    </View>
                </View>

                {/* Service Discovery Radius Setting */}
                <View className="mb-8">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Search Distance Range</Text>
                        {updatingRadius && <ActivityIndicator size="small" color={colors.tint} />}
                    </View>
                    
                    <View className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-4">
                            Select the maximum radius (in kilometers) within which you wish to discover local service providers.
                        </Text>
                        <View className="flex-row justify-between items-center bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-150 dark:border-slate-800">
                            {[2, 5, 10, 20].map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    onPress={() => handleRadiusChange(opt)}
                                    className={`px-4 py-3.5 rounded-xl flex-1 items-center justify-center ${radiusKm === opt ? 'bg-black dark:bg-blue-600' : 'bg-transparent'}`}
                                >
                                    <Text className={`font-black text-sm ${radiusKm === opt ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {opt} KM
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Preferences */}
                <View className="mb-8">
                    <Text className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">Preferences</Text>
                    <View className="bg-slate-50 dark:bg-slate-900 rounded-[28px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                        {/* Notifications toggle */}
                        <View className="flex-row items-center justify-between p-5 border-b border-slate-150 dark:border-slate-800/80">
                            <View className="flex-row items-center">
                                <Feather name="bell" size={20} color={colors.tint} />
                                <Text className="ml-4 text-base font-bold text-slate-800 dark:text-slate-200">Push Notifications</Text>
                            </View>
                            <Switch 
                                value={notifications} 
                                onValueChange={setNotifications}
                                trackColor={{ false: isDark ? '#1e293b' : '#E2E8F0', true: colors.tint }}
                                thumbColor="#FFF"
                            />
                        </View>

                        {/* Location access toggle */}
                        <View className="flex-row items-center justify-between p-5">
                            <View className="flex-row items-center">
                                <Feather name="map-pin" size={20} color={colors.tint} />
                                <Text className="ml-4 text-base font-bold text-slate-800 dark:text-slate-200">Location Services</Text>
                            </View>
                            <Switch 
                                value={location} 
                                onValueChange={setLocation}
                                trackColor={{ false: isDark ? '#1e293b' : '#E2E8F0', true: colors.tint }}
                                thumbColor="#FFF"
                            />
                        </View>
                    </View>
                </View>

                {/* Account & Policies */}
                <View className="mb-8">
                    <Text className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">Legal & Account</Text>
                    <View className="bg-slate-50 dark:bg-slate-900 rounded-[28px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                        {/* Privacy Policy */}
                        <TouchableOpacity 
                            onPress={() => handleItemPress('privacy')}
                            className="flex-row items-center justify-between p-5 border-b border-slate-150 dark:border-slate-800/80"
                        >
                            <View className="flex-row items-center">
                                <Feather name="shield" size={20} color={colors.tint} />
                                <Text className="ml-4 text-base font-bold text-slate-800 dark:text-slate-200">Privacy Policy</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
                        </TouchableOpacity>

                        {/* Terms */}
                        <TouchableOpacity 
                            onPress={() => handleItemPress('terms')}
                            className="flex-row items-center justify-between p-5 border-b border-slate-150 dark:border-slate-800/80"
                        >
                            <View className="flex-row items-center">
                                <Feather name="file-text" size={20} color={colors.tint} />
                                <Text className="ml-4 text-base font-bold text-slate-800 dark:text-slate-200">Terms of Service</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
                        </TouchableOpacity>

                        {/* Delete Permanent */}
                        <TouchableOpacity 
                            onPress={() => handleItemPress('delete')}
                            className="flex-row items-center justify-between p-5"
                        >
                            <View className="flex-row items-center">
                                <Feather name="trash-2" size={20} color="#EF4444" />
                                <Text className="ml-4 text-base font-bold text-red-500">Delete Account</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Styled Sign Out Button */}
                <TouchableOpacity
                    onPress={async () => {
                        await signOut();
                        router.replace('/');
                    }}
                    className="flex-row items-center justify-center py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-12 border border-slate-200/50 dark:border-slate-800"
                >
                    <Feather name="log-out" size={20} color={colors.textMuted} />
                    <Text className="ml-2 font-bold text-slate-600 dark:text-slate-300">Sign Out of Account</Text>
                </TouchableOpacity>

                <View className="h-10" />
            </ScrollView>

            {/* Privacy and Terms Modal View */}
            <Modal
                visible={policyVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setPolicyVisible(false)}
            >
                <View className="flex-1 bg-white dark:bg-slate-950">
                    <View className="pt-14 pb-6 px-6 flex-row items-center justify-between border-b border-slate-50 dark:border-slate-800">
                        <Text className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                            {policyType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                        </Text>
                        <TouchableOpacity 
                            onPress={() => setPolicyVisible(false)}
                            className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800"
                        >
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                        {policyType === 'privacy' ? (
                            <View className="space-y-4">
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">1. Data We Collect</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    We collect basic registration information such as your name, mobile phone number, location details, and distance search radius to successfully match you with nearby service workers.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">2. Sharing with Providers</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    When you choose to unlock a contact card, your basic contact and search coordinates are shared with the respective service provider to enable direct communication and localized service delivery.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">3. Security Practices</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                                    Your information is encrypted and stored securely using our advanced backend platform. We do not sell or lease consumer telemetry or personal files to third-party marketing companies.
                                </Text>
                            </View>
                        ) : (
                            <View className="space-y-4">
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">1. Usage License</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Our platform acts as a neutral marketplace facilitator that connects customers looking for help with independent localized professionals. We are not responsible for direct outcomes.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">2. Transaction Policies</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Unlocking contact cards is governed by credit quotas or local payment gateways. Completed unlocks are final and grant immediate, unrestricted access to the provider&apos;s coordinates.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">3. Termination Rules</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                                    Users violating standard communication decencies or fabricating locations are subject to instant termination and permanent mobile ban from the platform.
                                </Text>
                            </View>
                        )}
                        <View className="h-20" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
