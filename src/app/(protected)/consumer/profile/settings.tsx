// @ts-nocheck
import { insforge } from '@/lib/insforge';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { user, signOut, updateDatabaseProfile, refreshProfile } = useAppStore();

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

    // Helper setting row component aligned with mockup style
    const SettingItem = ({ 
        icon, 
        label, 
        value, 
        onPress, 
        iconColor = "#64748B", 
        isDestructive = false,
        showDivider = true
    }: { 
        icon: string; 
        label: string; 
        value?: string; 
        onPress: () => void; 
        iconColor?: string; 
        isDestructive?: boolean;
        showDivider?: boolean;
    }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.5}
            className="flex-row items-center justify-between py-4"
        >
            <View className="flex-row items-center flex-1 pr-4">
                {/* Light gray circle icon matching mockup */}
                <View className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center border border-slate-100/50 dark:border-slate-800/50">
                    <Feather name={icon as any} size={20} color={iconColor} />
                </View>
                <View className="ml-4 flex-1">
                    <Text className={`text-base font-bold ${isDestructive ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{label}</Text>
                    {value && (
                        <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5" numberOfLines={1}>
                            {value}
                        </Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isDestructive ? '#FCA5A5' : '#CBD5E1'} />
            {showDivider && (
                <View className="absolute bottom-0 left-16 right-0 h-[1px] bg-slate-100/80 dark:bg-slate-800/50" />
            )}
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            {/* Minimal Header with Back Button */}
            <View 
                style={{ paddingTop: Math.max(insets.top, 12) }} 
                className="pb-2 px-6 flex-row items-center bg-white dark:bg-slate-950"
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                
                {/* Bold Settings Title */}
                <Text className="text-3xl font-black text-slate-950 dark:text-white mt-2 mb-8">
                    Settings
                </Text>

                {/* SERVICE CONFIGURATION */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                    Service Configuration
                </Text>
                <View className="mb-8">
                    <SettingItem 
                        icon="map-pin"
                        label="Edit search location"
                        value={`Currently: ${user?.location || 'Not configured'}`}
                        onPress={() => router.push('/(location)/locationinfo')}
                        showDivider={true}
                    />
                    <SettingItem 
                        icon="compass"
                        label="Edit service radius"
                        value={`Currently: ${radiusKm} km`}
                        onPress={() => setRadiusModalVisible(true)}
                        showDivider={true}
                    />
                    <SettingItem 
                        icon="user"
                        label="Edit profile details"
                        value="Name, photo, experience"
                        onPress={() => router.push('/(protected)/consumer/profile/info')}
                        showDivider={false}
                    />
                </View>

                {/* ACCOUNT */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                    Account
                </Text>
                <View className="mb-10">
                    <SettingItem 
                        icon="lock"
                        label="Privacy policy"
                        value="How we use your data"
                        onPress={() => {
                            setPolicyType('privacy');
                            setPolicyVisible(true);
                        }}
                        showDivider={true}
                    />
                    <SettingItem 
                        icon="file-text"
                        label="Terms of Service"
                        value="User agreements & rules"
                        onPress={() => {
                            setPolicyType('terms');
                            setPolicyVisible(true);
                        }}
                        showDivider={true}
                    />
                    <SettingItem 
                        icon="help-circle"
                        label="Help and support"
                        value="Contact the team"
                        onPress={() => setSupportModalVisible(true)}
                        showDivider={true}
                    />
                    <SettingItem 
                        icon="log-out"
                        label="Logout"
                        value="Sign out of your session"
                        onPress={async () => {
                            await signOut();
                            router.replace('/');
                        }}
                        showDivider={true}
                    />
                    <SettingItem 
                        icon="trash-2"
                        label="Delete Account"
                        value="Permanently delete your profile"
                        onPress={handleDeleteAccount}
                        iconColor="#EF4444"
                        isDestructive={true}
                        showDivider={false}
                    />
                </View>

                <Text className="text-center text-slate-300 dark:text-slate-700 text-[10px] font-black mb-16 tracking-widest uppercase">
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
                            <TouchableOpacity
                                onPress={() => setRadiusModalVisible(false)}
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-slate-450 dark:text-slate-550 text-xs font-semibold mb-6">
                            Select the maximum distance (in kilometers) to discover local service providers around you.
                        </Text>

                        <View className="flex-row flex-wrap justify-between">
                            {[2, 5, 10, 15, 20, 30, 50].map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    onPress={() => handleRadiusChange(opt)}
                                    className={`w-[31%] py-3.5 rounded-xl items-center justify-center mb-3.5 border ${radiusKm === opt
                                            ? 'bg-blue-600 border-blue-600 dark:bg-blue-600 dark:border-blue-600'
                                            : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                                        }`}
                                >
                                    <Text className={`font-bold text-sm ${radiusKm === opt ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {opt} KM
                                    </Text>
                                </TouchableOpacity>
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
                            <TouchableOpacity
                                onPress={() => setSupportModalVisible(false)}
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-slate-450 dark:text-slate-550 text-xs font-semibold mb-6">
                            We are here to assist you. Select a channel to get in touch with our team.
                        </Text>

                        {/* Channels */}
                        <TouchableOpacity
                            onPress={handleCallSupport}
                            activeOpacity={0.7}
                            className="flex-row items-center bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-4 rounded-xl mb-4"
                        >
                            <View className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-950/30 items-center justify-center">
                                <Ionicons name="call" size={20} color="#22C55E" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Call Helpline</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">+91 98765 43210</Text>
                            </View>
                            <Feather name="external-link" size={16} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleEmailSupport}
                            activeOpacity={0.7}
                            className="flex-row items-center bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-4 rounded-xl mb-6"
                        >
                            <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 items-center justify-center">
                                <Ionicons name="mail" size={20} color="#3B82F6" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Email Support</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">support@hindustaninnovations.com</Text>
                            </View>
                            <Feather name="external-link" size={16} color="#CBD5E1" />
                        </TouchableOpacity>

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
