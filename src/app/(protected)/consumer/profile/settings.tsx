// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import { insforge } from '@/lib/insforge';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import ScalePressable from '@/components/scale-pressable';
import StickySwitch from '@/components/sticky-switch';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { user, signOut, updateDatabaseProfile, refreshProfile } = useAppStore();

    const { colorScheme, setColorScheme } = useColorScheme();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [shareLocation, setShareLocation] = useState(true);

    const [radiusKm, setRadiusKm] = useState(user?.searchRadiusKm || 5);
    const [updatingRadius, setUpdatingRadius] = useState(false);
    const [radiusModalVisible, setRadiusModalVisible] = useState(false);
    const [supportModalVisible, setSupportModalVisible] = useState(false);

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

    const handleCallSupport = () => {
        Linking.openURL('tel:+919876543210').catch(() => {
            Alert.alert("Error", "Unable to open phone dialer.");
        });
    };

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@hindustaninnovations.com?subject=Consumer Support Request').catch(() => {
            Alert.alert("Error", "Unable to open email client.");
        });
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

    const userAvatar = user?.profile_image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.name || "User");

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            {/* Minimal Header */}
            <View
                style={{ paddingTop: Math.max(insets.top, 12) }}
                className="pb-4 px-6 flex-row items-center justify-between bg-white dark:bg-slate-950 border-b border-slate-50 dark:border-slate-900/50"
            >
                <ScalePressable
                    onPress={() => router.back()}
                    hapticType="light"
                    className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                </ScalePressable>
                <Text className="text-lg font-black text-slate-900 dark:text-white">Settings</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                {/* ── PROFILE PROFILE CARD ── */}
                <View className="my-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-5 flex-row items-center gap-4">
                    <Image source={{ uri: userAvatar }} className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-800" />
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-slate-900 dark:text-slate-100" numberOfLines={1}>
                            {user?.name || 'Consumer Profile'}
                        </Text>
                        <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5" numberOfLines={1}>
                            {user?.phone || user?.email || 'No contact details'}
                        </Text>
                        <View className="self-start mt-2 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/35 rounded-full border border-blue-200 dark:border-blue-900/30">
                            <Text className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                                Consumer Account
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── SECTION 1: SERVICE CONFIGURATION ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-2">
                    Service Config
                </Text>
                <View className="mb-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden">
                    {/* Location Row */}
                    <ScalePressable
                        onPress={() => router.push('/(location)/locationinfo')}
                        hapticType="light"
                        className="flex-row items-center justify-between p-4 bg-transparent"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/20 items-center justify-center">
                                <Feather name="map-pin" size={18} color="#3B82F6" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Search Location</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5" numberOfLines={1}>
                                    {user?.location || 'Not configured'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />

                    {/* Radius Row */}
                    <ScalePressable
                        onPress={() => setRadiusModalVisible(true)}
                        hapticType="light"
                        className="flex-row items-center justify-between p-4 bg-transparent"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/20 items-center justify-center">
                                <Feather name="compass" size={18} color="#6366F1" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Search Radius</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    {radiusKm} km radius
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />
                </View>

                {/* ── SECTION 2: APP PREFERENCES ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-2">
                    Preferences
                </Text>
                <View className="mb-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden">
                    {/* Dark Mode Row */}
                    <View className="flex-row items-center justify-between p-4 bg-transparent">
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/20 items-center justify-center">
                                <Feather name="moon" size={18} color="#8B5CF6" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Dark Mode</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    Toggle theme preference
                                </Text>
                            </View>
                        </View>
                        <StickySwitch
                            value={colorScheme === 'dark'}
                            onValueChange={(val) => setColorScheme(val ? 'dark' : 'light')}
                            activeColor="#8B5CF6"
                        />
                    </View>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />

                    {/* Notifications Row */}
                    <View className="flex-row items-center justify-between p-4 bg-transparent">
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 items-center justify-center">
                                <Feather name="bell" size={18} color="#F59E0B" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Push Notifications</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    Alerts on service updates
                                </Text>
                            </View>
                        </View>
                        <StickySwitch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            activeColor="#F59E0B"
                        />
                    </View>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />

                    {/* Location Sharing Row */}
                    <View className="flex-row items-center justify-between p-4 bg-transparent">
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-950/20 items-center justify-center">
                                <Feather name="navigation" size={18} color="#06B6D4" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Share Coordinates</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    Let workers view location
                                </Text>
                            </View>
                        </View>
                        <StickySwitch
                            value={shareLocation}
                            onValueChange={setShareLocation}
                            activeColor="#06B6D4"
                        />
                    </View>
                </View>

                {/* ── SECTION 3: LEGAL & SUPPORT ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-2">
                    Legal & Support
                </Text>
                <View className="mb-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden">
                    {/* Privacy Row */}
                    <ScalePressable
                        onPress={() => {
                            setPolicyType('privacy');
                            setPolicyVisible(true);
                        }}
                        hapticType="light"
                        className="flex-row items-center justify-between p-4 bg-transparent"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                <Feather name="lock" size={18} color="#64748B" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Privacy Policy</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-medium">How we handle telemetry data</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />

                    {/* Terms Row */}
                    <ScalePressable
                        onPress={() => {
                            setPolicyType('terms');
                            setPolicyVisible(true);
                        }}
                        hapticType="light"
                        className="flex-row items-center justify-between p-4 bg-transparent"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                <Feather name="file-text" size={18} color="#64748B" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Terms of Service</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-medium">Platform user agreement rules</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />

                    {/* Help Support */}
                    <ScalePressable
                        onPress={() => setSupportModalVisible(true)}
                        hapticType="light"
                        className="flex-row items-center justify-between p-4 bg-transparent"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                <Feather name="help-circle" size={18} color="#64748B" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Help & Support</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-medium">Reach our dedicated support</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>
                </View>

                {/* ── SECTION 4: ACTIONS ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-2">
                    Account
                </Text>
                <View className="mb-10 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden">
                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />

                    {/* Delete Account Row */}
                    <ScalePressable
                        onPress={handleDeleteAccount}
                        hapticType="heavy"
                        className="flex-row items-center justify-between p-4 bg-transparent"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/20 items-center justify-center">
                                <Feather name="trash-2" size={18} color="#EF4444" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-red-500">Delete Account</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-semibold mt-0.5">
                                    Permanently wipe your profile
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
                    </ScalePressable>
                </View>

                {/* Footer Brand */}
                <Text className="text-center text-slate-350 dark:text-slate-700 text-[10px] font-black mb-16 tracking-widest uppercase">
                    HINDUSTAN INNOVATIONS • V1.0.4
                </Text>
            </ScrollView>

            {/* Search Radius Modal */}
            <Modal
                visible={radiusModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setRadiusModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/40">
                    <View className="bg-white dark:bg-slate-900 rounded-t-[28px] p-6 pb-8 border-t border-slate-100 dark:border-slate-800 shadow-xl">
                        <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-6" />
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-slate-950 dark:text-slate-100">Search Radius</Text>
                            <ScalePressable
                                onPress={() => setRadiusModalVisible(false)}
                                hapticType="light"
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </ScalePressable>
                        </View>
                        <Text className="text-slate-400 dark:text-slate-500 text-xs font-semibold mb-6">
                            Select the maximum distance (in kilometers) to discover local service providers around you.
                        </Text>

                        <View className="flex-row flex-wrap justify-between">
                            {[2, 5, 10, 15, 20, 30, 50].map((opt) => (
                                <ScalePressable
                                    key={opt}
                                    onPress={() => handleRadiusChange(opt)}
                                    hapticType="selection"
                                    className={`w-[31%] py-3.5 rounded-xl items-center justify-center mb-3.5 border ${radiusKm === opt
                                        ? 'bg-blue-600 border-blue-600 dark:bg-blue-600 dark:border-blue-600'
                                        : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                                        }`}
                                >
                                    <Text className={`font-bold text-sm ${radiusKm === opt ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {opt} KM
                                    </Text>
                                </ScalePressable>
                            ))}
                        </View>
                        {updatingRadius && (
                            <View className="flex-row items-center justify-center mt-3 gap-2">
                                <ActivityIndicator size="small" color={colors.tint} />
                                <Text className="text-xs text-slate-400">Updating settings...</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Help & Support Modal */}
            <Modal
                visible={supportModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSupportModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/40">
                    <View className="bg-white dark:bg-slate-900 rounded-t-[28px] p-6 pb-8 border-t border-slate-100 dark:border-slate-800 shadow-xl">
                        <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-6" />

                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-xl font-bold text-slate-950 dark:text-slate-100">Help & Support</Text>
                            <ScalePressable
                                onPress={() => setSupportModalVisible(false)}
                                hapticType="light"
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </ScalePressable>
                        </View>
                        <Text className="text-slate-400 dark:text-slate-550 text-xs font-semibold mb-6">
                            We are here to assist you. Select a channel to get in touch with our team.
                        </Text>

                        {/* Channels */}
                        <ScalePressable
                            onPress={handleCallSupport}
                            hapticType="medium"
                            className="flex-row items-center bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-4 rounded-xl mb-4"
                        >
                            <View className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-950/30 items-center justify-center">
                                <Ionicons name="call" size={20} color="#22C55E" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Call Helpline</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">+91 98765 43210</Text>
                            </View>
                            <Feather name="external-link" size={16} color="#CBD5E1" />
                        </ScalePressable>

                        <ScalePressable
                            onPress={handleEmailSupport}
                            hapticType="medium"
                            className="flex-row items-center bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-4 rounded-xl mb-6"
                        >
                            <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 items-center justify-center">
                                <Ionicons name="mail" size={20} color="#3B82F6" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Email Support</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">support@hindustaninnovations.com</Text>
                            </View>
                            <Feather name="external-link" size={16} color="#CBD5E1" />
                        </ScalePressable>

                        <Text className="text-center text-slate-400 dark:text-slate-550 text-[10px] font-bold">
                            TIMINGS: 9 AM - 6 PM (MON - SAT)
                        </Text>
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
                    <View
                        style={{ paddingTop: Math.max(insets.top, 16) }}
                        className="pb-6 px-6 flex-row items-center justify-between border-b border-slate-50 dark:border-slate-900"
                    >
                        <Text className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                            {policyType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                        </Text>
                        <ScalePressable
                            onPress={() => setPolicyVisible(false)}
                            hapticType="light"
                            className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800"
                        >
                            <Ionicons name="close" size={24} color={colors.text} />
                        </ScalePressable>
                    </View>
                    <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                        {policyType === 'privacy' ? (
                            <View className="space-y-4">
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 font-sans">1. Data We Collect</Text>
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
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">1. Services Provided</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Our platform acts as a discovery service connecting consumers with local services and service providers. We do not guarantee quality of service, availability, or actions of service providers.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">2. Booking & Cancellation</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    All negotiations, pricing, and tasks are directly between the consumer and the provider. The platform acts as a direct messaging helper and does not take responsibility for payment disputes or cancellations.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">3. Code of Conduct</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                                    Any misuse, harassing behavior, fake bookings, or spamming will result in immediate termination of the consumer profile without prior notice.
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
