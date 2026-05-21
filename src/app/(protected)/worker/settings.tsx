// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, Platform, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    interpolate,
    Easing
} from 'react-native-reanimated';
import ScalePressable from '@/components/scale-pressable';
import { useAppStore } from '@/lib/store';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import CustomPolicyModel from '@/components/models/policy-modal';
import * as Application from "expo-application"

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
    const [tempRadius, setTempRadius] = useState(user?.searchRadiusKm || 5);

    const radiusVal = useSharedValue(user?.searchRadiusKm || 5);
    const radarPulse = useSharedValue(0);

    // Sync state if user context updates
    useEffect(() => {
        if (user?.searchRadiusKm) {
            setTempRadius(user.searchRadiusKm);
        }
    }, [user]);

    // Sync values when modal is opened
    useEffect(() => {
        if (radiusModalVisible) {
            const initialRadius = user?.searchRadiusKm || 5;
            setTempRadius(initialRadius);
            radiusVal.value = initialRadius;

            radarPulse.value = 0;
            radarPulse.value = withRepeat(
                withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }),
                -1,
                false
            );
        } else {
            radarPulse.value = 0;
        }
    }, [radiusModalVisible, user?.searchRadiusKm, radarPulse, radiusVal]);

    const animatedAreaStyle = useAnimatedStyle(() => {
        // Map radius in KM (2 to 50) to circle size in DP (30 to 138)
        const size = interpolate(
            radiusVal.value,
            [2, 5, 10, 15, 20, 30, 50],
            [30, 48, 66, 84, 102, 120, 138]
        );
        return {
            width: size,
            height: size,
            borderRadius: size / 2,
        };
    });

    const animatedRippleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: interpolate(radarPulse.value, [0, 1], [0.2, 1.5]) }],
            opacity: interpolate(radarPulse.value, [0, 0.8, 1], [0.5, 0.25, 0]),
        };
    });

    const getRadiusDescription = (radius: number) => {
        switch (radius) {
            case 2: return "Perfect for quick, ultra-local jobs right down the street.";
            case 5: return "Ideal coverage for your neighborhood and surrounding blocks.";
            case 10: return "Standard range covering your town or immediate district.";
            case 15: return "Broad coverage including adjacent towns and key corridors.";
            case 20: return "City-wide reach, capturing leads across major metropolitan zones.";
            case 30: return "Extended region coverage for high-value outer-ring requests.";
            case 50: return "Maximum reach. Capture any lead in the regional zone.";
            default: return `${radius} KM distance coverage.`;
        }
    };

    // Support Modal States
    const [supportVisible, setSupportVisible] = useState(false);

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
                        onPress={() => router.push('/(protected)/worker/edit-profile?from=settings')}
                    />
                    <SettingItem
                        icon="map-pin"
                        label="Service Area"
                        value={user.location}
                        onPress={() => router.push('/(location)/locationinfo?from=settings')}
                    />
                    <SettingItem
                        icon="shield"
                        label="Identity Verification"
                        value="Pending"
                        iconColor="#D97706"
                        onPress={() => router.push('/(protected)/worker/verify-identity?from=settings')}
                    />
                    {/* SERVICE CONFIGURATION SECTION */}
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Service Configuration</Text>
                    <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm mb-6 overflow-hidden">

                        {/* Edit Profession & Services */}
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/worker/edit-profession?from=settings')}
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
                    </View>

                    {/* ACCOUNT SECTION */}
                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Account</Text>
                    <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm mb-12 overflow-hidden">

                        {/* Verification Documents (KYC) */}
                        <TouchableOpacity
                            onPress={() => router.push('/(protected)/worker/verify-identity?from=settings')}
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
                                setSupportVisible(true);
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
                        HINDUSTAN INNOVATIONS • {Application.nativeApplicationVersion}
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
                        <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10 border-t border-slate-100 dark:border-slate-800 shadow-xl">
                            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-5" />
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Service Radius</Text>
                                <TouchableOpacity
                                    onPress={() => setRadiusModalVisible(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                                >
                                    <Ionicons name="close" size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-slate-400 dark:text-slate-500 text-xs font-semibold mb-5">
                                Choose the maximum distance you are willing to travel to receive customer leads.
                            </Text>

                            {/* Radar Visualization Area */}
                            <View className="bg-slate-50 dark:bg-slate-950/40 rounded-3xl h-36 justify-center items-center overflow-hidden mb-4 border border-slate-100 dark:border-slate-900/60">
                                {/* Concentric radar grid circles */}
                                <View className="absolute w-[180px] h-[180px] rounded-full border border-slate-200/40 dark:border-slate-800/20 border-dashed" />
                                <View className="absolute w-[120px] h-[120px] rounded-full border border-slate-200/40 dark:border-slate-800/20 border-dashed" />
                                <View className="absolute w-[60px] h-[60px] rounded-full border border-slate-200/40 dark:border-slate-800/20 border-dashed" />

                                <View className="absolute w-full h-[1px] bg-slate-200/30 dark:bg-slate-800/10" />
                                <View className="absolute h-full w-[1px] bg-slate-200/30 dark:bg-slate-800/10" />

                                {/* Radar Ripple Scan */}
                                <Animated.View
                                    style={[
                                        {
                                            position: 'absolute',
                                            borderWidth: 1.5,
                                            borderColor: isDark ? '#3B82F6' : '#1E3A8A',
                                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(30, 58, 138, 0.08)',
                                        },
                                        animatedRippleStyle
                                    ]}
                                />

                                {/* Selected Radius Visual Area */}
                                <Animated.View
                                    style={[
                                        {
                                            position: 'absolute',
                                            borderWidth: 2,
                                            borderColor: isDark ? '#3B82F6' : '#2563EB',
                                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(37, 99, 235, 0.05)',
                                            borderStyle: 'dashed',
                                        },
                                        animatedAreaStyle
                                    ]}
                                />

                                {/* Center Location Pin */}
                                <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center border border-blue-500/20 shadow-md">
                                    <View className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 items-center justify-center border-2 border-white dark:border-slate-900">
                                        <Ionicons name="radio" size={8} color="#fff" />
                                    </View>
                                </View>
                            </View>

                            {/* Active KM value & description details */}
                            <View className="items-center mb-5 min-h-[44px] justify-center">
                                <Text className="text-xl font-black text-blue-600 dark:text-blue-400">
                                    {tempRadius} KM
                                </Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold text-center mt-1 px-4">
                                    {getRadiusDescription(tempRadius)}
                                </Text>
                            </View>

                            {/* Options Scroll Bar */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 6 }}
                                className="mb-5"
                            >
                                {[2, 5, 10, 15, 20, 30, 50].map((opt) => {
                                    const isSelected = tempRadius === opt;
                                    return (
                                        <ScalePressable
                                            key={opt}
                                            onPress={() => {
                                                setTempRadius(opt);
                                                radiusVal.value = withSpring(opt, { damping: 15, stiffness: 100 });
                                            }}
                                            hapticType="selection"
                                            className={`mr-3 px-5 py-3.5 rounded-2xl items-center justify-center border-2 flex-row gap-1 ${isSelected
                                                    ? 'bg-black border-black dark:bg-blue-600 dark:border-blue-600'
                                                    : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                                                }`}
                                        >
                                            <Text className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-350'}`}>
                                                {opt}
                                            </Text>
                                            <Text className={`font-bold text-[10px] ${isSelected ? 'text-slate-250 dark:text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                                KM
                                            </Text>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginLeft: 2 }} />
                                            )}
                                        </ScalePressable>
                                    );
                                })}
                            </ScrollView>

                            {/* Action apply button */}
                            <ScalePressable
                                onPress={() => handleRadiusChange(tempRadius)}
                                hapticType="success"
                                disabled={updatingRadius}
                                className="w-full py-4 bg-black dark:bg-blue-600 rounded-2xl items-center justify-center shadow-lg"
                            >
                                {updatingRadius ? (
                                    <View className="flex-row items-center justify-center gap-2">
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text className="text-white font-bold text-sm">Saving changes...</Text>
                                    </View>
                                ) : (
                                    <Text className="text-white font-bold text-base">
                                        Apply & Save Radius
                                    </Text>
                                )}
                            </ScalePressable>
                        </View>
                    </View>
                </Modal>

                {/* Privacy and Terms Modal View */}
                <CustomPolicyModel
                    visible={policyVisible}
                    onClose={() => setPolicyVisible(false)}
                    role="worker"
                    type={policyType}
                />

                {/* Support Modal View */}
                <Modal
                    visible={supportVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSupportVisible(false)}
                >
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                        activeOpacity={1}
                        onPress={() => setSupportVisible(false)}
                    >
                        <View style={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            padding: 24,
                            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                            borderWidth: isDark ? 1 : 0,
                            borderColor: isDark ? '#1e293b' : 'transparent'
                        }}>
                            {/* Drag Handle */}
                            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#334155' : '#cbd5e1', alignSelf: 'center', marginBottom: 20 }} />

                            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 4 }}>
                                Support Team
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 24 }}>
                                Reach out to us via any of these channels for quick assistance.
                            </Text>

                            {/* Email Support */}
                            <TouchableOpacity
                                onPress={() => {
                                    setSupportVisible(false);
                                    Linking.openURL('mailto:support@hindustaninnovations.com').catch(() => {
                                        Alert.alert("Error", "Could not open mail app.");
                                    });
                                }}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                                    padding: 16,
                                    borderRadius: 16,
                                    marginBottom: 12,
                                    borderWidth: 1,
                                    borderColor: isDark ? '#334155' : '#f1f5f9'
                                }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? '#1e1b4b' : '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                    <Ionicons name="mail" size={22} color={isDark ? '#818cf8' : '#4f46e5'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' }}>Email Us</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>support@hindustaninnovations.com</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                            </TouchableOpacity>

                            {/* Phone Support */}
                            <TouchableOpacity
                                onPress={() => {
                                    setSupportVisible(false);
                                    Linking.openURL('tel:+919876543210').catch(() => {
                                        Alert.alert("Error", "Could not place phone call.");
                                    });
                                }}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                                    padding: 16,
                                    borderRadius: 16,
                                    marginBottom: 24,
                                    borderWidth: 1,
                                    borderColor: isDark ? '#334155' : '#f1f5f9'
                                }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? '#064e3b' : '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                    <Ionicons name="call" size={22} color={isDark ? '#34d399' : '#16a34a'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' }}>Phone / WhatsApp</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>+91 98765 43210</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                            </TouchableOpacity>

                            {/* Cancel Button */}
                            <TouchableOpacity
                                onPress={() => setSupportVisible(false)}
                                activeOpacity={0.8}
                                style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9', paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
