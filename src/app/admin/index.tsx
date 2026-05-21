// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/lib/store';

const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

const shadowMd = Platform.OS === 'web'
    ? { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }
    : { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 };

export default function AdminDashboard() {
    const router = useRouter();
    const { signOut } = useAppStore();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

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
    const textSubClass = isDark ? 'text-slate-400' : 'text-slate-500';

    // Ratios computation
    const totalUsers = stats.consumersCount + stats.workersCount;
    const activeConsumersPercent = stats.consumersCount > 0 ? Math.round((stats.activeConsumers / stats.consumersCount) * 100) : 0;
    const activeWorkersPercent = stats.workersCount > 0 ? Math.round((stats.activeWorkers / stats.workersCount) * 100) : 0;
    const verifiedWorkersPercent = stats.workersCount > 0 ? Math.round((stats.verifiedWorkers / stats.workersCount) * 100) : 0;
    const kycWorkersPercent = stats.workersCount > 0 ? Math.round((stats.kycWorkers / stats.workersCount) * 100) : 0;

    return (
        <View className={`flex-1 ${bgClass}`} style={{ paddingTop: insets.top }}>
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
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Console</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Admin Dashboard</Text>
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
                                "Sign Out",
                                "Are you sure you want to sign out?",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Sign Out",
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
                    <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">Calculating Metrics...</Text>
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
                    <View className="bg-indigo-600 rounded-[28px] p-6 mb-5 overflow-hidden relative">
                        <View className="absolute right-0 bottom-0 opacity-10">
                            <Feather name="trending-up" size={150} color="white" />
                        </View>
                        <Text className="text-white text-xs font-black uppercase tracking-widest opacity-80">Welcome back</Text>
                        <Text className="text-white text-2xl font-black mt-1">Platform Telemetry</Text>
                        <Text className="text-indigo-100 text-xs font-medium mt-1.5 leading-relaxed">
                            Monitor user compliance, configure skill classes, and audit removal processes globally.
                        </Text>
                    </View>

                    {/* Analytics Overview Cards Grid */}
                    <View className="flex-row flex-wrap justify-between gap-3 mb-5">
                        {/* Users Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                                    <Feather name="users" size={16} color="#6366F1" />
                                </View>
                                <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Total</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consumers</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.consumersCount}</Text>
                            <View className="mt-3 flex-row items-center justify-between">
                                <Text className="text-[9px] font-bold text-slate-400">Active: {stats.activeConsumers}</Text>
                                <Text className="text-[9px] font-black text-green-500">{activeConsumersPercent}%</Text>
                            </View>
                            <View className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                <View className="bg-green-500 h-full rounded-full" style={{ width: `${activeConsumersPercent}%` }} />
                            </View>
                        </View>

                        {/* Workers Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                                    <Feather name="tool" size={16} color="#0EA5E9" />
                                </View>
                                <Text className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Total</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workers</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.workersCount}</Text>
                            <View className="mt-3 flex-row items-center justify-between">
                                <Text className="text-[9px] font-bold text-slate-400">Active: {stats.activeWorkers}</Text>
                                <Text className="text-[9px] font-black text-sky-500">{activeWorkersPercent}%</Text>
                            </View>
                            <View className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                <View className="bg-sky-500 h-full rounded-full" style={{ width: `${activeWorkersPercent}%` }} />
                            </View>
                        </View>

                        {/* Requests Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)' }}>
                                    <Feather name="trash-2" size={16} color="#F43F5E" />
                                </View>
                                <Text className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Pending</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deletions</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.deletionRequestsPending}</Text>
                            <View className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                <Text className="text-[9px] font-bold text-slate-400 uppercase">Awaiting Action</Text>
                            </View>
                        </View>

                        {/* Taxonomy Card */}
                        <View className={`w-[48%] p-4 rounded-3xl border ${cardBgClass}`} style={shadowSm}>
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                                    <Feather name="grid" size={16} color="#A855F7" />
                                </View>
                                <Text className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Taxonomy</Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories / Tags</Text>
                            <Text className={`text-2xl font-black mt-0.5 ${textMainClass}`}>{stats.categoriesCount} / {stats.tagsCount}</Text>
                            <View className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                <Text className="text-[9px] font-bold text-slate-400 uppercase">Skill definitions</Text>
                            </View>
                        </View>
                    </View>

                    {/* Operational Compliance Ratios */}
                    <View className={`p-5 rounded-[24px] mb-5 border ${cardBgClass}`} style={shadowSm}>
                        <Text className={`text-sm font-black mb-4 uppercase tracking-wider ${textMainClass}`}>Worker Verification Compliance</Text>

                        <View className="gap-3.5">
                            {/* Platform Verification Badge Ratio */}
                            <View>
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-[11px] font-semibold text-slate-400">Verified Badge Ratio</Text>
                                    <Text className="text-xs font-bold text-indigo-500">{stats.verifiedWorkers} / {stats.workersCount} ({verifiedWorkersPercent}%)</Text>
                                </View>
                                <View className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <View className="bg-indigo-600 h-full rounded-full" style={{ width: `${verifiedWorkersPercent}%` }} />
                                </View>
                            </View>

                            {/* KYC Approval Ratio */}
                            <View>
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-[11px] font-semibold text-slate-400">KYC Compliant Ratio</Text>
                                    <Text className="text-xs font-bold text-sky-500">{stats.kycWorkers} / {stats.workersCount} ({kycWorkersPercent}%)</Text>
                                </View>
                                <View className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <View className="bg-sky-500 h-full rounded-full" style={{ width: `${kycWorkersPercent}%` }} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Quick Navigation Panel */}
                    <Text className={`text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1`}>Console Quick Links</Text>
                    <View className="gap-2.5 mb-10">
                        {/* Users Accounts Navigation */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/accounts')}
                            className={`p-4 rounded-2xl flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center">
                                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3.5 bg-indigo-500/10">
                                    <Feather name="users" size={18} color="#6366F1" />
                                </View>
                                <View>
                                    <Text className={`text-sm font-bold ${textMainClass}`}>User Accounts Console</Text>
                                    <Text className="text-[10px] font-medium text-slate-400">Manage, verify, suspension, and search consumers/workers</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>

                        {/* Skill Taxonomy Grid */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/categories')}
                            className={`p-4 rounded-2xl flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center">
                                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3.5 bg-purple-500/10">
                                    <Feather name="grid" size={18} color="#A855F7" />
                                </View>
                                <View>
                                    <Text className={`text-sm font-bold ${textMainClass}`}>Service Categories & Tags</Text>
                                    <Text className="text-[10px] font-medium text-slate-400">Configure visual category items and sub specialty taxonomies</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>

                        {/* Auditing */}
                        <TouchableOpacity
                            onPress={() => router.push('/admin/audit')}
                            className={`p-4 rounded-2xl flex-row items-center justify-between border ${cardBgClass} active:scale-98`}
                            style={shadowSm}
                        >
                            <View className="flex-row items-center">
                                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3.5 bg-green-500/10">
                                    <Feather name="shield" size={18} color="#22C55E" />
                                </View>
                                <View>
                                    <Text className={`text-sm font-bold ${textMainClass}`}>Administrative Audit Trails</Text>
                                    <Text className="text-[10px] font-medium text-slate-400">Review log logs and compliance records ({stats.auditLogsCount} events)</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
