// @ts-nocheck
import React, { useEffect, useState } from 'react';
import * as Application from "expo-application"
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View, Linking, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    interpolate,
    Easing
} from 'react-native-reanimated';

import { insforge } from '@/lib/insforge';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import ScalePressable from '@/components/scale-pressable';
import StickySwitch from '@/components/sticky-switch';
import CustomPolicyModel from '@/components/models/policy-modal';
import { useTranslation } from 'react-i18next';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { user, signOut, updateDatabaseProfile, refreshProfile } = useAppStore();

    const { colorScheme, setColorScheme } = useColorScheme();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [shareLocation, setShareLocation] = useState(true);

    const [radiusKm, setRadiusKm] = useState(user?.searchRadiusKm || 5);
    const [tempRadius, setTempRadius] = useState(user?.searchRadiusKm || 5);
    const [updatingRadius, setUpdatingRadius] = useState(false);
    const [radiusModalVisible, setRadiusModalVisible] = useState(false);
    const [supportModalVisible, setSupportModalVisible] = useState(false);

    const { t, i18n } = useTranslation();
    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const changeLanguage = useAppStore(state => state.changeLanguage);
    const currentLanguage = useAppStore(state => state.currentLanguage);

    const handleLanguageChange = async (lang: 'en' | 'hi') => {
        try {
            await changeLanguage(lang);
            setLanguageModalVisible(false);
        } catch (err) {
            console.error("Error setting language:", err);
        }
    };

    // Modal states for policies
    const [policyVisible, setPolicyVisible] = useState(false);
    const [policyType, setPolicyType] = useState<'privacy' | 'terms'>('privacy');

    const radiusVal = useSharedValue(user?.searchRadiusKm || 5);
    const radarPulse = useSharedValue(0);

    // Sync state if user context updates
    useEffect(() => {
        if (user?.searchRadiusKm) {
            setRadiusKm(user.searchRadiusKm);
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
            case 2: return t('radiusDesc_2');
            case 5: return t('radiusDesc_5');
            case 10: return t('radiusDesc_10');
            case 15: return t('radiusDesc_15');
            case 20: return t('radiusDesc_20');
            case 30: return t('radiusDesc_30');
            case 50: return t('radiusDesc_50');
            default: return t('radiusDesc_default', { radius });
        }
    };

    const handleRadiusChange = async (opt: number) => {
        setRadiusKm(opt);
        setUpdatingRadius(true);
        try {
            await updateDatabaseProfile({ searchRadiusKm: opt });
            await refreshProfile();
            setRadiusModalVisible(false);
        } catch (error) {
            console.error("Error updating radius:", error);
            Alert.alert(t('updateFailed'), t('couldNotSyncRadius'));
        } finally {
            setUpdatingRadius(false);
        }
    };

    const handleCallSupport = () => {
        Linking.openURL('tel:+919876543210').catch(() => {
            Alert.alert(t('error'), t('unableOpenDialer'));
        });
    };

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@hindustaninnovations.com?subject=Consumer Support Request').catch(() => {
            Alert.alert(t('error'), t('unableOpenEmail'));
        });
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('deleteAccountTitle'),
            t('deleteAccountMsg'),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('deleteMyAccount'),
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
                                    Alert.alert(t('error'), t('error') + ": " + error.message);
                                    return;
                                }
                            }
                            await signOut();
                            Alert.alert(t('accountDeletedTitle'), t('accountDeletedMsg'));
                            router.replace('/');
                        } catch (err) {
                            console.error(err);
                            Alert.alert(t('error'), t('error') + ": Failed to complete account deletion.");
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
                <Text className="text-lg font-black text-slate-900 dark:text-white">{t('settings')}</Text>
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
                        <Text className="text-xs text-slate-400 dark:text-slate-550 font-semibold mt-0.5" numberOfLines={1}>
                            {user?.phone || user?.email || 'No contact details'}
                        </Text>
                        <View className="self-start mt-2 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/35 rounded-full border border-blue-200 dark:border-blue-900/30">
                            <Text className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                                {t('consumerAccount')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── SECTION 1: SERVICE CONFIGURATION ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-3 ml-2">
                    {t('serviceConfig')}
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('searchLocation')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5" numberOfLines={1}>
                                    {user?.location || t('notConfigured')}
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('searchRadius')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    {t('radiusDistance', { count: radiusKm })}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />
                </View>

                {/* ── SECTION 2: APP PREFERENCES ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-3 ml-2">
                    {t('preferences')}
                </Text>
                <View className="mb-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-[28px] overflow-hidden">
                    {/* Dark Mode Row */}
                    <View className="flex-row items-center justify-between p-4 bg-transparent">
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/20 items-center justify-center">
                                <Feather name="moon" size={18} color="#8B5CF6" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('darkMode')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    {t('toggleTheme')}
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('pushNotifications')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    {t('alertsUpdates')}
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('shareCoordinates')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    {t('letWorkersView')}
                                </Text>
                            </View>
                        </View>
                        <StickySwitch
                            value={shareLocation}
                            onValueChange={setShareLocation}
                            activeColor="#06B6D4"
                        />
                    </View>

                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800/50 mx-4" />

                    {/* Language Row */}
                    <ScalePressable
                        onPress={() => setLanguageModalVisible(true)}
                        hapticType="light"
                        className="flex-row items-center justify-between p-4 bg-transparent"
                    >
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/20 items-center justify-center">
                                <Feather name="globe" size={18} color="#3B82F6" />
                            </View>
                            <View className="ml-4 flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('language')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                    {currentLanguage === 'en' ? 'English' : 'हिंदी'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>
                </View>

                {/* ── SECTION 3: LEGAL & SUPPORT ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-3 ml-2">
                    {t('legalSupport')}
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('privacyPolicy')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-medium">{t('howWeHandleTelemetry')}</Text>
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('termsOfService')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-medium">{t('platformUserAgreement')}</Text>
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('helpSupport')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-medium">{t('reachDedicatedSupport')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </ScalePressable>
                </View>

                {/* ── SECTION 4: ACTIONS ── */}
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-3 ml-2">
                    {t('accountSection')}
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
                                <Text className="text-base font-bold text-red-500">{t('deleteAccount')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 font-semibold mt-0.5">
                                    {t('permanentlyWipe')}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
                    </ScalePressable>
                </View>

                {/* Footer Brand */}
                <Text className="text-center text-slate-350 dark:text-slate-700 text-[10px] font-black mb-16 tracking-widest uppercase">
                    HINDUSTAAN INNOVATIONS Pvt Ltd • {Application.nativeApplicationVersion}
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
                        <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-5" />
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-slate-950 dark:text-slate-100">{t('searchRadius')}</Text>
                            <ScalePressable
                                onPress={() => setRadiusModalVisible(false)}
                                hapticType="light"
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </ScalePressable>
                        </View>
                        <Text className="text-slate-400 dark:text-slate-550 text-xs font-semibold mb-6">
                            {t('selectRadiusDesc')}
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
                                            ? 'bg-blue-600 border-blue-600 dark:bg-blue-600 dark:border-blue-600'
                                            : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                                            }`}
                                    >
                                        <Text className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-350'}`}>
                                            {opt}
                                        </Text>
                                        <Text className={`font-bold text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-550'}`}>
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
                            className="w-full py-5 bg-blue-600 rounded-2xl items-center justify-center shadow-lg"
                        >
                            {updatingRadius ? (
                                <View className="flex-row items-center justify-center gap-2">
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text className="text-white font-bold text-sm">{t('savingChanges')}</Text>
                                </View>
                            ) : (
                                <Text className="text-white font-bold text-base">
                                    {t('applySaveRadius')}
                                </Text>
                            )}
                        </ScalePressable>
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
                    <Pressable style={{ flex: 1 }} onPress={() => setSupportModalVisible(false)} />
                    <View className="bg-white dark:bg-slate-900 rounded-t-[28px] p-6 pb-8 border-t border-slate-100 dark:border-slate-800 shadow-xl">
                        <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-6" />

                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-xl font-bold text-slate-950 dark:text-slate-100">{t('helpSupport')}</Text>
                            <ScalePressable
                                onPress={() => setSupportModalVisible(false)}
                                hapticType="light"
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </ScalePressable>
                        </View>
                        <Text className="text-slate-400 dark:text-slate-550 text-xs font-semibold mb-6">
                            {t('helpSupportDesc')}
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('callHelpline')}</Text>
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
                                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{t('emailSupport')}</Text>
                                <Text className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">support@hindustaninnovations.com</Text>
                            </View>
                            <Feather name="external-link" size={16} color="#CBD5E1" />
                        </ScalePressable>

                        <Text className="text-center text-slate-400 dark:text-slate-550 text-[10px] font-bold">
                            {t('timings')}
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* Language Selection Modal */}
            <Modal
                visible={languageModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/40">
                    <Pressable style={{ flex: 1 }} onPress={() => setLanguageModalVisible(false)} />
                    <View className="bg-white dark:bg-slate-900 rounded-t-[28px] p-6 pb-8 border-t border-slate-100 dark:border-slate-800 shadow-xl">
                        <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-6" />
                        
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-xl font-bold text-slate-950 dark:text-slate-100">{t('selectLanguage')}</Text>
                            <ScalePressable
                                onPress={() => setLanguageModalVisible(false)}
                                hapticType="light"
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </ScalePressable>
                        </View>
                        <Text className="text-slate-400 dark:text-slate-550 text-xs font-semibold mb-6">
                            {t('changeAppLanguage')}
                        </Text>

                        {/* Language options */}
                        <ScalePressable
                            onPress={() => handleLanguageChange('en')}
                            hapticType="medium"
                            className={`flex-row items-center border p-4 rounded-xl mb-4 ${
                                currentLanguage === 'en'
                                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            <View className="ml-2 flex-1">
                                <Text className={`text-base font-bold ${currentLanguage === 'en' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>English</Text>
                            </View>
                            {currentLanguage === 'en' && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                        </ScalePressable>

                        <ScalePressable
                            onPress={() => handleLanguageChange('hi')}
                            hapticType="medium"
                            className={`flex-row items-center border p-4 rounded-xl mb-6 ${
                                currentLanguage === 'hi'
                                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            <View className="ml-2 flex-1">
                                <Text className={`text-base font-bold ${currentLanguage === 'hi' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>हिंदी (Hindi)</Text>
                            </View>
                            {currentLanguage === 'hi' && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                        </ScalePressable>
                    </View>
                </View>
            </Modal>

            {/* Privacy and Terms Modal View */}
            <CustomPolicyModel
                visible={policyVisible}
                onClose={() => setPolicyVisible(false)}
                role="consumer"
                type={policyType}
            />
        </View>
    );
}
