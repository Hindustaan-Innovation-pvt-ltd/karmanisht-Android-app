// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolateColor
} from 'react-native-reanimated';
const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

export default function AdminDashboard() {
    const { t } = useTranslation();
    const router = useRouter();
    const { signOut } = useAppStore();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    // Breathing Background Micro-animation Progress
    const colorProgress = useSharedValue(0);
    useEffect(() => {
        colorProgress.value = withRepeat(
            withTiming(1, { duration: 6000 }),
            -1,
            true
        );
    }, []);

    const animatedBgStyle = useAnimatedStyle(() => {
        const bgColor = interpolateColor(
            colorProgress.value,
            [0, 1],
            isDark ? ['#030712', '#0f172a'] : ['#f8fafc', '#f1f5f9']
        );
        return {
            backgroundColor: bgColor
        };
    });

    // Drifting Glowing Orbs Micro-animations
    const orb1X = useSharedValue(0);
    const orb1Y = useSharedValue(0);
    const orb2X = useSharedValue(0);
    const orb2Y = useSharedValue(0);

    useEffect(() => {
        orb1X.value = withRepeat(
            withTiming(45, { duration: 11000 }),
            -1,
            true
        );
        orb1Y.value = withRepeat(
            withTiming(35, { duration: 13000 }),
            -1,
            true
        );
        orb2X.value = withRepeat(
            withTiming(-45, { duration: 15000 }),
            -1,
            true
        );
        orb2Y.value = withRepeat(
            withTiming(-35, { duration: 12000 }),
            -1,
            true
        );
    }, []);

    const orb1Style = useAnimatedStyle(() => ({
        transform: [
            { translateX: orb1X.value },
            { translateY: orb1Y.value }
        ]
    }));

    const orb2Style = useAnimatedStyle(() => ({
        transform: [
            { translateX: orb2X.value },
            { translateY: orb2Y.value }
        ]
    }));

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Dashboard data metrics
    const [stats, setStats] = useState({
        consumersCount: 0,
        activeConsumers: 0,
        workersCount: 0,
        activeWorkers: 0,
        verifiedWorkers: 0,
        kycWorkers: 0,
        deletionRequestsPending: 0,
        categoriesCount: 0,
        tagsCount: 0,
        auditLogsCount: 0
    });

    const fetchDashboardMetrics = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            // Fetch users (consumers)
            const { data: usersData, error: usersErr } = await insforge.database
                .from('users')
                .select('is_active');
            if (usersErr) throw usersErr;

            // Fetch workers
            const { data: workersData, error: workersErr } = await insforge.database
                .from('service_providers')
                .select('is_active, is_verified, is_kyc_verified');
            if (workersErr) throw workersErr;

            // Fetch deletion requests
            const { data: requestsData, error: requestsErr } = await insforge.database
                .from('account_deletion_requests')
                .select('status');
            if (requestsErr) throw requestsErr;

            // Fetch categories
            const { data: categoriesData, error: categoriesErr } = await insforge.database
                .from('service_categories')
                .select('id');
            if (categoriesErr) throw categoriesErr;

            // Fetch tags
            const { data: tagsData, error: tagsErr } = await insforge.database
                .from('service_tags')
                .select('id');
            if (tagsErr) throw tagsErr;

            // Fetch audit logs count
            const { count: auditCount, error: auditErr } = await insforge.database
                .from('account_audit_log')
                .select('*', { count: 'exact', head: true });
            if (auditErr) throw auditErr;

            const consumersCount = usersData?.length || 0;
            const activeConsumers = usersData?.filter(u => u.is_active !== false).length || 0;

            const workersCount = workersData?.length || 0;
            const activeWorkers = workersData?.filter(w => w.is_active !== false).length || 0;
            const verifiedWorkers = workersData?.filter(w => w.is_verified === true).length || 0;
            const kycWorkers = workersData?.filter(w => w.is_kyc_verified === true).length || 0;

            const deletionRequestsPending = requestsData?.filter(r => (r.status || 'pending') === 'pending').length || 0;

            setStats({
                consumersCount,
                activeConsumers,
                workersCount,
                activeWorkers,
                verifiedWorkers,
                kycWorkers,
                deletionRequestsPending,
                categoriesCount: categoriesData?.length || 0,
                tagsCount: tagsData?.length || 0,
                auditLogsCount: auditCount || 0
            });

        } catch (err) {
            console.error(err);
            Alert.alert("Database Error", "Failed to retrieve administrative overview metrics.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardMetrics();
    }, []);

    const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';
    // Ratios computation
    const activeConsumersPercent = stats.consumersCount > 0 ? Math.round((stats.activeConsumers / stats.consumersCount) * 100) : 0;
    const activeWorkersPercent = stats.workersCount > 0 ? Math.round((stats.activeWorkers / stats.workersCount) * 100) : 0;
    const verifiedWorkersPercent = stats.workersCount > 0 ? Math.round((stats.verifiedWorkers / stats.workersCount) * 100) : 0;
    const kycWorkersPercent = stats.workersCount > 0 ? Math.round((stats.kycWorkers / stats.workersCount) * 100) : 0;

    return (
        <Animated.View className="flex-1" style={[{ paddingTop: insets.top }, animatedBgStyle]}>
            {/* Elegant Floating Glowing Orbs in Background */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0 }} pointerEvents="none">
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            top: -100,
                            right: -100,
                            width: 320,
                            height: 320,
                            borderRadius: 160,
                            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.08)',
                        },
                        orb1Style
                    ]}
                />
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            bottom: -100,
                            left: -100,
                            width: 340,
                            height: 340,
                            borderRadius: 170,
                            backgroundColor: isDark ? 'rgba(14, 165, 233, 0.03)' : 'rgba(14, 165, 233, 0.06)',
                        },
                        orb2Style
                    ]}
                />
            </View>

            {/* Header */}
            <View className={`pt-4 pb-5 px-6 flex-row items-center justify-between border-b ${isDark ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View>
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>{t('adminConsole', 'Console')}</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t('adminGlobalDashboard', 'Global Admin Dashboard')}</Text>
                    </View>
                </View>
                <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                        onPress={() => fetchDashboardMetrics(true)}
                        className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                        <Feather name="refresh-cw" size={18} color="#6366F1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={async () => {
                            Alert.alert(
                                t('signOut', 'Sign Out'),
                                t('signOutConfirm', 'Are you sure you want to sign out?'),
                                [
                                    { text: t('cancel', 'Cancel'), style: "cancel" },
                                    {
                                        text: t('signOut', 'Sign Out'),
                                        style: "destructive",
                                        onPress: async () => {
                                            await signOut();
                                            router.replace('/');
                                        }
                                    }
                                ]
                            );
                        }}
                        className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-red-50'}`}
                    >
                        <Feather name="log-out" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">{t('adminCalculatingMetrics', 'Calculating Metrics...')}</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-5 pt-5"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardMetrics(true)} colors={['#6366F1']} />
                    }
                >
                    {/* Welcome Banner */}
                    <LinearGradient
                        colors={['#4F46E5', '#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-[28px] p-6 mb-6 overflow-hidden relative"
                    >
                        <View className="absolute right-0 bottom-0 opacity-15">
                            <Feather name="trending-up" size={150} color="white" />
                        </View>
                        <Text className="text-white text-xs font-black uppercase tracking-widest opacity-80">{t('adminWelcomeBack', 'Welcome back')}</Text>
                        <Text className="text-white text-2xl font-black mt-1">{t('adminPlatformTelemetry', 'Platform Telemetry')}</Text>
                        <Text className="text-indigo-50 text-xs font-medium mt-1.5 leading-relaxed">
                            {t('adminDashboardDesc', 'Monitor user compliance, configure skill classes, and audit removal processes globally.')}
                        </Text>
                    </LinearGradient>

                    {/* Analytics Overview Cards Grid */}
                    <View className="flex-row flex-wrap justify-between gap-3 mb-6">
                        {/* Users Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border-l-[5px] border-l-indigo-500 border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center bg-indigo-500/10">
                                    <Feather name="users" size={16} color="#6366F1" />
                                </View>
                                <Text className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{t('total', 'Total')}</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('adminConsumers', 'Consumers')}</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.consumersCount}</Text>
                            <View className="mt-3 flex-row items-center justify-between">
                                <Text className="text-[9px] font-bold text-slate-400">{t('active', 'Active')}: {stats.activeConsumers}</Text>
                                <Text className="text-[9px] font-black text-indigo-500">{activeConsumersPercent}%</Text>
                            </View>
                            <View className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                <View className="bg-indigo-500 h-full rounded-full" style={{ width: `${activeConsumersPercent}%` }} />
                            </View>
                        </View>

                        {/* Workers Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border-l-[5px] border-l-sky-500 border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center bg-sky-500/10">
                                    <Feather name="tool" size={16} color="#0EA5E9" />
                                </View>
                                <Text className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{t('total', 'Total')}</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('adminWorkers', 'Workers')}</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.workersCount}</Text>
                            <View className="mt-3 flex-row items-center justify-between">
                                <Text className="text-[9px] font-bold text-slate-400">{t('active', 'Active')}: {stats.activeWorkers}</Text>
                                <Text className="text-[9px] font-black text-sky-500">{activeWorkersPercent}%</Text>
                            </View>
                            <View className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                <View className="bg-sky-500 h-full rounded-full" style={{ width: `${activeWorkersPercent}%` }} />
                            </View>
                        </View>

                        {/* Requests Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border-l-[5px] border-l-rose-500 border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center bg-rose-500/10">
                                    <Feather name="trash-2" size={16} color="#F43F5E" />
                                </View>
                                <Text className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{t('adminPending', 'Pending')}</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('adminDeletions', 'Deletions')}</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.deletionRequestsPending}</Text>
                            <View className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                <Text className="text-[9px] font-bold text-slate-400 uppercase">{t('adminAwaitingAction', 'Awaiting Action')}</Text>
                            </View>
                        </View>

                        {/* Taxonomy Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border-l-[5px] border-l-purple-500 border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center bg-purple-500/10">
                                    <Feather name="grid" size={16} color="#A855F7" />
                                </View>
                                <Text className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{t('adminTaxonomy', 'Taxonomy')}</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('adminCategoriesTags', 'Categories / Tags')}</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.categoriesCount} / {stats.tagsCount}</Text>
                            <View className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                <Text className="text-[9px] font-bold text-slate-400 uppercase">{t('adminSkillDefinitions', 'Skill definitions')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Operational Compliance Ratios */}
                    <View className={`p-5 rounded-[24px] mb-5 border ${cardBgClass}`} style={shadowSm}>
                        <Text className={`text-sm font-black mb-4 uppercase tracking-wider ${textMainClass}`}>{t('adminVerificationCompliance', 'Worker Verification Compliance')}</Text>

                        <View className="gap-3.5">
                            {/* Platform Verification Badge Ratio */}
                            <View>
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-[11px] font-semibold text-slate-400">{t('adminVerifiedBadgeRatio', 'Verified Badge Ratio')}</Text>
                                    <Text className="text-xs font-bold text-indigo-500">{stats.verifiedWorkers} / {stats.workersCount} ({verifiedWorkersPercent}%)</Text>
                                </View>
                                <View className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <View className="bg-indigo-600 h-full rounded-full" style={{ width: `${verifiedWorkersPercent}%` }} />
                                </View>
                            </View>

                            {/* KYC Approval Ratio */}
                            <View>
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-[11px] font-semibold text-slate-400">{t('adminKycCompliantRatio', 'KYC Compliant Ratio')}</Text>
                                    <Text className="text-xs font-bold text-sky-500">{stats.kycWorkers} / {stats.workersCount} ({kycWorkersPercent}%)</Text>
                                </View>
                                <View className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <View className="bg-sky-500 h-full rounded-full" style={{ width: `${kycWorkersPercent}%` }} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Quick Navigation Panel */}
                    <Text className={`text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1`}>{t('adminConsoleQuickLinks', 'Console Quick Links')}</Text>
                    <View className="gap-2.5 mb-10">
                        {/* Users Accounts Navigation */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/accounts')}
                            className={`p-5 rounded-[24px] flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-4">
                                <View className="w-12 h-12 rounded-[18px] items-center justify-center mr-4 bg-indigo-500/10">
                                    <Feather name="users" size={22} color="#6366F1" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-base font-black tracking-tight mb-0.5 ${textMainClass}`}>{t('adminUserAccountsTitle', 'User Accounts Console')}</Text>
                                    <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500" numberOfLines={2}>{t('adminUserAccountsDesc', 'Manage, verify, suspension, and search consumers/workers')}</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={20} color="#6366F1" />
                        </TouchableOpacity>

                        {/* Skill Taxonomy Grid */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/categories')}
                            className={`p-5 rounded-[24px] flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-4">
                                <View className="w-12 h-12 rounded-[18px] items-center justify-center mr-4 bg-purple-500/10">
                                    <Feather name="grid" size={22} color="#A855F7" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-base font-black tracking-tight mb-0.5 ${textMainClass}`}>{t('adminCategoriesTagsTitle', 'Service Categories & Tags')}</Text>
                                    <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500" numberOfLines={2}>{t('adminCategoriesTagsDesc', 'Configure visual category items and sub specialty taxonomies')}</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={20} color="#6366F1" />
                        </TouchableOpacity>

                        {/* Payments Console */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/payments')}
                            className={`p-5 rounded-[24px] flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-4">
                                <View className="w-12 h-12 rounded-[18px] items-center justify-center mr-4 bg-sky-500/10">
                                    <Feather name="credit-card" size={22} color="#0EA5E9" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-base font-black tracking-tight mb-0.5 ${textMainClass}`}>{t('adminPaymentsConsoleTitle', 'Payments Console')}</Text>
                                    <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500" numberOfLines={2}>{t('adminPaymentsConsoleDesc', 'Configure tier defaults, gateways, regional overrides, and ledger')}</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={20} color="#6366F1" />
                        </TouchableOpacity>

                        {/* Deletion Requests */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/requests')}
                            className={`p-5 rounded-[24px] flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-4">
                                <View className="w-12 h-12 rounded-[18px] items-center justify-center mr-4 bg-rose-500/10">
                                    <Feather name="alert-triangle" size={22} color="#F43F5E" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-base font-black tracking-tight mb-0.5 ${textMainClass}`}>{t('adminDeletionRequestsTitle', 'Deletion Requests')}</Text>
                                    <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500" numberOfLines={2}>{t('adminDeletionRequestsDesc', 'Review user complaints and process cascading account purges')}</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={20} color="#6366F1" />
                        </TouchableOpacity>

                        {/* Auditing */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/audit')}
                            className={`p-5 rounded-[24px] flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center flex-1 mr-4">
                                <View className="w-12 h-12 rounded-[18px] items-center justify-center mr-4 bg-green-500/10">
                                    <Feather name="shield" size={22} color="#22C55E" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-base font-black tracking-tight mb-0.5 ${textMainClass}`}>{t('adminAuditTrailsTitle', 'Administrative Audit Trails')}</Text>
                                    <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500" numberOfLines={2}>{t('adminAuditTrailsDesc', 'Review audit logs and compliance records')}</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={20} color="#6366F1" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </Animated.View>
    );
}
