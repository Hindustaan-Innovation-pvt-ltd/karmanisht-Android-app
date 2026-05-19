// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user, signOut, updateDatabaseProfile, refreshProfile } = useAppStore();
    
    const [radiusKm, setRadiusKm] = useState(user?.searchRadiusKm || 5);
    const [updatingRadius, setUpdatingRadius] = useState(false);
    const [radiusModalVisible, setRadiusModalVisible] = useState(false);
    
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
            setRadiusModalVisible(false);
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

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            {/* Header */}
            <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-slate-50 dark:border-slate-800">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl items-center justify-center border border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                
                {/* SERVICE DISCOVERY SECTION */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Service Discovery</Text>
                <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm mb-6 overflow-hidden">
                    
                    {/* Edit Search Location */}
                    <TouchableOpacity
                        onPress={() => router.push('/(location)/locationinfo')}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                <Feather name="map-pin" size={20} color={colors.tint} />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Edit search location</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5" numberOfLines={1}>
                                    Currently: {user?.location || 'Not configured'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Edit Search Radius */}
                    <TouchableOpacity
                        onPress={() => setRadiusModalVisible(true)}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                <Feather name="compass" size={20} color={colors.tint} />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Edit search radius</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                    Currently: {radiusKm} km
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Edit Profile Details */}
                    <TouchableOpacity
                        onPress={() => router.push('/(protected)/consumer/profile/info')}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                <Feather name="user" size={20} color={colors.tint} />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Edit profile details</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                    Name, photo, phone
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                {/* ACCOUNT SECTION */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Account</Text>
                <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm mb-12 overflow-hidden">
                    
                    {/* Privacy Policy */}
                    <TouchableOpacity
                        onPress={() => {
                            setPolicyType('privacy');
                            setPolicyVisible(true);
                        }}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                <Feather name="lock" size={20} color={colors.tint} />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Privacy policy</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                    How we use your data
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Help and Support */}
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert("Support Team", "Reach out to us at: support@hindustaninnovations.com\nPhone: +91 98765 43210");
                        }}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                <Feather name="help-circle" size={20} color={colors.tint} />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Help and support</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                    Contact the team
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Logout */}
                    <TouchableOpacity
                        onPress={async () => {
                            await signOut();
                            router.replace('/');
                        }}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                <Feather name="log-out" size={20} color="#64748B" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-700 dark:text-slate-300">Logout</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                    Sign out of your session
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Delete Account */}
                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/30 items-center justify-center">
                                <Feather name="trash-2" size={20} color="#EF4444" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-red-500">Delete Account</Text>
                                <Text className="text-xs text-red-400 dark:text-red-600/70 font-medium mt-0.5">
                                    Permanently delete account
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                <Text className="text-center text-slate-300 text-[10px] font-bold mt-2 mb-12 tracking-widest">
                    HINDUSTAN INNOVATIONS • V1.0.4
                </Text>
            </ScrollView>

            {/* Service Radius Selector Modal */}
            <Modal
                visible={radiusModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setRadiusModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Search Radius</Text>
                            <TouchableOpacity 
                                onPress={() => setRadiusModalVisible(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                            >
                                <Ionicons name="close" size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6">
                            Choose the maximum distance (in kilometers) within which you wish to discover local service providers.
                        </Text>

                        <View className="flex-row flex-wrap justify-between">
                            {[2, 5, 10, 15, 20, 30, 50].map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    onPress={() => handleRadiusChange(opt)}
                                    className={`w-[30%] py-4.5 rounded-2xl items-center justify-center mb-4 border ${
                                        radiusKm === opt 
                                            ? 'bg-black dark:bg-blue-600 border-black dark:border-blue-600' 
                                            : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                                    }`}
                                >
                                    <Text className={`font-black text-sm ${
                                        radiusKm === opt ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {opt} KM
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {updatingRadius && (
                            <View className="flex-row items-center justify-center mt-4 gap-2">
                                <ActivityIndicator size="small" color={colors.tint} />
                                <Text className="text-xs text-slate-400">Updating radius...</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

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
                        <View className="h-20" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
