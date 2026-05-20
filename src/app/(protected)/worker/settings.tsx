// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';

export default function WorkerSettings() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    
    const { 
        user, 
        isOnline, 
        toggleOnlineStatus, 
        signOut, 
        updateDatabaseProfile, 
        refreshProfile,
        categories,
        fetchCategories
    } = useAppStore();

    // Policy Modal States
    const [policyVisible, setPolicyVisible] = useState(false);
    const [policyType, setPolicyType] = useState<'privacy' | 'terms'>('privacy');

    // Radius Modal States
    const [radiusModalVisible, setRadiusModalVisible] = useState(false);
    const [updatingRadius, setUpdatingRadius] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const professionName = useMemo(() => {
        if (!user?.professionId || !categories) return 'Not set';
        const match = categories.find(c => c.id === user.professionId);
        return match ? match.name : 'Not set';
    }, [user?.professionId, categories]);

    const handleRadiusChange = async (opt: number) => {
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

    const handleLogout = async () => {
        await signOut();
        router.replace('/');
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to permanently delete your worker profile? This action cannot be undone and all your ratings, reviews, specialities, and active leads will be permanently deleted.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Permanent",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (user?.id) {
                                // 1. Delete reviews
                                await insforge.database.from('reviews').delete().eq('provider_id', user.id);
                                // 2. Delete unlock_transactions
                                await insforge.database.from('unlock_transactions').delete().eq('provider_id', user.id);
                                // 3. Delete provider_locations
                                await insforge.database.from('provider_locations').delete().eq('provider_id', user.id);
                                // 4. Delete provider_services
                                await insforge.database.from('provider_services').delete().eq('provider_id', user.id);
                                
                                // Create deletion audit request log
                                await insforge.database.from('account_deletion_requests').insert([{
                                    user_id: user.id,
                                    user_type: 'worker',
                                    mobile: user.phone || '',
                                    full_name: user.name || 'Anonymous',
                                    reason: 'Self-deleted from Worker Settings',
                                    status: 'processed',
                                    processed_at: new Date().toISOString(),
                                    processed_by: 'user',
                                    admin_notes: 'Self-deletion confirmed.'
                                }]);

                                // 5. Delete from service_providers table
                                const { error } = await insforge.database.from('service_providers').delete().eq('id', user.id);
                                if (error) {
                                    Alert.alert("Error", "Failed to delete account: " + error.message);
                                    return;
                                }
                            }
                            await signOut();
                            Alert.alert("Success", "Your worker account has been permanently deleted.");
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

    const SettingItem = ({ icon, label, value, onPress, iconColor }: { icon: string, label: string, value?: string, onPress: () => void, iconColor?: string }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl mb-2 border border-slate-50 dark:border-slate-800"
        >
            <View className="flex-row items-center flex-1 pr-4">
                <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-950 items-center justify-center">
                    <Feather name={icon} size={20} color={iconColor || colors.tint} />
                </View>
                <View className="ml-4 flex-1">
                    <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{label}</Text>
                    {value && (
                        <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5" numberOfLines={1}>
                            {value}
                        </Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaProvider>
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
                {/* Header */}
                <View className="pt-4 pb-4 px-6 border-b border-slate-50 dark:border-slate-800">
                    <Text className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Settings</Text>
                </View>

                <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                    
                    {/* AVAILABILITY SECTION */}
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Availability</Text>
                    <View className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm mb-6 flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {isOnline ? 'You are online' : 'You are offline'}
                            </Text>
                            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                {isOnline ? 'Customers can find your profile' : 'Switch on to receive new leads'}
                            </Text>
                        </View>
                        <Switch
                            value={isOnline}
                            onValueChange={toggleOnlineStatus}
                            trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                            thumbColor="#fff"
                        />
                    </View>

                    {/* Profile Section */}
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Profile</Text>
                    <SettingItem 
                        icon="user" 
                        label="Personal Details" 
                        value={user?.name || "Provider"}
                        onPress={() => router.push('/(protected)/worker/edit-profile')} 
                    />
                    <SettingItem 
                        icon="map-pin" 
                        label="Service Area" 
                        value={user.location}
                        onPress={() => router.push('/(location)/locationinfo?from=dashboard')} 
                    />
                    <SettingItem 
                        icon="shield" 
                        label="Identity Verification" 
                        value="Pending"
                        iconColor="#D97706"
                        onPress={() => router.push('/(protected)/worker/verify-identity?from=dashboard')} 
                    />
                    {/* SERVICE CONFIGURATION SECTION */}
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Service Configuration</Text>
                    <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm mb-6 overflow-hidden">
                        
                        {/* Edit Profession & Services */}
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/worker/edit-profile')}
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                        >
                            <View className="flex-row items-center flex-1 pr-4">
                                <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                    <Feather name="tool" size={20} color={colors.tint} />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Edit profession & services</Text>
                                    <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5" numberOfLines={1}>
                                        Currently: {professionName}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>

                        {/* Edit Service Radius */}
                        <TouchableOpacity
                            onPress={() => setRadiusModalVisible(true)}
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                        >
                            <View className="flex-row items-center flex-1 pr-4">
                                <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                    <Feather name="map-pin" size={20} color={colors.tint} />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Edit service radius</Text>
                                    <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                        Currently: {user?.searchRadiusKm || 5} km
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>

                        {/* Edit Profile Details */}
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/worker/edit-profile')}
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
                                        Name, photo, experience
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    </View>

                    {/* ACCOUNT SECTION */}
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Account</Text>
                    <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm mb-12 overflow-hidden">
                        
                        {/* Verification Documents (KYC) */}
                        <TouchableOpacity
                            onPress={() => router.push('/(onboarding)/worker/verify-identity?from=dashboard')}
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/80"
                        >
                            <View className="flex-row items-center flex-1 pr-4">
                                <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 items-center justify-center">
                                    <Feather name="file-text" size={20} color={colors.tint} />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Verification documents</Text>
                                    <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                        Manage KYC uploads
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>

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
                            onPress={handleLogout}
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
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Service Radius</Text>
                                <TouchableOpacity 
                                    onPress={() => setRadiusModalVisible(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                                >
                                    <Ionicons name="close" size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6">
                                Choose the maximum distance (in kilometers) you are willing to travel to receive customer leads.
                            </Text>

                            <View className="flex-row flex-wrap justify-between">
                                {[2, 5, 10, 15, 20, 30, 50].map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        onPress={() => handleRadiusChange(opt)}
                                        className={`w-[30%] py-4.5 rounded-2xl items-center justify-center mb-4 border ${
                                            (user?.searchRadiusKm || 5) === opt 
                                                ? 'bg-black dark:bg-blue-600 border-black dark:border-blue-600' 
                                                : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                                        }`}
                                    >
                                        <Text className={`font-black text-sm ${
                                            (user?.searchRadiusKm || 5) === opt ? 'text-white' : 'text-slate-600 dark:text-slate-400'
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
                                    We collect basic registration information such as your name, mobile phone number, location details, and distance search radius to successfully match you with nearby customer leads.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">2. Profile Visibility</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    Your professional details, specialties, ratings, and active location are visible to customers who request services within your radius when you toggle your availability to &quot;online&quot;.
                                </Text>
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">3. Verification & Compliance</Text>
                                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                                    To ensure safety and reliability on our platform, workers are required to complete identity verification uploads (KYC). Documents are stored securely and never shared with third parties.
                                </Text>
                            </View>
                            <View className="h-20" />
                        </ScrollView>
                    </View>
                </Modal>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
